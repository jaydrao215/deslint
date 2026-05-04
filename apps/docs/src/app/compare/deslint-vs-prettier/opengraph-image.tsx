import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt =
  'Deslint vs. Prettier — formatter vs. design intent. Prettier formats your code; Deslint enforces design tokens, Tailwind drift, WCAG, and frontend safety. Honest side-by-side.';

// Comparison-page OG. Frame: "Two different layers." Prettier handles
// shape; Deslint handles meaning. The verdict line runs under two
// product chips connected by a "+" so the user reads them as
// complementary, not competing.
export default async function CompareOpenGraphImage() {
  const [satoshiRegular, satoshiMedium, satoshiBold, jetbrainsMono] = await Promise.all([
    fetch(new URL('../../fonts/satoshi-regular.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../../fonts/satoshi-medium.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../../fonts/satoshi-bold.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../../fonts/jetbrains-mono-medium.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '60px 64px',
          background: 'linear-gradient(135deg, #0B0A18 0%, #161434 46%, #1E1A3F 100%)',
          color: '#FAFAFB',
          fontFamily: 'Satoshi',
        }}
      >
        {/* Top — brand + comparison badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg width="44" height="44" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6.66" fill="#534AB7" />
              <rect x="4.48" y="4.32" width="23.04" height="23.68" rx="3.01" fill="#ffffff" opacity="0.07" />
              <rect x="7.33" y="8.64" width="10.66" height="1.66" rx="0.83" fill="#ffffff" opacity="0.5" />
              <rect x="7.33" y="12.64" width="14.66" height="1.66" rx="0.83" fill="#ffffff" opacity="0.85" />
              <rect x="7.33" y="16.64" width="8" height="1.66" rx="0.83" fill="#1D9E75" />
              <circle cx="24" cy="17.47" r="2.34" fill="#1D9E75" />
              <path d="M22.95 17.47 L23.88 18.64 L25.22 16.18" fill="none" stroke="#ffffff" strokeWidth="0.61" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display: 'flex', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
              <span style={{ color: '#FAFAFB' }}>des</span>
              <span style={{ color: '#9B91D4' }}>lint</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(123, 109, 199, 0.18)',
              border: '1px solid rgba(194, 188, 233, 0.35)',
              padding: '8px 16px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#DDDAF5',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Honest comparison
          </div>
        </div>

        {/* Center — two product chips with "+" between, then the verdict */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <ProductChip name="Prettier" accent="#C44569" sub="Code formatting" />
            <div style={{ display: 'flex', fontSize: '38px', fontWeight: 800, color: '#9B91D4', letterSpacing: '-0.02em' }}>
              +
            </div>
            <ProductChip name="Deslint" accent="#534AB7" sub="Design intent" />
          </div>

          <div style={{ display: 'flex', marginTop: '40px', fontSize: '54px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: '#FAFAFB' }}>
            Prettier formats.
          </div>
          <div style={{ display: 'flex', marginTop: '4px', fontSize: '54px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: '#9B91D4' }}>
            Deslint enforces intent.
          </div>

          <div style={{ display: 'flex', marginTop: '20px', fontSize: '19px', lineHeight: 1.5, color: 'rgba(250,250,251,0.65)', maxWidth: '760px', textAlign: 'center', justifyContent: 'center' }}>
            Prettier will happily reformat a hardcoded #1a5276 into beautifully indented JSX. The hex still ships. Deslint catches the value, not the whitespace.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '32px' }}>
          <div style={{ display: 'flex', fontSize: '14px', color: 'rgba(250,250,251,0.45)' }}>
            Side-by-side on six real questions — formatting, drift, tokens, WCAG, AI agents, CI.
          </div>
          <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: '14px', color: 'rgba(250,250,251,0.55)' }}>
            deslint.com/compare
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

function ProductChip({ name, accent, sub }: { name: string; accent: string; sub: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#FAFAFB',
        borderRadius: '16px',
        padding: '22px 28px',
        color: '#111827',
        boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
        border: `2px solid ${accent}`,
        minWidth: '280px',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', fontSize: '38px', fontWeight: 800, letterSpacing: '-0.03em', color: accent }}>
        {name}
      </div>
      <div style={{ display: 'flex', marginTop: '6px', fontSize: '14px', fontWeight: 600, color: '#4B5563', letterSpacing: '0.02em' }}>
        {sub}
      </div>
    </div>
  );
}
