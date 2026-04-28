import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Is your AI-built app ready to ship? Free Deslint launch check — design-token drift, responsive, accessibility, dark mode, and frontend-safety basics in one command.';

// Companion to the root /opengraph-image.tsx but tuned for the indie /
// vibe-coding audience. The root OG sells the verification-layer angle to
// engineering teams; this one frames the same engine as a "is my AI-built
// app ready to ship?" check for solo developers shipping with Cursor /
// Claude Code / Codex / Windsurf — the audience who actually shares pre-
// launch screenshots on X.
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
          width: '100%',
          height: '100%',
          padding: '56px 64px',
          background:
            'linear-gradient(135deg, #0B0A18 0%, #161434 46%, #1E1A3F 100%)',
          color: '#FAFAFB',
          fontFamily: 'Satoshi',
        }}
      >
        {/* Left — pitch */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '600px',
            paddingRight: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg width="48" height="48" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
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
            <div style={{ display: 'flex', fontSize: '34px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
              <span style={{ color: '#FAFAFB' }}>des</span>
              <span style={{ color: '#9B91D4' }}>lint</span>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: '28px', alignItems: 'center', gap: '10px', background: 'rgba(123, 109, 199, 0.18)', border: '1px solid rgba(194, 188, 233, 0.35)', padding: '7px 14px', borderRadius: '999px', fontSize: '15px', fontWeight: 700, color: '#DDDAF5', letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'flex-start' }}>
            Free · No install · Local
          </div>

          <div style={{ display: 'flex', marginTop: '24px', fontSize: '54px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.04, color: '#FAFAFB' }}>
            Is your AI-built app
          </div>
          <div style={{ display: 'flex', marginTop: '4px', fontSize: '54px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.04, color: '#C2BCE9' }}>
            ready to ship?
          </div>

          <div style={{ display: 'flex', marginTop: '24px', alignItems: 'center', gap: '14px', background: '#0B0A18', padding: '16px 22px', borderRadius: '12px', border: '1px solid rgba(155, 145, 212, 0.25)' }}>
            <span style={{ display: 'flex', color: '#6B7280', fontFamily: 'JetBrains Mono', fontSize: '20px' }}>$</span>
            <span style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: '20px', color: '#FAFAFB' }}>
              <span style={{ color: '#1D9E75' }}>npx</span>
              <span style={{ color: '#FAFAFB', marginLeft: '8px', fontWeight: 600 }}>deslint</span>
              <span style={{ color: '#C2BCE9', marginLeft: '8px' }}>launch-check</span>
            </span>
          </div>

          <div style={{ display: 'flex', marginTop: '20px', fontSize: '17px', lineHeight: 1.45, color: 'rgba(250,250,251,0.65)', maxWidth: '520px' }}>
            QA every AI-generated frontend in one command — token drift, responsive, accessibility, dark mode, and the safety basics.
          </div>
        </div>

        {/* Right — score card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            background: '#FAFAFB',
            borderRadius: '20px',
            padding: '26px 28px',
            color: '#111827',
            boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', color: '#6B7280' }}>
              FRONTEND LAUNCH READINESS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF3C7', color: '#92400E', padding: '5px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 700 }}>
              <div style={{ display: 'flex', width: '9px', height: '9px', borderRadius: '999px', background: '#F59E0B' }} />
              REVIEW
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '14px' }}>
            <div style={{ display: 'flex', fontSize: '88px', fontWeight: 800, letterSpacing: '-0.04em', color: '#F59E0B', lineHeight: 1 }}>
              73
            </div>
            <div style={{ display: 'flex', marginLeft: '8px', fontSize: '22px', color: '#9CA3AF' }}>
              /100
            </div>
            <div style={{ display: 'flex', marginLeft: '14px', fontSize: '15px', fontWeight: 600, color: '#4B5563' }}>
              17 fixes
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '18px', gap: '10px' }}>
            <Stat label="Colors"       score={100} color="#10B981" />
            <Stat label="Spacing"      score={56}  color="#F59E0B" violations={8} />
            <Stat label="Typography"   score={80}  color="#10B981" violations={3} />
            <Stat label="Responsive"   score={62}  color="#F59E0B" violations={5} />
            <Stat label="Consistency"  score={95}  color="#10B981" violations={1} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', fontSize: '14px', color: '#4B5563' }}>
            <span style={{ display: 'flex', fontFamily: 'JetBrains Mono', background: '#F4F4F5', padding: '4px 10px', borderRadius: '6px', color: '#111827', fontSize: '13px' }}>
              deslint.com/launch-check
            </span>
            <span style={{ display: 'flex', color: '#6B7280' }}>· Sample report</span>
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

function Stat({ label, score, color, violations }: { label: string; score: number; color: string; violations?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ display: 'flex', width: '120px', fontSize: '15px', fontWeight: 600, color: '#4B5563' }}>
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
      <div style={{ display: 'flex', width: '64px', justifyContent: 'flex-end', fontSize: '15px', fontWeight: 700, color: '#111827' }}>
        {score}
        {violations !== undefined ? (
          <span style={{ display: 'flex', marginLeft: '6px', color: '#9CA3AF', fontWeight: 500 }}>
            ·{violations}
          </span>
        ) : null}
      </div>
    </div>
  );
}
