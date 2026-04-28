import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Frontend launch readiness for AI-built apps. Deslint scores design-token drift, responsive, accessibility, dark mode, and frontend safety in one command.';

// Companion to the root /opengraph-image.tsx tuned for the indie / vibe-
// coding audience. The root OG sells the verification-layer angle to
// engineering teams; this one frames the same engine as a confident
// launch-readiness check — positive framing (95/100 PASSED), agentic
// headline ("Frontend launch readiness"), command-forward layout.
//
// All <div>s declare display:flex (Satori in next/og rejects multi-child
// divs without it).
export default async function LaunchCheckOpenGraphImage() {
  const [satoshiRegular, satoshiMedium, satoshiBold, jetbrainsMono] = await Promise.all([
    fetch(new URL('../fonts/satoshi-regular.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../fonts/satoshi-medium.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../fonts/satoshi-bold.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../fonts/jetbrains-mono-medium.ttf', import.meta.url)).then((r) => r.arrayBuffer()),
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
          background:
            'linear-gradient(135deg, #0B0A18 0%, #161434 46%, #1E1A3F 100%)',
          color: '#FAFAFB',
          fontFamily: 'Satoshi',
        }}
      >
        {/* Top bar — logo + free chip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg width="44" height="44" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
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
            <div style={{ display: 'flex', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
              <span style={{ color: '#FAFAFB' }}>des</span>
              <span style={{ color: '#9B91D4' }}>lint</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(123, 109, 199, 0.18)', border: '1px solid rgba(194, 188, 233, 0.35)', padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 700, color: '#DDDAF5', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Free · Local · 0 LLM
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '44px' }}>
          <div style={{ display: 'flex', fontSize: '72px', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.02, color: '#FAFAFB' }}>
            Frontend launch readiness
          </div>
          <div style={{ display: 'flex', marginTop: '8px', fontSize: '34px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#9B91D4' }}>
            for apps your AI just wrote.
          </div>
        </div>

        {/* Command + score row */}
        <div style={{ display: 'flex', marginTop: '40px', gap: '24px', alignItems: 'stretch' }}>
          {/* Command pill */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              background: '#0B0A18',
              borderRadius: '14px',
              padding: '22px 26px',
              border: '1px solid rgba(155, 145, 212, 0.25)',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', color: '#6B7280', textTransform: 'uppercase' }}>
              One command
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
              <span style={{ display: 'flex', color: '#6B7280', fontFamily: 'JetBrains Mono', fontSize: '24px' }}>$</span>
              <span style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: '24px' }}>
                <span style={{ color: '#1D9E75' }}>npx</span>
                <span style={{ color: '#FAFAFB', marginLeft: '10px', fontWeight: 600 }}>deslint</span>
                <span style={{ color: '#C2BCE9', marginLeft: '10px' }}>launch-check</span>
              </span>
            </div>
          </div>

          {/* Score card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '360px',
              background: '#FAFAFB',
              borderRadius: '14px',
              padding: '22px 24px',
              color: '#111827',
              boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#6B7280' }}>
                LAUNCH READINESS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#D1FAE5', color: '#065F46', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                <div style={{ display: 'flex', width: '7px', height: '7px', borderRadius: '999px', background: '#10B981' }} />
                PASSED
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
              <div style={{ display: 'flex', fontSize: '76px', fontWeight: 800, letterSpacing: '-0.04em', color: '#10B981', lineHeight: 1 }}>
                95
              </div>
              <div style={{ display: 'flex', marginLeft: '6px', fontSize: '20px', color: '#9CA3AF' }}>
                /100
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '14px', gap: '6px' }}>
              <Bar label="Colors"      score={100} />
              <Bar label="Spacing"     score={100} />
              <Bar label="Typography"  score={92} />
              <Bar label="Responsive"  score={88} />
              <Bar label="Consistency" score={95} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'rgba(250,250,251,0.55)' }}>
            <span>Ship-readiness for apps built with</span>
            <span style={{ display: 'flex', color: 'rgba(250,250,251,0.85)', fontWeight: 600 }}>
              Cursor · Claude Code · Codex · Windsurf
            </span>
          </div>
          <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: '14px', color: 'rgba(250,250,251,0.55)' }}>
            deslint.com/launch-check
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Satoshi', data: satoshiRegular, weight: 400, style: 'normal' },
        { name: 'Satoshi', data: satoshiMedium,  weight: 500, style: 'normal' },
        { name: 'Satoshi', data: satoshiBold,    weight: 700, style: 'normal' },
        { name: 'JetBrains Mono', data: jetbrainsMono, weight: 500, style: 'normal' },
      ],
    },
  );
}

function Bar({ label, score }: { label: string; score: number }) {
  const passing = score >= 80;
  const color = passing ? '#10B981' : '#F59E0B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ display: 'flex', width: '110px', fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flex: 1, height: '6px', borderRadius: '999px', background: '#E5E7EB' }}>
        <div style={{ display: 'flex', width: `${score}%`, height: '100%', borderRadius: '999px', background: color }} />
      </div>
      <div style={{ display: 'flex', width: '32px', justifyContent: 'flex-end', fontSize: '12px', fontWeight: 700, color: '#111827' }}>
        {score}
      </div>
    </div>
  );
}
