'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import ChartWatermark from './ChartWatermark';

function formatDollar(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
}

function formatDollarFull(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Chart visualization data for the Utah 2026 tax changes.
// sb60: Utah state income tax rate reduction from 4.5% to 4.45%.
//   x = gross income, y = state income tax liability.
// hb290: Utah CTC phase-out threshold increase (joint filers) from $54k to $61k.
//   x = AGI, y = CTC amount. $1,000 flat then 10% phase-out.
const CHART_SCENARIOS = {
  sb60: {
    label: 'SB60 income tax rate',
    data: generateSB60Data(200000),
    xMax: 200000,
    xTicks: [0, 50000, 100000, 150000, 200000],
    yMax: 10000,
    yTicks: [0, 2500, 5000, 7500, 10000],
    xAxisLabel: 'Gross income',
    yAxisLabel: 'Utah state income tax',
    tooltipXLabel: 'Gross income',
    tooltipYLabel: 'Utah state tax',
  },
  hb290: {
    label: 'HB290 Child Tax Credit',
    data: generateHB290Data(100000, 54000, 61000),
    xMax: 100000,
    xTicks: [0, 20000, 40000, 60000, 80000, 100000],
    yMax: 1200,
    yTicks: [0, 200, 400, 600, 800, 1000, 1200],
    xAxisLabel: 'Adjusted gross income',
    yAxisLabel: 'Utah Child Tax Credit',
    tooltipXLabel: 'AGI',
    tooltipYLabel: 'Utah CTC',
  },
} as const;

type ScenarioKey = keyof typeof CHART_SCENARIOS;

function generateSB60Data(xMax: number) {
  const points = [];
  for (let income = 0; income <= xMax; income += 500) {
    const baseline = income * 0.045;
    const reform = income * 0.0445;
    points.push({ income, baseline, reform });
  }
  return points;
}

function generateHB290Data(
  xMax: number,
  baselineThreshold: number,
  reformThreshold: number
) {
  const maxCredit = 1000;
  const phaseOutRate = 0.1;
  const points = [];
  for (let income = 0; income <= xMax; income += 500) {
    const baseline =
      income <= baselineThreshold
        ? maxCredit
        : Math.max(0, maxCredit - (income - baselineThreshold) * phaseOutRate);
    const reform =
      income <= reformThreshold
        ? maxCredit
        : Math.max(0, maxCredit - (income - reformThreshold) * phaseOutRate);
    points.push({ income, baseline, reform });
  }
  return points;
}

export default function PolicyOverview() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('sb60');
  const scenario = CHART_SCENARIOS[scenarioKey];
  const chartData = scenario.data;

  return (
    <div className="space-y-10">
      {/* Summary */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Utah 2026 Tax Changes
        </h2>
        <p className="text-gray-700 mb-4">
          Utah enacted two major tax changes that take effect in 2026: Senate Bill
          60 (SB60) reduces the state income tax rate from 4.5% to 4.45%, and
          House Bill 290 (HB290) expands the state Child Tax Credit by raising
          the income thresholds at which the credit begins to phase out. Together,
          these changes reduce state tax liability for most Utah households.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">SB60 rate cut</h3>
            <p className="text-sm text-gray-600">
              Utah&apos;s state income tax rate drops from 4.5% to 4.45%, a
              0.05 percentage point reduction applied to all taxable income.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">HB290 CTC expansion</h3>
            <p className="text-sm text-gray-600">
              Raises the income thresholds at which Utah&apos;s Child Tax Credit
              begins to phase out, expanding eligibility for middle-income
              families.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Effective 2026</h3>
            <p className="text-sm text-gray-600">
              Both changes take effect for tax year 2026, affecting returns filed
              in early 2027.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">UT state tax</h3>
            <p className="text-sm text-gray-600">
              Utah uses a flat state income tax. The combined effect of SB60 and
              HB290 lowers taxes for most households, with the largest share of
              relief going to families with children.
            </p>
          </div>
        </div>
      </div>

      {/* Combined comparison chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Utah 2026 tax changes by income
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Comparison of pre-2026 law vs. current (2026) law
        </p>
        {/* Scenario tabs */}
        <div className="flex space-x-2 mb-4">
          {(Object.keys(CHART_SCENARIOS) as ScenarioKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setScenarioKey(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                scenarioKey === key
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {CHART_SCENARIOS[key].label}
            </button>
          ))}
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="income"
                tickFormatter={formatDollar}
                tick={{ fontSize: 12 }}
                domain={[0, scenario.xMax]}
                ticks={[...scenario.xTicks]}
              />
              <YAxis
                tickFormatter={formatDollar}
                tick={{ fontSize: 12 }}
                domain={[0, scenario.yMax]}
                ticks={[...scenario.yTicks]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const baseline = payload.find(p => p.dataKey === 'baseline')?.value as number;
                  const reform = payload.find(p => p.dataKey === 'reform')?.value as number;
                  const difference = reform - baseline;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-gray-900 mb-2">
                        {scenario.tooltipXLabel}: {formatDollarFull(label as number)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Pre-2026 law: {formatDollarFull(baseline)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Current law (2026): {formatDollarFull(reform)}
                      </p>
                      <p className="text-sm font-semibold text-primary-700 mt-1">
                        Change: {difference >= 0 ? '+' : ''}{formatDollarFull(difference)}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="var(--chart-reference)" strokeWidth={1} />
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="var(--chart-baseline)"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Pre-2026 law"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="reform"
                stroke="var(--chart-positive)"
                strokeWidth={3}
                name="Current law (2026)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartWatermark />
      </div>

      {/* Parameter changes table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Parameter changes (2026)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Parameter</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Pre-2026 law</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Current law (2026)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Change</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-gray-700">State income tax rate (SB60)</td>
                <td className="py-3 px-4 text-right text-gray-700">4.50%</td>
                <td className="py-3 px-4 text-right text-gray-700">4.45%</td>
                <td className="py-3 px-4 text-right font-semibold text-primary-600">-0.05 pp</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-gray-700">CTC phase-out threshold (single)</td>
                <td className="py-3 px-4 text-right text-gray-700">$43,000</td>
                <td className="py-3 px-4 text-right text-gray-700">$49,000</td>
                <td className="py-3 px-4 text-right font-semibold text-primary-600">+$6,000</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-gray-700">CTC phase-out threshold (head of household)</td>
                <td className="py-3 px-4 text-right text-gray-700">$43,000</td>
                <td className="py-3 px-4 text-right text-gray-700">$49,000</td>
                <td className="py-3 px-4 text-right font-semibold text-primary-600">+$6,000</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-gray-700">CTC phase-out threshold (married separately)</td>
                <td className="py-3 px-4 text-right text-gray-700">$27,000</td>
                <td className="py-3 px-4 text-right text-gray-700">$30,500</td>
                <td className="py-3 px-4 text-right font-semibold text-primary-600">+$3,500</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-gray-700">CTC phase-out threshold (joint)</td>
                <td className="py-3 px-4 text-right text-gray-700">$54,000</td>
                <td className="py-3 px-4 text-right text-gray-700">$61,000</td>
                <td className="py-3 px-4 text-right font-semibold text-primary-600">+$7,000</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-gray-700">CTC phase-out threshold (surviving spouse)</td>
                <td className="py-3 px-4 text-right text-gray-700">$54,000</td>
                <td className="py-3 px-4 text-right text-gray-700">$61,000</td>
                <td className="py-3 px-4 text-right font-semibold text-primary-600">+$7,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
