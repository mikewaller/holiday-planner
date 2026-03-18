'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { format, parseISO, addDays } from 'date-fns';
import Nav from '@/components/Nav';

interface Participant { id: string; name: string; }
interface Availability { participant_id: string; date: string; status: string; }
interface Plan { id: string; name: string; }

function ItineraryContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const start = searchParams.get('start') ?? '';
  const nights = Number(searchParams.get('nights') ?? 1);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [copied, setCopied] = useState(false);

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
  const rangeDates = Array.from({ length: nights }, (_, i) =>
    format(addDays(startDate, i), 'yyyy-MM-dd')
  );

  const whoCanGo = participants.filter(p =>
    !rangeDates.some(date =>
      availability.find(a => a.participant_id === p.id && a.date === date)?.status === 'cant_do'
    )
  );

  const bookParams = `start=${start}&nights=${nights}`;

  // Google Calendar URL (end date is exclusive = day after last night)
  const gcalEnd = format(addDays(endDate, 1), 'yyyyMMdd');
  const gcalStart = format(startDate, 'yyyyMMdd');
  const gcalDetails = whoCanGo.length > 0
    ? `Going with: ${whoCanGo.map(p => p.name).join(', ')}`
    : 'Trip dates';
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(plan.name)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(gcalDetails)}`;

  function downloadIcs() {
    if (!plan) return;
    const icsEnd = format(addDays(endDate, 1), 'yyyyMMdd');
    const icsStart = format(startDate, 'yyyyMMdd');
    const description = whoCanGo.length > 0
      ? `Going with: ${whoCanGo.map(p => p.name).join(', ')}`
      : '';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hatch a Plan//EN',
      'BEGIN:VEVENT',
      `UID:${planId}-${start}@hatch-a-plan`,
      `DTSTART;VALUE=DATE:${icsStart}`,
      `DTEND;VALUE=DATE:${icsEnd}`,
      `SUMMARY:${plan.name}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.name.replace(/\s+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/plan/${planId}/itinerary?${bookParams}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="dot-bg min-h-screen p-4 pb-16">
      <Nav />
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="fade-up fade-up-1 pt-8 pb-2">
          <a href={`/plan/${planId}/book?${bookParams}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
            <span style={{ fontSize: '0.7rem' }}>✈️</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>← Back</span>
          </a>

          <div className="text-4xl mb-3">🗓️</div>
          <h1 className="font-display font-bold" style={{ fontSize: '2rem', lineHeight: 1.1, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            {plan.name}
          </h1>
          <p className="mt-2 text-base font-semibold" style={{ color: 'var(--color-coral)' }}>
            {format(startDate, 'd MMM')} – {format(endDate, 'd MMM yyyy')} · {nights} night{nights !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Who can make it */}
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

        {/* Add to calendar */}
        <div className="fade-up fade-up-3 card px-5 py-5 mt-4">
          <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--color-ink)' }}>
            Add to calendar
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            Save these dates straight to your calendar app.
          </p>
          <div className="space-y-3">
            <a
              href={gcalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-150"
              style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border-mid)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border)'; }}
            >
              <span style={{ fontSize: '1.25rem' }}>📅</span>
              <span className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>Google Calendar</span>
              <span className="ml-auto label-tag" style={{ color: 'var(--color-faint)', fontSize: '0.6rem' }}>Opens in new tab ↗</span>
            </a>

            <button
              onClick={downloadIcs}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-150"
              style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', textAlign: 'left' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-mid)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; }}
            >
              <span style={{ fontSize: '1.25rem' }}>📥</span>
              <span className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>Apple / Outlook / other</span>
              <span className="ml-auto label-tag" style={{ color: 'var(--color-faint)', fontSize: '0.6rem' }}>Download .ics</span>
            </button>
          </div>
        </div>

        {/* Share this page */}
        <div className="fade-up fade-up-4 mt-4">
          <p className="text-sm text-center mb-2.5" style={{ color: 'var(--color-muted)' }}>
            Share this itinerary so your friends can save the dates to their own calendars.
          </p>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl label-tag transition-all duration-150"
            style={{
              background: copied ? '#ECFDF5' : 'var(--color-surface)',
              border: `1.5px solid ${copied ? 'rgba(5,150,105,0.3)' : 'var(--color-border)'}`,
              color: copied ? '#065F46' : 'var(--color-muted)',
            }}
          >
            {copied ? '✓ Copied!' : '🔗 Copy link'}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${plan.name} — ${format(startDate, 'd MMM')}–${format(endDate, 'd MMM yyyy')} · ${nights} night${nights !== 1 ? 's' : ''}\n\nView itinerary: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl label-tag transition-all duration-150"
            style={{ background: '#25D366', color: '#fff', textDecoration: 'none', border: '1.5px solid transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
        </div>
        </div>

        {/* What's next */}
        <div className="fade-up fade-up-5 mt-5">
          <p className="label-tag mb-3 text-center" style={{ color: 'var(--color-faint)' }}>Ready to plan the trip?</p>
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
                  <p className="font-display font-bold text-lg" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>We know where we want to go</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Search flights and accommodation for your chosen destination</p>
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
                  <p className="font-display font-bold text-lg" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>Help us find our perfect destination</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Answer a few questions and we&apos;ll suggest destinations everyone will love</p>
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

export default function ItineraryPage() {
  return (
    <Suspense fallback={
      <main className="dot-bg min-h-screen flex items-center justify-center">
        <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-muted)' }}>Loading…</p>
      </main>
    }>
      <ItineraryContent />
    </Suspense>
  );
}
