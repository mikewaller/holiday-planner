'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { format, parseISO, addDays } from 'date-fns';

function DestinationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const mode = searchParams.get('mode') ?? 'known';
  const start = searchParams.get('start') ?? '';
  const nights = Number(searchParams.get('nights') ?? 1);

  const isKnown = mode === 'known';
  const bookParams = `start=${start}&nights=${nights}`;

  const startDate = start ? parseISO(start) : null;
  const endDate = startDate ? addDays(startDate, nights - 1) : null;

  return (
    <main className="dot-bg min-h-screen flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">

        <div className="fade-up fade-up-1 text-center mb-8">
          <a href={`/plan/${planId}/book?${bookParams}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
            <span style={{ fontSize: '0.7rem' }}>✈️</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>← Back</span>
          </a>

          <div className="text-5xl mb-4">{isKnown ? '🗺️' : '🧭'}</div>

          <h1 className="font-display font-bold" style={{ fontSize: '2.2rem', lineHeight: 1.1, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            {isKnown ? 'Where are you headed?' : 'Let\'s find your destination'}
          </h1>

          {startDate && endDate && (
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-coral)' }}>
              {format(startDate, 'd MMM')} – {format(endDate, 'd MMM yyyy')} · {nights} night{nights !== 1 ? 's' : ''}
            </p>
          )}

          <p className="mt-4 text-base" style={{ color: 'var(--color-muted)' }}>
            This feature is coming soon. 🚀
          </p>
        </div>

        <div className="fade-up fade-up-2 card p-8 text-center" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.08)' }}>
          <p className="font-display font-bold text-xl mb-2" style={{ color: 'var(--color-ink)' }}>
            {isKnown ? 'Enter your destination' : 'Tell us what you\'re looking for'}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            We&apos;re building this part now. Check back soon!
          </p>
        </div>

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
