import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Deslint — catch design drift, broken responsive layouts, and WCAG failures in AI-generated frontend code';

// All top-level and nested <div>s declare `display: 'flex'` explicitly.
// Satori (the renderer next/og uses) rejects multi-child divs without it,
// and has no support for inline-flex, grid, br, or pseudo-elements.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: '64px',
          background:
            'linear-gradient(135deg, #0B0A18 0%, #161434 46%, #1E1A3F 100%)',
          color: '#FAFAFB',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '620px',
            paddingRight: '40px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg width="54" height="54" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6.66" fill="#534AB7" />
              <rect x="4.48" y="4.32" width="23.04" height="23.68" rx="3.01" fill="#ffffff" opacity="0.07" />
              <rect x="7.33" y="8.64" width="10.66" height="1.66" rx="0.83" fill="#ffffff" opacity="0.5" />
              <rect x="7.33" y="12.64" width="14.66" height="1.66" rx="0.83" fill="#ffffff" opacity="0.85" />
              <rect x="7.33" y="16.64" width="8" height="1.66" rx="0.83" fill="#1D9E75" />
              <circle cx="24" cy="17.47" r="2.34" fill="#1D9E75" />
              <path
                d="M22.95 17.47 L23.88 18.64 L25.22 16.18"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.61"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div style={{ display: 'flex', fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
              <span style={{ color: '#FAFAFB' }}>des</span>
              <span style={{ color: '#9B91D4' }}>lint</span>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: '40px', fontSize: '66px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, color: '#FAFAFB' }}>
            AI writes fast.
          </div>
          <div style={{ display: 'flex', marginTop: '4px', fontSize: '66px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, color: '#C2BCE9' }}>
            Deslint keeps it clean.
          </div>

          <div style={{ display: 'flex', marginTop: '28px', fontSize: '24px', lineHeight: 1.45, color: 'rgba(250,250,251,0.75)', maxWidth: '540px' }}>
            Catch design drift, broken responsive layouts, and WCAG failures in AI-generated frontend code.
          </div>

          <div style={{ display: 'flex', marginTop: '36px', gap: '10px' }}>
            <Pill>ESLint</Pill>
            <Pill>CLI</Pill>
            <Pill>MCP</Pill>
            <Pill>GitHub Action</Pill>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            background: '#FAFAFB',
            borderRadius: '20px',
            padding: '28px 30px',
            color: '#111827',
            boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', color: '#6B7280' }}>
              QUALITY GATE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#D1FAE5', color: '#065F46', padding: '5px 12px', borderRadius: '999px', fontSize: '14px', fontWeight: 700 }}>
              <div style={{ display: 'flex', width: '9px', height: '9px', borderRadius: '999px', background: '#10B981' }} />
              PASSED
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '16px' }}>
            <div style={{ display: 'flex', fontSize: '94px', fontWeight: 800, letterSpacing: '-0.04em', color: '#10B981', lineHeight: 1 }}>
              92
            </div>
            <div style={{ display: 'flex', marginLeft: '8px', fontSize: '22px', color: '#9CA3AF' }}>
              /100
            </div>
            <div style={{ display: 'flex', marginLeft: '16px', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              Grade A
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '18px', gap: '10px' }}>
            <Stat label="Colors"       score={100} color="#10B981" />
            <Stat label="Spacing"      score={100} color="#10B981" />
            <Stat label="Typography"   score={96}  color="#10B981" />
            <Stat label="Responsive"   score={84}  color="#F59E0B" />
            <Stat label="Consistency"  score={80}  color="#F59E0B" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px', fontSize: '16px', color: '#4B5563' }}>
            <span style={{ display: 'flex', fontFamily: 'monospace', background: '#F4F4F5', padding: '4px 10px', borderRadius: '6px', color: '#111827' }}>
              deslint.com
            </span>
            <span style={{ display: 'flex', color: '#6B7280' }}>· 1 command. CI-ready.</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function Pill({ children }: { children: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 14px',
        borderRadius: '999px',
        border: '1px solid rgba(194, 188, 233, 0.35)',
        background: 'rgba(123, 109, 199, 0.15)',
        color: '#DDDAF5',
        fontSize: '18px',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ display: 'flex', width: '130px', fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          flex: 1,
          height: '10px',
          borderRadius: '999px',
          background: '#E5E7EB',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: `${score}%`,
            height: '100%',
            borderRadius: '999px',
            background: color,
          }}
        />
      </div>
      <div style={{ display: 'flex', width: '40px', justifyContent: 'flex-end', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
        {score}
      </div>
    </div>
  );
}
