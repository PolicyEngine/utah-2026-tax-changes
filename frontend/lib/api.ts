/**
 * Household impact via www.policyengine.org's dashboard API.
 *
 * The page never calls the PolicyEngine Public API itself: the dashboard
 * API's server adds PolicyEngine's credential and forwards each household
 * to the Public API's /us/calculate.
 *
 * For the Utah 2026 Tax Changes dashboard, the "reform" reverts Utah
 * parameters to their pre-2026 values while the PolicyEngine baseline
 * represents current (2026) law. The displayed impact therefore equals:
 *
 *   impact = baseline (current 2026 law) - reform (pre-2026 law)
 *
 * which is FLIPPED relative to a conventional reform where the baseline is
 * current law and the reform represents a proposed change.
 */

import {
  createPolicyEngineApiClient,
  PolicyEngineApiError,
} from "@policyengine/api-client";

import {
  HouseholdRequest,
  HouseholdImpactResponse,
} from "./types";
import {
  buildHouseholdSituation,
  buildReformPolicy,
  interpolate,
} from "./household";

const policyengine = createPolicyEngineApiClient();

/** How long a calculation may take before the page gives up on it. */
const CALCULATION_TIMEOUT_MILLISECONDS = 120_000;

/** Brief gateway failures, which are worth retrying. */
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

/** A household calculation failed; `message` is written for the user. */
export class HouseholdCalculationError extends Error {
  override name = "HouseholdCalculationError";

