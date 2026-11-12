import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ImpactAnalysis from '../components/ImpactAnalysis';
import { pauseHouseholdCalculations } from '../hooks/useHouseholdImpact';
import { api, HouseholdCalculationError } from '../lib/api';
import type { HouseholdImpactResponse, HouseholdRequest } from '../lib/types';

// Recharts' ResponsiveContainer measures its parent, which jsdom cannot do,
// so the chart gets a fixed size instead, and draws its income axis.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  const { cloneElement } = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <div data-testid="responsive-container">
        {cloneElement(
          children as React.ReactElement<{ width: number; height: number }>,
          { width: 800, height: 400 },
        )}
      </div>
    ),
  };
});

const earlierRequest: HouseholdRequest = {
  age_head: 35,
  age_spouse: null,
  dependent_ages: [5],
  income: 50000,
  year: 2026,
  max_earnings: 100000,
  state_code: 'UT',
};

// The household submitted after the earlier one was answered.
const refusedRequest: HouseholdRequest = { ...earlierRequest, income: 75000 };

const earlierAnswer: HouseholdImpactResponse = {
  income_range: [0, 50000, 100000],
  net_income_change: [0, 200, 0],
  federalTaxChange: [0, 0, 0],
  stateTaxChange: [0, -200, 0],
  netIncomeChange: [0, 200, 0],
  benefit_at_income: {
    baseline: 45200,
    reform: 45000,
    difference: 200,
    federal_eitc_change: 0,
    state_eitc_change: 0,
    federal_tax_change: 0,
    state_tax_change: -200,
    net_income_change: 200,
  },
  x_axis_max: 100000,
};

const refusalMessage =
  'Everyone on your network, such as a workshop or an office, shares a ' +
  'limit on calculations a minute, and it has been reached.';

/** ImpactAnalysis inside `queryClient`, as the page renders it. */
function impactAnalysis(
  queryClient: QueryClient,
  props: React.ComponentProps<typeof ImpactAnalysis>,
) {
  return (
    <QueryClientProvider client={queryClient}>
      <ImpactAnalysis {...props} />
    </QueryClientProvider>
  );
}

/** Waits until the page shows the answer for `income`. */
async function waitForAnswerAtIncome(income: string): Promise<void> {
  await waitFor(() =>
    expect(
      screen.getByText(/Based on your employment income of/),
    ).toHaveTextContent(income),
  );
}

/** The label of the last tick on the chart's income axis: where it ends. */
function chartRangeEnd(container: HTMLElement): string | null | undefined {
  const tickLabels = container.querySelectorAll(
    '.recharts-xAxis .recharts-cartesian-axis-tick-value',
  );
  return tickLabels[tickLabels.length - 1]?.textContent;
}

afterEach(() => {
  vi.restoreAllMocks();
  pauseHouseholdCalculations(0);
});

