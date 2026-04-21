'use client';

export default function PolicyOverview() {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
        </div>
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

      {/* References and further reading */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          References
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">SB60 &mdash; Income tax rate</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <a
                  href="https://www.policyengine.org/us/state-legislative-tracker/UT/ut-sb60-bill"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  PolicyEngine State Legislative Tracker analysis
                </a>
              </li>
              <li>
                <a
                  href="https://le.utah.gov/~2025/bills/static/SB0060.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  Utah State Legislature bill text
                </a>
              </li>
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">HB290 &mdash; Child Tax Credit expansion</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <a
                  href="https://www.policyengine.org/us/state-legislative-tracker/UT/ut-hb290"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  PolicyEngine State Legislative Tracker analysis
                </a>
              </li>
              <li>
                <a
                  href="https://le.utah.gov/~2026/bills/static/HB0290.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  Utah State Legislature bill text
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
