import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadFont() {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' } }
    ).then(r => r.text());
    const match = css.match(/src: url\(([^)]+)\) format\('woff2'\)/);
    if (!match) return null;
    return fetch(match[1]).then(r => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function Image() {
  const fontData = await loadFont();
  const fonts = fontData ? [{ name: 'Fraunces', data: fontData, weight: 700 as const }] : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FDF8F4',
          display: 'flex',
          fontFamily: fontData ? 'Fraunces, serif' : 'Georgia, serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', right: -100, top: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: 'rgba(244,98,31,0.10)', display: 'flex',
        }} />
        <div style={{
          position: 'absolute', right: 80, top: 0,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(244,98,31,0.16)', display: 'flex',
        }} />
        <div style={{
          position: 'absolute', left: -80, bottom: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(244,98,31,0.07)', display: 'flex',
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          flex: 1,
        }}>
          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>✈️</span>
            <span style={{
              fontSize: 16,
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
              color: '#F4621F',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Hatch a Plan
            </span>
          </div>

          {/* Hero text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              fontSize: 96,
              fontWeight: 700,
              color: '#2C1F14',
              lineHeight: 1.0,
              letterSpacing: '-0.02em',
            }}>
              Time to hatch<br />
              <span style={{ color: '#F4621F' }}>a plan.</span>
            </div>
            <div style={{
              fontSize: 28,
              color: '#8C6D5B',
              fontFamily: 'Georgia, serif',
              fontWeight: 400,
              maxWidth: 600,
            }}>
              Find dates that work for everyone. Share a link. No fuss.
            </div>
          </div>

          {/* Tagline pills */}
          <div style={{ display: 'flex', gap: 12 }}>
            {['No sign-up needed', 'Share a link', 'Find the best dates'].map(tag => (
              <div key={tag} style={{
                background: 'rgba(244,98,31,0.10)',
                border: '1.5px solid rgba(244,98,31,0.20)',
                borderRadius: 100,
                padding: '8px 20px',
                fontSize: 18,
                color: '#F4621F',
                fontFamily: 'Georgia, serif',
              }}>
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Right decorative plane */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 280,
          flexShrink: 0,
          paddingRight: 48,
        }}>
          <svg width="200" height="200" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M22 2L2 9L11 13L15 22L22 2Z"
              fill="#F4621F"
              opacity="0.85"
            />
            <path
              d="M11 13L22 2"
              stroke="#FDF8F4"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