  constructor(
    message: string,
    /** The dashboard API's HTTP status, or null when no answer was read. */
    readonly status: number | null,
    /** Whether trying again at once could succeed. */
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/**
 * Whether React Query should retry a failed household calculation: once,
 * and only after a brief gateway failure. Each attempt sends two
 * calculations, and the firewall allows 30 a minute.
 */
export function shouldRetryHouseholdCalculation(
  failureCount: number,
  error: unknown,
): boolean {
  return (
    failureCount < 1 &&
    error instanceof HouseholdCalculationError &&
    error.retryable
  );
}

function dashboardApiMessage(body: unknown): string | null {
  if (typeof body === "object" && body !== null) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return null;
}

/** Turns a failure of the dashboard API client into a message for the user. */
function calculationError(error: PolicyEngineApiError): HouseholdCalculationError {
  if (error.status === null) {
    // On another origin, such as the dashboard's own host, the firewall's
    // 429 has no CORS headers, so the browser reports a network failure.
    // So does the dashboard API's 403 for an origin it does not allow.
    return new HouseholdCalculationError(
      "PolicyEngine's calculation service could not be reached. If many " +
        "calculations have been run from your network in the last minute, " +
        "wait a minute and try again.",
      null,
      false,
    );
  }
  if (error.status === 429) {
    return new HouseholdCalculationError(
      "Too many calculations have been run from your network in the last " +
        "minute. Wait a minute and try again.",
      429,
      false,
    );
  }
  const detail =
    dashboardApiMessage(error.body) ?? "Try again in a few minutes.";
  return new HouseholdCalculationError(
    `PolicyEngine could not calculate this household (HTTP ${error.status}): ${detail}`,
    error.status,
    RETRYABLE_STATUSES.has(error.status),
  );
}

/** Values over the income axis, keyed by year. */
type ValuesByYear = Record<string, number[]>;

/** The parts of a calculated household this page reads. */
interface CalculatedHousehold {
  people: Record<string, Record<string, ValuesByYear>>;
  households: Record<string, Record<string, ValuesByYear>>;
  tax_units: Record<string, Record<string, ValuesByYear>>;
}

async function calculateHousehold(
  household: Record<string, unknown>,
  policy?: Record<string, unknown>
): Promise<CalculatedHousehold> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    CALCULATION_TIMEOUT_MILLISECONDS
  );
  try {
    return await policyengine.calculateHousehold<CalculatedHousehold>(
      { country: "us", household, policy },
      { signal: controller.signal }
    );
  } catch (error) {
    if (controller.signal.aborted) {
      throw new HouseholdCalculationError(
        "The calculation took longer than two minutes. Try again.",
        null,
        false,
      );
    }
    if (error instanceof PolicyEngineApiError) {
      throw calculationError(error);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  async calculateHouseholdImpact(
    request: HouseholdRequest
  ): Promise<HouseholdImpactResponse> {
    const household = buildHouseholdSituation(request);
    const policy = buildReformPolicy();
    const yearStr = String(request.year);

    // Run baseline (current 2026 law) and reform (pre-2026 law) in parallel.
    const [baselineResult, reformResult] = await Promise.all([
      calculateHousehold(household),
      calculateHousehold(household, policy),
    ]);

    // Extract arrays from PE API response.
    const baselineNetIncome: number[] =
      baselineResult.households["your household"][
        "household_net_income"
      ][yearStr];
    const reformNetIncome: number[] =
      reformResult.households["your household"][
        "household_net_income"
      ][yearStr];
    const incomeRange: number[] =
      baselineResult.people["you"][
        "employment_income"
      ][yearStr];

    // Extract Utah state income tax arrays.
    const baselineStateTax: number[] =
      baselineResult.tax_units["your tax unit"]["ut_income_tax"][
        yearStr
      ];
    const reformStateTax: number[] =
      reformResult.tax_units["your tax unit"]["ut_income_tax"][
        yearStr
      ];

    // Extract federal income tax arrays.
    const baselineFederalTax: number[] =
      baselineResult.tax_units["your tax unit"]["income_tax"][yearStr];
    const reformFederalTax: number[] =
      reformResult.tax_units["your tax unit"]["income_tax"][yearStr];

    // Impact = baseline (current 2026 law) - reform (pre-2026 law).
    // FLIPPED relative to a conventional reform where baseline is current law.
    const netIncomeChange = baselineNetIncome.map(
      (val, i) => val - reformNetIncome[i]
    );
    const federalTaxChange = baselineFederalTax.map(
      (val, i) => val - reformFederalTax[i]
    );
    const stateTaxChange = baselineStateTax.map(
      (val, i) => val - reformStateTax[i]
    );

    // Interpolate at the user's income for scalar metric cards.
    const baselineAtIncome = interpolate(
      incomeRange,
      baselineNetIncome,
      request.income
    );
    const reformAtIncome = interpolate(
      incomeRange,
      reformNetIncome,
      request.income
    );
    const baselineFederalTaxAtIncome = interpolate(
      incomeRange,
      baselineFederalTax,
      request.income
    );
    const reformFederalTaxAtIncome = interpolate(
      incomeRange,
      reformFederalTax,
      request.income
    );
    const baselineStateTaxAtIncome = interpolate(
      incomeRange,
      baselineStateTax,
      request.income
    );
    const reformStateTaxAtIncome = interpolate(
      incomeRange,
      reformStateTax,
      request.income
    );

    // Scalar differences at the user's income, sign-flipped so positive
    // numbers mean the household pays less / nets more under current law.
    const federalTaxChangeAtIncome =
      baselineFederalTaxAtIncome - reformFederalTaxAtIncome;
    const stateTaxChangeAtIncome =
      baselineStateTaxAtIncome - reformStateTaxAtIncome;
    const netIncomeChangeAtIncome = baselineAtIncome - reformAtIncome;

    return {
      income_range: incomeRange,
      net_income_change: netIncomeChange,
      federalTaxChange,
      stateTaxChange,
      netIncomeChange,
      benefit_at_income: {
        baseline: baselineAtIncome,
        reform: reformAtIncome,
        difference: netIncomeChangeAtIncome,
        // EITC fields retained for backward compatibility with ImpactAnalysis.
        federal_eitc_change: 0,
        state_eitc_change: 0,
        federal_tax_change: federalTaxChangeAtIncome,
        state_tax_change: stateTaxChangeAtIncome,
        net_income_change: netIncomeChangeAtIncome,
      },
      x_axis_max: request.max_earnings,
    };
  },
};
