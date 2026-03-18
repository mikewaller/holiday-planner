'use client';

import { Suspense, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { format, parseISO, addDays } from 'date-fns';
import Nav from '@/components/Nav';

function DestinationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const mode = searchParams.get('mode') ?? 'known';
  const start = searchParams.get('start') ?? '';
  const nights = Number(searchParams.get('nights') ?? 1);

  const [destination, setDestination] = useState('');

  const isKnown = mode === 'known';
  const bookParams = `start=${start}&nights=${nights}`;

  const startDate = start ? parseISO(start) : null;
  const endDate = startDate ? addDays(startDate, nights - 1) : null;

  // Booking.com deep-link with pre-filled dates and destination
  const checkin = startDate ? format(startDate, 'yyyy-MM-dd') : '';
  const checkout = endDate ? format(addDays(endDate, 1), 'yyyy-MM-dd') : '';
  const bookingUrl = destination.trim()
    ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination.trim())}&checkin=${checkin}&checkout=${checkout}&group_adults=2&no_rooms=1`
    : null;

  if (!isKnown) {
    return (
      <main className="dot-bg min-h-screen flex items-center justify-center p-4 py-12">
        <Nav />
        <div className="w-full max-w-md">
          <div className="fade-up fade-up-1 text-center mb-8">
            <a href={`/plan/${planId}/book?${bookParams}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
              style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
              <span style={{ fontSize: '0.7rem' }}>✈️</span>
              <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>← Back</span>
            </a>
            <div className="text-5xl mb-4">🧭</div>
            <h1 className="font-display font-bold" style={{ fontSize: '2.2rem', lineHeight: 1.1, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
              Let&apos;s find your destination
            </h1>
            {startDate && endDate && (
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-coral)' }}>
                {format(startDate, 'd MMM')} – {format(endDate, 'd MMM yyyy')} · {nights} night{nights !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="fade-up fade-up-2 card p-8 text-center" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.08)' }}>
            <p className="font-display font-bold text-xl mb-2" style={{ color: 'var(--color-ink)' }}>Coming soon</p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              An interactive flight map showing prices and weather — we&apos;re building it now.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dot-bg min-h-screen p-4 py-12">
      <Nav />
      <div className="w-full max-w-lg mx-auto">

        <div className="fade-up fade-up-1 text-center mb-8">
          <a href={`/plan/${planId}/book?${bookParams}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
            <span style={{ fontSize: '0.7rem' }}>✈️</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>← Back</span>
          </a>

          <div className="text-5xl mb-4">🗺️</div>
          <h1 className="font-display font-bold" style={{ fontSize: '2.2rem', lineHeight: 1.1, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Where are you headed?
          </h1>
          {startDate && endDate && (
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-coral)' }}>
              {format(startDate, 'd MMM')} – {format(endDate, 'd MMM yyyy')} · {nights} night{nights !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Destination search */}
        <div className="fade-up fade-up-2 card p-6" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.08)' }}>
          <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>
            Destination
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Barcelona, Lisbon, Tokyo…"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && bookingUrl) window.open(bookingUrl, '_blank'); }}
              className="field-input flex-1"
            />
            <a
              href={bookingUrl ?? '#'}
              onClick={e => { if (!bookingUrl) e.preventDefault(); }}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 rounded-xl font-display font-semibold text-white transition-all duration-150 flex items-center"
              style={{
                background: bookingUrl ? 'var(--color-coral)' : 'var(--color-border)',
                boxShadow: bookingUrl ? '0 3px 10px rgba(244,98,31,0.3)' : 'none',
                textDecoration: 'none',
                cursor: bookingUrl ? 'pointer' : 'default',
                opacity: bookingUrl ? 1 : 0.5,
              }}
            >
              Search →
            </a>
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--color-faint)' }}>
            Your dates ({checkin} → {checkout}) will be pre-filled on Booking.com.
          </p>
        </div>

        {/* Booking.com branding note */}
        {bookingUrl && (
          <div className="fade-up fade-up-3 mt-4 text-center">
            <p className="text-xs" style={{ color: 'var(--color-faint)' }}>
              Opens Booking.com in a new tab · results for <span className="font-semibold">{destination}</span>
            </p>
          </div>
        )}

      </div>
    </main>
  );
}

export default function DestinationPage() {
  return (
    <Suspense fallback={
      <main className="dot-bg min-h-screen flex items-center justify-center">
        <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-muted)' }}>Loading…</p>
      </main>
    }>
      <DestinationContent />
    </Suspense>
  );
}
