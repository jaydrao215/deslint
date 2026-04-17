import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

export type AgentOgConfig = {
  agent: string;
  tagline: string;
  subhead: string;
  accent: string;
  tools: string[];
};

export function renderAgentOg(config: AgentOgConfig): ImageResponse {
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
            <div
              style={{
                display: 'flex',
                marginLeft: '12px',
                padding: '6px 12px',
                borderRadius: '999px',
                border: `1px solid ${config.accent}55`,
                background: `${config.accent}22`,
                color: config.accent,
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}
            >
              MCP
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: '40px', fontSize: '58px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, color: '#FAFAFB' }}>
            Deslint for
          </div>
          <div style={{ display: 'flex', marginTop: '4px', fontSize: '72px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, color: config.accent }}>
            {config.agent}
          </div>

          <div style={{ display: 'flex', marginTop: '24px', fontSize: '22px', lineHeight: 1.45, color: 'rgba(250,250,251,0.8)', maxWidth: '560px' }}>
            {config.tagline}
          </div>

          <div style={{ display: 'flex', marginTop: '28px', flexWrap: 'wrap', gap: '10px' }}>
            {config.tools.map((tool) => (
              <div
                key={tool}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '7px 13px',
                  borderRadius: '999px',
                  border: '1px solid rgba(194, 188, 233, 0.35)',
                  background: 'rgba(123, 109, 199, 0.15)',
                  color: '#DDDAF5',
                  fontSize: '16px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}
              >
                {tool}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            background: '#FAFAFB',
            borderRadius: '20px',
            padding: '30px 32px',
            color: '#111827',
            boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', color: '#6B7280' }}>
              MCP TOOLCALL
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#D1FAE5',
                color: '#065F46',
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <div style={{ display: 'flex', width: '9px', height: '9px', borderRadius: '999px', background: '#10B981' }} />
              OK
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: '20px', fontSize: '17px', color: '#6B7280', fontFamily: 'monospace' }}>
            {config.agent} → deslint
          </div>
          <div style={{ display: 'flex', marginTop: '6px', fontSize: '26px', fontWeight: 700, color: '#111827', fontFamily: 'monospace', letterSpacing: '-0.01em' }}>
            analyze_project()
          </div>

          <div style={{ display: 'flex', marginTop: '22px', height: '1px', background: '#E5E7EB' }} />

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '18px', gap: '10px' }}>
            <Row label="Colors" score={100} color="#10B981" />
            <Row label="Spacing" score={96} color="#10B981" />
            <Row label="Typography" score={88} color="#10B981" />
            <Row label="Responsive" score={80} color="#F59E0B" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '22px' }}>
            <div style={{ display: 'flex', fontSize: '13px', color: '#6B7280', letterSpacing: '0.1em', fontWeight: 700 }}>
              TOKEN DRIFT SCORE
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '2px' }}>
            <div style={{ display: 'flex', fontSize: '60px', fontWeight: 800, letterSpacing: '-0.04em', color: '#10B981', lineHeight: 1 }}>
              91
            </div>
            <div style={{ display: 'flex', marginLeft: '6px', fontSize: '18px', color: '#9CA3AF' }}>
              /100
            </div>
            <div style={{ display: 'flex', marginLeft: '14px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
              Grade A
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 'auto', fontSize: '14px', color: '#6B7280' }}>
            <span style={{ display: 'flex', fontFamily: 'monospace' }}>{config.subhead}</span>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}

function Row({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', width: '110px', fontSize: '14px', fontWeight: 600, color: '#4B5563' }}>
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          flex: 1,
          height: '8px',
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
      <div style={{ display: 'flex', width: '36px', justifyContent: 'flex-end', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
        {score}
      </div>
    </div>
  );
}
