import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';
import sql from '@/lib/db';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface PlanRow {
  name: string;
  window_start: string;
  window_end: string;
  min_duration: number;
  max_duration: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function loadFont(): ArrayBuffer {
  return readFileSync(join(process.cwd(), 'app/fonts/Fraunces-Bold.ttf')).buffer as ArrayBuffer;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan] = await sql<PlanRow[]>`SELECT name, window_start, window_end, min_duration, max_duration FROM plans WHERE id = ${id}`;

  const fontData = loadFont();
  const fonts = [{ name: 'Fraunces', data: fontData, weight: 700 as const }];

  const tripName = plan?.name ?? 'Trip Plan';
  const dateRange = plan
    ? `${formatDate(plan.window_start)} – ${formatDate(plan.window_end)}`
    : '';
  const nights = plan
    ? plan.min_duration === plan.max_duration
      ? `${plan.min_duration} nights`
      : `${plan.min_duration}–${plan.max_duration} nights`
    : '';

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
        {/* Decorative coral blobs */}
        <div style={{
          position: 'absolute', right: -80, top: -80,
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'rgba(244,98,31,0.12)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', right: 60, top: -20,
          width: 220, height: 220,
          borderRadius: '50%',
          background: 'rgba(244,98,31,0.18)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', left: -60, bottom: -60,
          width: 280, height: 280,
          borderRadius: '50%',
          background: 'rgba(244,98,31,0.07)',
          display: 'flex',
        }} />

        {/* Left content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          flex: 1,
        }}>
          {/* Top: branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>✈️</span>
            <span style={{
              fontSize: 16,
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
              color: '#F4621F',
              letterSpacing: 2,
            }}>
              HATCH A PLAN
            </span>
          </div>

          {/* Middle: trip name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{
              fontSize: tripName.length > 20 ? 68 : 84,
              fontWeight: 700,
              color: '#2C1F14',
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 700,
            }}>
              {tripName}
            </div>
          </div>

          {/* Bottom: dates + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {dateRange && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{
                  fontSize: 26,
                  color: '#6B4C35',
                  fontFamily: 'Georgia, serif',
                  fontWeight: 400,
                }}>
                  {dateRange}
                </span>
                {nights && (
                  <span style={{ color: '#C4A898', fontSize: 22, fontFamily: 'Georgia, serif', display: 'flex', gap: 12 }}>
                    · {nights}
                  </span>
                )}
              </div>
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#F4621F',
              color: '#fff',
              borderRadius: 14,
              padding: '12px 24px',
              alignSelf: 'flex-start',
              fontSize: 20,
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
            }}>
              Mark your availability →
            </div>
          </div>
        </div>

        {/* Right: large decorative plane */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 300,
          flexShrink: 0,
          paddingRight: 40,
        }}>
          <svg width="180" height="180" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M22 2L2 9L11 13L15 22L22 2Z"
              fill="#F4621F"
              opacity="0.9"
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
