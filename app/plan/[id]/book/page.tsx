'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { format, parseISO, addDays, eachDayOfInterval } from 'date-fns';

interface Participant { id: string; name: string; }
interface Availability { participant_id: string; date: string; status: string; }
interface Plan { id: string; name: string; }

function BookContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const start = searchParams.get('start') ?? '';
  const nights = Number(searchParams.get('nights') ?? 1);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);

  useEffect(() => {
    fetch(`/api/plans/${planId}`).then(r => r.json()).then(data => {
      setPlan(data.plan);
      setParticipants(data.participants);
      setAvailability(data.availability);
    });
  }, [planId]);

  if (!plan || !start) return (
    <main className="dot-bg min-h-screen flex items-center justify-center">
      <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-muted)' }}>Loading…</p>
    </main>
  );

  const startDate = parseISO(start);
  const endDate = addDays(startDate, nights - 1);
  const rangeDates = eachDayOfInterval({ start: startDate, end: endDate }).map(d => format(d, 'yyyy-MM-dd'));

  // Who can go: participants with no cant_do on any date in the range
  const whoCanGo = participants.filter(p =>
    !rangeDates.some(date =>
      availability.find(a => a.participant_id === p.id && a.date === date)?.status === 'cant_do'
    )
  );

  const nightsLabel = `${nights} night${nights !== 1 ? 's' : ''}`;
  const bookParams = `start=${start}&nights=${nights}`;

  return (
    <main className="dot-bg min-h-screen p-4 pb-16">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="fade-up fade-up-1 pt-8 pb-2">
          <a href={`/plan/${planId}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
            <span style={{ fontSize: '0.7rem' }}>✈️</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>← Back to plan</span>
          </a>
          <h1 className="font-display font-bold" style={{ fontSize: '2rem', lineHeight: 1.1, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            {plan.name}
          </h1>
          <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-coral)' }}>
            {format(startDate, 'd MMM')} – {format(endDate, 'd MMM yyyy')} · {nightsLabel}
          </p>
        </div>

        {/* Who can go */}
        <div className="fade-up fade-up-2 card px-5 py-5 mt-5">
          <h2 className="font-display font-bold text-lg mb-3" style={{ color: 'var(--color-ink)' }}>
            Who can make it 🙌
          </h2>
          <div className="flex flex-wrap gap-2">
            {whoCanGo.map(p => (
              <span key={p.id}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium"
                style={{ background: 'var(--color-preferred-bg)', color: '#065F46', border: '1.5px solid rgba(5,150,105,0.2)' }}>
                <span style={{ fontSize: '0.7rem' }}>✓</span> {p.name}
              </span>
            ))}
            {whoCanGo.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No one available for these dates.</p>
            )}
          </div>
        </div>

        {/* What's next */}
        <div className="fade-up fade-up-3 mt-5">
          <p className="label-tag mb-3 text-center" style={{ color: 'var(--color-faint)' }}>What would you like to do next?</p>
          <div className="space-y-3">

            <a href={`/plan/${planId}/destination?${bookParams}&mode=known`}
              className="block card px-6 py-5 transition-all duration-150"
              style={{ textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(44,31,20,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl flex-shrink-0">🗺️</div>
                <div className="flex-1">
                  <p className="font-display font-bold text-lg" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
                    We know where we want to go
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    Search flights and accommodation for your chosen destination
                  </p>
                </div>
                <span style={{ color: 'var(--color-faint)', fontSize: '1.3rem' }}>›</span>
              </div>
            </a>

            <a href={`/plan/${planId}/destination?${bookParams}&mode=discover`}
              className="block card px-6 py-5 transition-all duration-150"
              style={{ textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(44,31,20,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl flex-shrink-0">🧭</div>
                <div className="flex-1">
                  <p className="font-display font-bold text-lg" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
                    Help us find our perfect destination
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    Answer a few questions and we&apos;ll suggest destinations everyone will love
                  </p>
                </div>
                <span style={{ color: 'var(--color-faint)', fontSize: '1.3rem' }}>›</span>
              </div>
            </a>

          </div>
        </div>

      </div>
    </main>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <main className="dot-bg min-h-screen flex items-center justify-center">
        <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-muted)' }}>Loading…</p>
      </main>
    }>
      <BookContent />
    </Suspense>
  );
}
