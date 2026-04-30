import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt =
  'Deslint Blog — long-form writing on design systems, AI coding agents, and deterministic lint. Tailwind drift, MCP, and the verification layer for AI-generated code.';

// Blog hub OG. Visual story: brand on the left, three mini post-card
// previews stacked on the right. Reuses the gradient background and
// monospace command pill from the launch-check OG so the brand reads
// consistently across share previews.
export default async function BlogOpenGraphImage() {
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
          padding: '60px 64px',
          background: 'linear-gradient(135deg, #0B0A18 0%, #161434 46%, #1E1A3F 100%)',
          color: '#FAFAFB',
          fontFamily: 'Satoshi',
        }}
      >
        {/* Left — pitch */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '600px', paddingRight: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <svg width="48" height="48" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="6.66" fill="#534AB7" />
              <rect x="4.48" y="4.32" width="23.04" height="23.68" rx="3.01" fill="#ffffff" opacity="0.07" />
              <rect x="7.33" y="8.64" width="10.66" height="1.66" rx="0.83" fill="#ffffff" opacity="0.5" />
              <rect x="7.33" y="12.64" width="14.66" height="1.66" rx="0.83" fill="#ffffff" opacity="0.85" />
              <rect x="7.33" y="16.64" width="8" height="1.66" rx="0.83" fill="#1D9E75" />
              <circle cx="24" cy="17.47" r="2.34" fill="#1D9E75" />
              <path d="M22.95 17.47 L23.88 18.64 L25.22 16.18" fill="none" stroke="#ffffff" strokeWidth="0.61" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display: 'flex', fontSize: '34px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
              <span style={{ color: '#FAFAFB' }}>des</span>
              <span style={{ color: '#9B91D4' }}>lint</span>
              <span style={{ color: 'rgba(250,250,251,0.55)', marginLeft: '14px' }}>· blog</span>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: '36px', fontSize: '60px', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.04, color: '#FAFAFB' }}>
            Design systems
          </div>
          <div style={{ display: 'flex', marginTop: '4px', fontSize: '60px', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.04, color: '#9B91D4' }}>
            in the AI coding era.
          </div>

          <div style={{ display: 'flex', marginTop: '26px', fontSize: '20px', lineHeight: 1.5, color: 'rgba(250,250,251,0.65)', maxWidth: '540px' }}>
            Long-form writing on token drift, Tailwind escape hatches, MCP, and deterministic lint for code your AI just wrote.
          </div>

          <div style={{ display: 'flex', marginTop: 'auto', fontFamily: 'JetBrains Mono', fontSize: '14px', color: 'rgba(250,250,251,0.55)' }}>
            deslint.com/blog
          </div>
        </div>

        {/* Right — three mini post-card previews stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '14px', justifyContent: 'center' }}>
          <PostCard
            tag="Tailwind · Migration"
            title="Tailwind v4 ESLint migration: a deterministic upgrade guide"
          />
          <PostCard
            tag="AI coding · Design systems"
            title="How to fix design drift in AI-generated code"
          />
          <PostCard
            tag="Tailwind · Design tokens"
            title="The hidden cost of Tailwind arbitrary values"
          />
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

function PostCard({ tag, title }: { tag: string; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#FAFAFB',
        borderRadius: '12px',
        padding: '18px 22px',
        color: '#111827',
        boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
      }}
    >
      <div style={{ display: 'flex', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: '#534AB7', textTransform: 'uppercase' }}>
        {tag}
      </div>
      <div style={{ display: 'flex', marginTop: '8px', fontSize: '20px', fontWeight: 700, lineHeight: 1.25, color: '#111827' }}>
        {title}
      </div>
    </div>
  );
}