describe('ImpactAnalysis', () => {
  it('shows the answer that was on screen and the notice after a rate-limit refusal', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['householdImpact', earlierRequest], earlierAnswer);
    vi.spyOn(api, 'calculateHouseholdImpact').mockRejectedValue(
      new HouseholdCalculationError(refusalMessage, 429, false, true),
    );
    // The page shows the earlier household, then submits another.
    const { rerender } = render(
      impactAnalysis(queryClient, {
        request: earlierRequest,
        triggered: true,
        maxEarnings: 100000,
      }),
    );
    await waitForAnswerAtIncome('$50,000');

    rerender(
      impactAnalysis(queryClient, {
        request: refusedRequest,
        triggered: true,
        maxEarnings: 100000,
      }),
    );

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent(refusalMessage);
    // The answer shown need not be the one calculated last.
    expect(notice).toHaveTextContent(
      'The results below are for the household shown before.',
    );
    // The labels describe the household whose answer is shown.
    expect(
      screen.getByText(/Based on your employment income of/),
    ).toHaveTextContent('$50,000');
    expect(
      screen.queryByText('Household calculator temporarily unavailable'),
    ).not.toBeInTheDocument();
  });

  it('keeps an answer it calculated itself on screen after a rate-limit refusal', async () => {
    // The earlier answer is calculated while the component shows the
    // household, not placed in the cache before.
    const queryClient = new QueryClient();
    const calculate = vi
      .spyOn(api, 'calculateHouseholdImpact')
      .mockResolvedValueOnce(earlierAnswer)
      .mockRejectedValue(
        new HouseholdCalculationError(refusalMessage, 429, false, true),
      );
    const { rerender } = render(
      impactAnalysis(queryClient, {
        request: earlierRequest,
        triggered: true,
        maxEarnings: 100000,
      }),
    );
    await waitForAnswerAtIncome('$50,000');

    rerender(
      impactAnalysis(queryClient, {
        request: refusedRequest,
        triggered: true,
        maxEarnings: 100000,
      }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(refusalMessage);
    expect(calculate).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(/Based on your employment income of/),
    ).toHaveTextContent('$50,000');
    expect(
      screen.queryByText('Household calculator temporarily unavailable'),
    ).not.toBeInTheDocument();
  });

  it("draws the chart over the shown household's range after a rate-limit refusal", async () => {
    // The page passes the refused household's range; the chart keeps the
    // range of the household whose answer it shows.
    const queryClient = new QueryClient();
    queryClient.setQueryData(['householdImpact', earlierRequest], earlierAnswer);
    vi.spyOn(api, 'calculateHouseholdImpact').mockRejectedValue(
      new HouseholdCalculationError(refusalMessage, 429, false, true),
    );
    const { container, rerender } = render(
      impactAnalysis(queryClient, {
        request: earlierRequest,
        triggered: true,
        maxEarnings: 100000,
      }),
    );
    await waitForAnswerAtIncome('$50,000');
    expect(chartRangeEnd(container)).toBe('$100k');

    rerender(
      impactAnalysis(queryClient, {
        request: { ...earlierRequest, max_earnings: 500000 },
        triggered: true,
        maxEarnings: 500000,
      }),
    );

    await screen.findByRole('status');
    expect(chartRangeEnd(container)).toBe('$100k');
  });

  it('records no answer while the results area is not shown', async () => {
    // The household's answer is in the cache, but the results area is
    // not shown, so a refusal has no earlier answer to show.
    const queryClient = new QueryClient();
    queryClient.setQueryData(['householdImpact', earlierRequest], earlierAnswer);
    vi.spyOn(api, 'calculateHouseholdImpact').mockRejectedValue(
      new HouseholdCalculationError(refusalMessage, 429, false, true),
    );
    const { rerender } = render(
      impactAnalysis(queryClient, {
        request: earlierRequest,
        triggered: false,
        maxEarnings: 100000,
      }),
    );

    rerender(
      impactAnalysis(queryClient, {
        request: refusedRequest,
        triggered: true,
        maxEarnings: 100000,
      }),
    );

    expect(
      await screen.findByText('Household calculator temporarily unavailable'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('tells the page which household is shown after a rate-limit refusal', async () => {
    // The page highlights the chart range of the household shown, not the
    // range of the refused one.
    const queryClient = new QueryClient();
    queryClient.setQueryData(['householdImpact', earlierRequest], earlierAnswer);
    vi.spyOn(api, 'calculateHouseholdImpact').mockRejectedValue(
      new HouseholdCalculationError(refusalMessage, 429, false, true),
    );
    const shownRequests: Array<HouseholdRequest | null> = [];
    const recordShownRequest = (request: HouseholdRequest | null) => {
      shownRequests.push(request);
    };
    const { rerender } = render(
      impactAnalysis(queryClient, {
        request: earlierRequest,
        triggered: true,
        maxEarnings: 100000,
        onShownRequestChange: recordShownRequest,
      }),
    );
    await waitForAnswerAtIncome('$50,000');

    rerender(
      impactAnalysis(queryClient, {
        request: { ...earlierRequest, max_earnings: 500000 },
        triggered: true,
        maxEarnings: 500000,
        onShownRequestChange: recordShownRequest,
      }),
    );

    await screen.findByRole('status');
    expect(shownRequests.at(-1)).toEqual(earlierRequest);
  });
});
