import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Home from '../app/(shell)/page';
import { pauseHouseholdCalculations } from '../hooks/useHouseholdImpact';

// The other tabs are not under test.
vi.mock('../components/PolicyOverview', () => ({ default: () => null }));
vi.mock('../components/AggregateImpact', () => ({ default: () => null }));
vi.mock('../components/CongressionalDistrictImpact', () => ({
  default: () => null,
}));

afterEach(() => {
  pauseHouseholdCalculations(0);
});

describe('HouseholdImpactTab', () => {
  it('explains the pause beside the Calculate button', async () => {
    pauseHouseholdCalculations();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Home />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Household impact' }));

    const calculateButton = await screen.findByRole('button', {
      name: /Calculate again in \d+ s/,
    });
    expect(calculateButton).toBeDisabled();
    const pauseExplanation =
      calculateButton.parentElement?.querySelector('[role="status"]') ?? null;
    expect(pauseExplanation).not.toBeNull();
    expect(pauseExplanation).toHaveTextContent(
      /^Everyone on your network, such as a workshop or an office, shares a limit on calculations a minute\. This page can calculate again in \d+ s\.$/,
    );
  });
});
