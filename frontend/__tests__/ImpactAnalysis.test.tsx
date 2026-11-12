import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ImpactAnalysis from '../components/ImpactAnalysis';
import { pauseHouseholdCalculations } from '../hooks/useHouseholdImpact';
import { api, HouseholdCalculationError } from '../lib/api';
import type { HouseholdImpactResponse, HouseholdRequest } from '../lib/types';

// Recharts' ResponsiveContainer measures its parent, which jsdom cannot do.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
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
  'limit on calculations a minute, and it has been reached. This page can ' +
  'calculate again in a minute.';

afterEach(() => {
  vi.restoreAllMocks();
  pauseHouseholdCalculations(0);
});

describe('ImpactAnalysis', () => {
  it('shows the last answer and the notice after a rate-limit refusal', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['householdImpact', earlierRequest], earlierAnswer);
    vi.spyOn(api, 'calculateHouseholdImpact').mockRejectedValue(
      new HouseholdCalculationError(refusalMessage, 429, false, true),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ImpactAnalysis request={refusedRequest} triggered={true} maxEarnings={100000} />
      </QueryClientProvider>,
    );

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent(refusalMessage);
    expect(notice).toHaveTextContent(
      'The results below are for the last household calculated.',
    );
    // The labels describe the household whose answer is shown.
    expect(
      screen.getByText(/Based on your employment income of/),
    ).toHaveTextContent('$50,000');
    expect(
      screen.queryByText('Household calculator temporarily unavailable'),
    ).not.toBeInTheDocument();
  });
});
