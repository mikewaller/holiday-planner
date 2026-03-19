import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function loadFont(): ArrayBuffer {
  return readFileSync(join(process.cwd(), 'app/fonts/Fraunces-Bold.ttf')).buffer as ArrayBuffer;
}

export default async function Image() {
  const fontData = loadFont();
  const fonts = [{ name: 'Fraunces', data: fontData, weight: 700 as const }];
  const displayFont = 'Fraunces, Georgia, serif';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FDF8F4',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', right: -100, top: -100, width: 500, height: 500, borderRadius: '50%', background: 'rgba(244,98,31,0.10)', display: 'flex' }} />
        <div style={{ position: 'absolute', right: 80, top: 0, width: 260, height: 260, borderRadius: '50%', background: 'rgba(244,98,31,0.16)', display: 'flex' }} />
        <div style={{ position: 'absolute', left: -80, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(244,98,31,0.07)', display: 'flex' }} />

        {/* Main content */}
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
            <span style={{ fontSize: 17, fontFamily: displayFont, fontWeight: 700, color: '#F4621F', letterSpacing: 2 }}>
              HATCH A PLAN
            </span>
          </div>

          {/* Hero text — no <br />, use flex column instead */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <span style={{ fontSize: 96, fontWeight: 700, color: '#2C1F14', lineHeight: 1.0, letterSpacing: -2, fontFamily: displayFont }}>
                Time to hatch
              </span>
              <span style={{ fontSize: 96, fontWeight: 700, color: '#F4621F', lineHeight: 1.0, letterSpacing: -2, fontFamily: displayFont }}>
                a plan.
              </span>
            </div>
            <div style={{ fontSize: 28, color: '#8C6D5B', fontFamily: 'Georgia, serif', fontWeight: 400, maxWidth: 600 }}>
              Find dates that work for everyone. Share a link. No fuss.
            </div>
          </div>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ background: 'rgba(244,98,31,0.10)', border: '1.5px solid rgba(244,98,31,0.20)', borderRadius: 100, padding: '8px 20px', fontSize: 18, color: '#F4621F', fontFamily: 'Georgia, serif', display: 'flex' }}>
              No sign-up needed
            </div>
            <div style={{ background: 'rgba(244,98,31,0.10)', border: '1.5px solid rgba(244,98,31,0.20)', borderRadius: 100, padding: '8px 20px', fontSize: 18, color: '#F4621F', fontFamily: 'Georgia, serif', display: 'flex' }}>
              Share a link
            </div>
            <div style={{ background: 'rgba(244,98,31,0.10)', border: '1.5px solid rgba(244,98,31,0.20)', borderRadius: 100, padding: '8px 20px', fontSize: 18, color: '#F4621F', fontFamily: 'Georgia, serif', display: 'flex' }}>
              Find the best dates
            </div>
          </div>
        </div>

        {/* Right decorative plane */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 280, flexShrink: 0, paddingRight: 48 }}>
          <svg width="200" height="200" viewBox="0 0 24 24" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M22 2L2 9L11 13L15 22L22 2Z" fill="#F4621F" opacity="0.85" />
            <path d="M11 13L22 2" stroke="#FDF8F4" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
