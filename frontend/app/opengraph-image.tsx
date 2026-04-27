import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Utah 2026 Tax Changes Calculator — PolicyEngine';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1a4a4a 0%, #2C7A7B 50%, #38A89D 100%)',
          fontFamily: 'Inter, sans-serif',
          color: 'white',
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 500,
            opacity: 0.85,
            marginBottom: 16,
            letterSpacing: '0.05em',
          }}
        >
          POLICYENGINE
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 24,
          }}
        >
          Utah 2026 Tax Changes Calculator
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 400,
            opacity: 0.9,
            lineHeight: 1.5,
            maxWidth: '80%',
          }}
        >
          See how SB60&apos;s income tax rate cut and HB290&apos;s Child Tax Credit expansion affect your household and the state budget.
        </div>
      </div>
    ),
    { ...size },
  );
}
