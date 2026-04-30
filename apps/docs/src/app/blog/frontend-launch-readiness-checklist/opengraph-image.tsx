import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt =
  'Frontend launch readiness: 14 checks before AI code goes live. A deterministic checklist for design tokens, responsive coverage, WCAG 2.2, dark mode, and frontend safety.';

// Per-post OG. Visual story: brand on top-left, "14-point checklist"
// chip on top-right, big article title in the middle, two columns of
// numbered checks on the lower half. Reuses the gradient background and
// type stack from the launch-check OG so the brand reads consistently.
export default async function PostOpenGraphImage() {
  const [satoshiRegular, satoshiMedium, satoshiBold, jetbrainsMono] = await Promise.all([
    fetch(new URL('../../fonts/satoshi-regular.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../../fonts/satoshi-medium.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../../fonts/satoshi-bold.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../../fonts/jetbrains-mono-medium.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
  ]);

  const checks = [
    'No hardcoded Tailwind values',
    'No hex outside the palette',
    'No magic numbers in layout',
    'Fixed widths have breakpoints',
    'Viewport meta does not block zoom',
    'Targets ≥ 24×24',
    '<img> has meaningful alt',
    'Inputs have programmatic labels',
    'Links are not "click here"',
    'Focus rings present',
    'Dark mode applied across',
    'No dangerouslySetInnerHTML on input',
    'target="_blank" has rel guard',
    '<iframe> has sandbox',
  ];

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '52px 60px',
          background: 'linear-gradient(135deg, #0B0A18 0%, #161434 46%, #1E1A3F 100%)',
          color: '#FAFAFB',
          fontFamily: 'Satoshi',
        }}
      >
        {/* Top — brand + chip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg width="40" height="40" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6.66" fill="#534AB7" />
              <rect x="4.48" y="4.32" width="23.04" height="23.68" rx="3.01" fill="#ffffff" opacity="0.07" />
              <rect x="7.33" y="8.64" width="10.66" height="1.66" rx="0.83" fill="#ffffff" opacity="0.5" />
              <rect x="7.33" y="12.64" width="14.66" height="1.66" rx="0.83" fill="#ffffff" opacity="0.85" />
              <rect x="7.33" y="16.64" width="8" height="1.66" rx="0.83" fill="#1D9E75" />
              <circle cx="24" cy="17.47" r="2.34" fill="#1D9E75" />
              <path d="M22.95 17.47 L23.88 18.64 L25.22 16.18" fill="none" stroke="#ffffff" strokeWidth="0.61" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display: 'flex', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
              <span style={{ color: '#FAFAFB' }}>des</span>
              <span style={{ color: '#9B91D4' }}>lint</span>
              <span style={{ color: 'rgba(250,250,251,0.45)', marginLeft: '12px', fontSize: '20px', fontWeight: 600 }}>· blog</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(123, 109, 199, 0.18)',
              border: '1px solid rgba(194, 188, 233, 0.35)',
              padding: '7px 14px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#DDDAF5',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            14-point checklist · 13 min read
          </div>
        </div>

        {/* Middle — title */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '32px' }}>
          <div style={{ display: 'flex', fontSize: '54px', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.04, color: '#FAFAFB' }}>
            Frontend launch readiness:
          </div>
          <div style={{ display: 'flex', marginTop: '4px', fontSize: '38px', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, color: '#9B91D4' }}>
            14 checks before AI code goes live.
          </div>
        </div>

        {/* Bottom — checks in two columns */}
        <div style={{ display: 'flex', marginTop: '30px', gap: '24px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
            {checks.slice(0, 7).map((c, i) => (
              <Check key={c} num={i + 1} text={c} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
            {checks.slice(7).map((c, i) => (
              <Check key={c} num={i + 8} text={c} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0B0A18', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(155, 145, 212, 0.25)' }}>
            <span style={{ display: 'flex', color: '#6B7280', fontFamily: 'JetBrains Mono', fontSize: '14px' }}>$</span>
            <span style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: '14px' }}>
              <span style={{ color: '#1D9E75' }}>npx</span>
              <span style={{ color: '#FAFAFB', marginLeft: '8px', fontWeight: 600 }}>deslint</span>
              <span style={{ color: '#C2BCE9', marginLeft: '8px' }}>launch-check</span>
            </span>
          </div>
          <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'rgba(250,250,251,0.55)' }}>
            deslint.com/blog
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Satoshi', data: satoshiRegular, weight: 400, style: 'normal' },
        { name: 'Satoshi', data: satoshiMedium, weight: 500, style: 'normal' },
        { name: 'Satoshi', data: satoshiBold, weight: 700, style: 'normal' },
        { name: 'JetBrains Mono', data: jetbrainsMono, weight: 500, style: 'normal' },
      ],
    },
  );
}

function Check({ num, text }: { num: number; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '999px',
          background: 'rgba(29, 158, 117, 0.18)',
          border: '1px solid rgba(29, 158, 117, 0.45)',
          color: '#86EFAC',
          fontSize: '12px',
          fontWeight: 700,
        }}
      >
        {num}
      </div>
      <div style={{ display: 'flex', fontSize: '15px', fontWeight: 500, color: 'rgba(250,250,251,0.85)' }}>
        {text}
      </div>
    </div>
  );
}
