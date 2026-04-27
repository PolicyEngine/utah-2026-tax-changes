"""One-off Modal script: split the Utah 2026 dashboard's combined cost
between SB60 (income tax rate cut) and HB290 (CTC phaseout threshold raise).

Both PRs already merged into PolicyEngine-US baseline, so the dashboard
runs an *inverse* reform that reverts each parameter to its pre-2026
value. To isolate the effect of each PR, we run the inverse reform
piece-by-piece:

* sb60_only revert: rate back to 4.5%, CTC thresholds at current 2026.
* hb290_only revert: rate at current 2026 (4.45%), CTC thresholds back
  to pre-2026 ($27k / $43k / $54k).

State cost of each provision = baseline_ut_income_tax - reverted_ut_income_tax
(positive = state collects less under current law than the reverted
counterfactual, i.e. the provision costs state revenue).

Usage:
    modal run scripts/modal_provision_breakdown.py
"""

import modal


app = modal.App("utah-2026-provision-breakdown")

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "policyengine-us>=1.150.0",
    "numpy>=1.24.0",
    "pandas>=2.0.0",
    "huggingface_hub",
)

UT_DATASET = "hf://policyengine/policyengine-us-data/states/UT.h5"
YEAR = 2026

SB60_REVERT = {
    "gov.states.ut.tax.income.rate": {
        "2026-01-01.2100-12-31": 0.045,
    },
}

HB290_REVERT = {
    "gov.states.ut.tax.income.credits.ctc.reduction.start.SEPARATE": {
        "2026-01-01.2100-12-31": 27000,
    },
    "gov.states.ut.tax.income.credits.ctc.reduction.start.SINGLE": {
        "2026-01-01.2100-12-31": 43000,
    },
    "gov.states.ut.tax.income.credits.ctc.reduction.start.HEAD_OF_HOUSEHOLD": {
        "2026-01-01.2100-12-31": 43000,
    },
    "gov.states.ut.tax.income.credits.ctc.reduction.start.JOINT": {
        "2026-01-01.2100-12-31": 54000,
    },
    "gov.states.ut.tax.income.credits.ctc.reduction.start.SURVIVING_SPOUSE": {
        "2026-01-01.2100-12-31": 54000,
    },
}

COMBINED = {**SB60_REVERT, **HB290_REVERT}


@app.function(image=image, memory=16384, timeout=1800, retries=1)
def run_breakdown() -> dict:
    """Run baseline + three reverted sims and report state-cost deltas."""
    from policyengine_us import Microsimulation
    from policyengine_core.reforms import Reform

    print("Loading baseline (current 2026 law) sim on UT dataset...")
    sim_baseline = Microsimulation(dataset=UT_DATASET)
    ut_baseline = sim_baseline.calculate(
        "ut_income_tax", period=YEAR, map_to="household"
    )
    fed_baseline = sim_baseline.calculate(
        "income_tax", period=YEAR, map_to="household"
    )

    results = {}
    for name, dct in [
        ("sb60_rate", SB60_REVERT),
        ("hb290_ctc", HB290_REVERT),
        ("combined", COMBINED),
    ]:
        print(f"  Running revert: {name}")
        sim = Microsimulation(
            dataset=UT_DATASET,
            reform=Reform.from_dict(dct, country_id="us"),
        )
        ut_rev = sim.calculate(
            "ut_income_tax", period=YEAR, map_to="household"
        )
        fed_rev = sim.calculate(
            "income_tax", period=YEAR, map_to="household"
        )
        # baseline - reverted: positive => state collects MORE under
        # current law than reverted, i.e. provision RAISED state revenue.
        # Negative => provision COST state revenue.
        state_delta = float((ut_baseline - ut_rev).sum())
        fed_delta = float((fed_baseline - fed_rev).sum())
        results[name] = {
            "state_revenue_impact": state_delta,
            "federal_revenue_impact": fed_delta,
        }
        print(
            f"    {name}: state={state_delta:+,.0f}  "
            f"federal={fed_delta:+,.0f}"
        )

    return results


@app.local_entrypoint()
def main():
    out = run_breakdown.remote()
    print("\n========== Utah 2026 provision-level breakdown ==========")
    print("(positive = provision RAISED state revenue;")
    print(" negative = provision COST state revenue)")
    print("---------------------------------------------------------")
    for name, vals in out.items():
        s = vals["state_revenue_impact"]
        f = vals["federal_revenue_impact"]
        print(
            f"  {name:>14s}  state={s:+15,.0f}   federal={f:+15,.0f}"
        )
    sb60 = out["sb60_rate"]["state_revenue_impact"]
    hb290 = out["hb290_ctc"]["state_revenue_impact"]
    combined = out["combined"]["state_revenue_impact"]
    interaction = combined - (sb60 + hb290)
    print(
        "\n  sum of isolated provisions = "
        f"{sb60 + hb290:+,.0f}  "
        f"(interaction residual: {interaction:+,.0f})"
    )
