import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Home from '../app/(shell)/page';
import { pauseHouseholdCalculations } from '../hooks/useHouseholdImpact';
import {
  api,
  HouseholdCalculationError,
  SHARED_LIMIT_EXPLANATION,
} from '../lib/api';
import type { HouseholdImpactResponse } from '../lib/types';

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

// The other tabs are not under test.
vi.mock('../components/PolicyOverview', () => ({ default: () => null }));
vi.mock('../components/AggregateImpact', () => ({ default: () => null }));
vi.mock('../components/CongressionalDistrictImpact', () => ({
  default: () => null,
}));

const refusalMessage =
  'Everyone on your network, such as a workshop or an office, shares a ' +
  'limit on calculations a minute, and it has been reached.';

/** The page's default household, at $50,000, as the page calculates it. */
const calculatedAnswer: HouseholdImpactResponse = {
  income_range: [0, 50000, 100000],
  net_income_change: [0, 200, 0],
  federalTaxChange: [0, 0, 0],
  stateTaxChange: [0, -200, 0],
  netIncomeChange: [0, 200, 0],
  benefit_at_income: {
    baseline: 45000,
    reform: 45200,
    difference: 200,
    federal_eitc_change: 0,
    state_eitc_change: 0,
    federal_tax_change: 0,
    state_tax_change: -200,
    net_income_change: 200,
  },
  x_axis_max: 100000,
};

/**
 * Refuses a calculation for the firewall's limit and starts the pause, as
 * the API module does for a refusal.
 */
async function refuseAndPause(): Promise<HouseholdImpactResponse> {
  pauseHouseholdCalculations();
  throw new HouseholdCalculationError(refusalMessage, 429, false, true);
}

function renderPage(): HTMLElement {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Home />
    </QueryClientProvider>,
  ).container;
}

/** The text of the chart x-axis range button the page highlights. */
function highlightedChartRange(): string | undefined {
  return screen
    .queryAllByRole('button', { name: /^\$\d+(k|M)$/ })
    .find((button) => button.classList.contains('bg-primary-500'))
    ?.textContent ?? undefined;
}

/**
 * The notice above a kept answer, once it is shown: the refusal, and that
 * the results are the earlier household's.
 */
function refusalNotice(): HTMLElement | undefined {
  const notice = screen.queryByText(
    'The results below are for the household shown before.',
  )?.parentElement;
  return notice?.textContent?.includes(refusalMessage) ? notice : undefined;
}

/** The live regions whose text includes the shared-limit explanation. */
function liveRegionsWithSharedLimitExplanation(): HTMLElement[] {
  return screen
    .queryAllByRole('status')
    .filter((liveRegion) =>
      liveRegion.textContent?.includes(SHARED_LIMIT_EXPLANATION),
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

describe('HouseholdImpactTab', () => {
  it('explains the pause beside the Calculate button, announcing only the explanation, once even above a kept answer', async () => {
    pauseHouseholdCalculations();
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Household impact' }));

    const calculateButton = await screen.findByRole('button', {
      name: /Calculate again in \d+ s/,
    });
    expect(calculateButton).toBeDisabled();
    const pauseNote = screen.getByText(
      (_content, element) =>
        element?.tagName === 'P' &&
        (element.textContent ?? '').includes('This page can calculate again in'),
    );
    expect(calculateButton.parentElement).toContainElement(pauseNote);
    expect(pauseNote).toHaveTextContent(
      /^Everyone on your network, such as a workshop or an office, shares a limit on calculations a minute\. This page can calculate again in \d+ s\.$/,
    );
    // Only the explanation is a live region, so screen readers announce it
    // once: the countdown changes every second.
    expect(pauseNote.closest('[role="status"]')).toBeNull();
    expect(pauseNote.querySelector('[role="status"]')).toHaveTextContent(
      /^Everyone on your network, such as a workshop or an office, shares a limit on calculations a minute\.$/,
    );

    // After the pause, the page calculates a household, then a refusal
    // keeps that answer on screen under its notice and starts the pause
    // again. The explanation is still announced from one place only.
    vi.spyOn(api, 'calculateHouseholdImpact')
      .mockResolvedValueOnce(calculatedAnswer)
      .mockImplementation(refuseAndPause);
    act(() => pauseHouseholdCalculations(0));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Calculate impact' }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Based on your employment income of/),
      ).toHaveTextContent('$50,000'),
    );
    fireEvent.click(screen.getByRole('button', { name: '$500k' }));
    await waitFor(() => expect(refusalNotice()).toBeDefined());
    const pausedCalculateButton = await screen.findByRole('button', {
      name: /Calculate again in \d+ s/,
    });

    const liveRegions = liveRegionsWithSharedLimitExplanation();
    expect(liveRegions).toHaveLength(1);
    expect(pausedCalculateButton.parentElement).toContainElement(
      liveRegions[0],
    );
  });

  it("keeps a calculated household's chart range and highlighted x-axis button after a refusal", async () => {
    // The page calculates the household itself, then the reader changes
    // the chart's range, which is refused.
    const calculate = vi
      .spyOn(api, 'calculateHouseholdImpact')
      .mockResolvedValueOnce(calculatedAnswer)
      .mockImplementation(refuseAndPause);
    const container = renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Household impact' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Calculate impact' }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Based on your employment income of/),
      ).toHaveTextContent('$50,000'),
    );
    expect(chartRangeEnd(container)).toBe('$100k');

    fireEvent.click(screen.getByRole('button', { name: '$500k' }));
    await waitFor(() => expect(refusalNotice()).toBeDefined());

    expect(calculate).toHaveBeenLastCalledWith(
      expect.objectContaining({ income: 50000, max_earnings: 500000 }),
    );
    // The answer calculated before stays, over its own range, and the
    // page highlights that range.
    expect(
      screen.getByText(/Based on your employment income of/),
    ).toHaveTextContent('$50,000');
    expect(chartRangeEnd(container)).toBe('$100k');
    expect(highlightedChartRange()).toBe('$100k');
  });

  it('shows a refusal itself after the household tab is opened again', async () => {
    // Leaving the tab and coming back empties the results area, so a later
    // refusal must not bring the earlier answer back.
    const calculate = vi
      .spyOn(api, 'calculateHouseholdImpact')
      .mockResolvedValueOnce(calculatedAnswer)
      .mockImplementation(refuseAndPause);
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Household impact' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Calculate impact' }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Based on your employment income of/),
      ).toHaveTextContent('$50,000'),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Policy overview' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Household impact' }));
    expect(
      screen.queryByText(/Based on your employment income of/),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('50,000'), {
      target: { value: '60,000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate impact' }));
    expect(await screen.findByText(refusalMessage)).toBeInTheDocument();

    expect(calculate).toHaveBeenLastCalledWith(
      expect.objectContaining({ income: 60000 }),
    );
    expect(
      screen.queryByText(/Based on your employment income of/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('The results below are for the household shown before.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Household calculator temporarily unavailable'),
    ).toBeInTheDocument();
  });
});
