import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #08070f 0%, #121126 45%, #191736 100%)',
          color: '#ffffff',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 20%, rgba(83, 74, 183, 0.40), transparent 26%), radial-gradient(circle at 82% 20%, rgba(17, 185, 129, 0.22), transparent 18%), radial-gradient(circle at 70% 82%, rgba(123, 109, 199, 0.24), transparent 24%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.18,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.35) 76%, transparent)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            width: '100%',
            height: '100%',
            padding: '60px',
            gap: '48px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              maxWidth: '560px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                width: 'fit-content',
                borderRadius: '999px',
                border: '1px solid rgba(123, 109, 199, 0.38)',
                background: 'rgba(123, 109, 199, 0.12)',
                padding: '12px 18px',
                fontSize: '24px',
                fontWeight: 600,
                color: '#e9e7ff',
                marginBottom: '28px',
                boxShadow: '0 12px 40px rgba(83, 74, 183, 0.12)',
              }}
            >
              The deterministic design linter for AI-generated code
            </div>

            <div
              style={{
                fontSize: '74px',
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: '-0.05em',
                marginBottom: '22px',
              }}
            >
              AI writes fast.
              <br />
              <span
                style={{
                  background:
                    'linear-gradient(135deg, #8f83ff 0%, #c1bbff 50%, #f4f2ff 100%)',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Deslint keeps it clean.
              </span>
            </div>

            <div
              style={{
                fontSize: '28px',
                lineHeight: 1.45,
                color: 'rgba(255,255,255,0.76)',
                maxWidth: '520px',
                marginBottom: '28px',
              }}
            >
              Catch design drift, broken responsive layouts, and WCAG failures
              in AI-generated frontend code.
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                fontSize: '22px',
                color: 'rgba(255,255,255,0.66)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '999px',
                    background: '#10B981',
                  }}
                />
                Plugin
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '999px',
                    background: '#10B981',
                  }}
                />
                CLI
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '999px',
                    background: '#10B981',
                  }}
                />
                MCP
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '999px',
                    background: '#10B981',
                  }}
                />
                Action
              </span>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '8% 8% 14% 12%',
                borderRadius: '36px',
                background:
                  'linear-gradient(135deg, rgba(83, 74, 183, 0.18), rgba(17, 185, 129, 0.08))',
                filter: 'blur(24px)',
              }}
            />

            <div
              style={{
                width: '100%',
                maxWidth: '520px',
                borderRadius: '28px',
                background: 'rgba(255,255,255,0.96)',
                boxShadow: '0 28px 80px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                color: '#111827',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '18px 22px',
                  background: '#f3f4f6',
                  borderBottom: '1px solid rgba(17,24,39,0.08)',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '999px',
                      background: '#ff5f56',
                    }}
                  />
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '999px',
                      background: '#ffbd2e',
                    }}
                  />
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '999px',
                      background: '#27c93f',
                    }}
                  />
                </div>
                <div
                  style={{
                    flex: 1,
                    marginLeft: '12px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid rgba(17,24,39,0.08)',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: '#6b7280',
                    fontFamily: 'monospace',
                  }}
                >
                  deslint.com
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: '#534AB7',
                    marginBottom: '10px',
                  }}
                >
                  Design Quality Gate
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    marginBottom: '18px',
                  }}
                >
                  <StatLine label="Colors" value="100" fill="#10B981" />
                  <StatLine label="Typography" value="100" fill="#10B981" />
                  <StatLine label="Responsive" value="100" fill="#10B981" />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    borderRadius: '22px',
                    background:
                      'linear-gradient(135deg, rgba(83,74,183,0.10), rgba(83,74,183,0.04))',
                    border: '1px solid rgba(83,74,183,0.12)',
                    padding: '20px 22px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#111827',
                      }}
                    >
                      Hero section
                    </div>
                    <div style={{ fontSize: '16px', color: '#6b7280' }}>
                      The page-level visual people should see first.
                    </div>
                  </div>

                  <div
                    style={{
                      width: '92px',
                      height: '92px',
                      borderRadius: '999px',
                      background: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 18px 30px rgba(16,185,129,0.28)',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '18px',
                        borderLeft: '12px solid #ffffff',
                        borderBottom: '12px solid #ffffff',
                        transform: 'rotate(-45deg) translateY(-4px)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
    {
      ...size,
    }
  );
}

function StatLine({
  label,
  value,
  fill,
}: {
  label: string;
  value: string;
  fill: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: '120px', fontSize: '18px', fontWeight: 600, color: '#374151' }}>
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: '14px',
          borderRadius: '999px',
          background: '#e5e7eb',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '999px',
            background: fill,
          }}
        />
      </div>
      <div style={{ width: '44px', textAlign: 'right', fontSize: '18px', fontWeight: 800, color: '#111827' }}>
        {value}
      </div>
    </div>
  );
}
