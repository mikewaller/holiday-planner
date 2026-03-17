'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { addDays, format, parseISO, eachDayOfInterval } from 'date-fns';

type Status = 'free' | 'cant_do' | 'preferred';

interface Plan {
  id: string;
  name: string;
  window_start: string;
  window_end: string;
  min_duration: number;
  max_duration: number;
  is_locked: number;
}

interface Participant {
  id: string;
  name: string;
  participant_token: string;
}

interface Availability {
  participant_id: string;
  date: string;
  status: Status;
}

interface BestWindow {
  start: string;
  minNights: number;
  maxNights: number;
  score: number;
  preferredCount: number;
  freeCount: number;
  unansweredCount: number;
  cantDoCount: number;
}

const STATUS_CONFIG: Record<Status, { label: string; bg: string; dot: string; labelColor: string }> = {
  preferred: { label: 'Preferred',  bg: '#3D6B3A', dot: '#7DB86B', labelColor: '#7DB86B' },
  free:      { label: 'Free',       bg: '#2E5E6E', dot: '#6AAFC4', labelColor: '#6AAFC4' },
  cant_do:   { label: "Can't do",   bg: '#6E3030', dot: '#C47878', labelColor: '#C47878' },
};

export default function PlanPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const creatorToken = searchParams.get('creator');

  const [plan, setPlan] = useState<Plan | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [me, setMe] = useState<{ id: string; name: string; token: string } | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [joiningName, setJoiningName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);
  const [poppingDate, setPoppingDate] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    const res = await fetch(`/api/plans/${planId}`);
    if (!res.ok) return;
    const data = await res.json();
    setPlan(data.plan);
    setParticipants(data.participants);
    setAvailability(data.availability);
  }, [planId]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  useEffect(() => {
    const stored = localStorage.getItem(`participant_${planId}`);
    if (stored) setMe(JSON.parse(stored));
  }, [planId]);

  async function joinPlan() {
    if (!nameInput.trim()) return;
    setJoiningName(true);
    setNameError('');
    const storedToken = localStorage.getItem(`participant_token_${planId}_${nameInput.trim()}`);
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId, name: nameInput.trim(), participant_token: storedToken }),
    });
    if (res.status === 409) { setNameError('That name is already taken. Choose another.'); setJoiningName(false); return; }
    if (!res.ok) { setNameError('Something went wrong.'); setJoiningName(false); return; }
    const { participant_id, participant_token } = await res.json();
    const meData = { id: participant_id, name: nameInput.trim(), token: participant_token };
    setMe(meData);
    localStorage.setItem(`participant_${planId}`, JSON.stringify(meData));
    setJoiningName(false);
    fetchPlan();
  }

  async function toggleDate(date: string) {
    if (!me || plan?.is_locked) return;
    const current = availability.find(a => a.participant_id === me.id && a.date === date);
    const cycle: (Status | null)[] = ['free', 'preferred', 'cant_do', null];
    const currentIndex = current ? cycle.indexOf(current.status) : 3;
    const nextStatus = cycle[(currentIndex + 1) % cycle.length];
    setPoppingDate(date);
    setTimeout(() => setPoppingDate(null), 200);
    setAvailability(prev => {
      const filtered = prev.filter(a => !(a.participant_id === me.id && a.date === date));
      return nextStatus ? [...filtered, { participant_id: me.id, date, status: nextStatus }] : filtered;
    });
    await fetch('/api/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id: me.id, participant_token: me.token, plan_id: planId, date, status: nextStatus }),
    });
  }

  async function toggleLock() {
    if (!creatorToken || !plan) return;
    setActionLoading(true);
    await fetch(`/api/plans/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_token: creatorToken, is_locked: !plan.is_locked }),
    });
    await fetchPlan();
    setActionLoading(false);
  }

  async function deletePlan() {
    if (!creatorToken) return;
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    setActionLoading(true);
    await fetch(`/api/plans/${planId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_token: creatorToken }),
    });
    window.location.href = '/';
  }

  function copyShareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/plan/${planId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getBestWindows(): BestWindow[] {
    if (!plan || participants.length === 0) return [];
    const allDates = eachDayOfInterval({ start: parseISO(plan.window_start), end: parseISO(plan.window_end) });
    const windows: BestWindow[] = [];
    for (let i = 0; i <= allDates.length - plan.min_duration; i++) {
      let maxNights = 0;
      for (let duration = plan.min_duration; duration <= plan.max_duration; duration++) {
        if (i + duration > allDates.length) break;
        const lastDate = format(allDates[i + duration - 1], 'yyyy-MM-dd');
        const anyoneCantDoLastDay = participants.some(p =>
          availability.find(a => a.participant_id === p.id && a.date === lastDate)?.status === 'cant_do'
        );
        if (anyoneCantDoLastDay) break;
        maxNights = duration;
      }
      if (maxNights < plan.min_duration) continue;
      const windowDates = allDates.slice(i, i + maxNights).map(d => format(d, 'yyyy-MM-dd'));
      let preferredCount = 0, freeCount = 0, unansweredCount = 0, cantDoCount = 0;
      for (const participant of participants) {
        let pp = 0, pf = 0, pc = 0;
        for (const date of windowDates) {
          const entry = availability.find(a => a.participant_id === participant.id && a.date === date);
          if (entry?.status === 'preferred') pp++;
          else if (entry?.status === 'free') pf++;
          else if (entry?.status === 'cant_do') pc++;
        }
        if (pc > 0) cantDoCount++;
        else if (pp > 0) preferredCount++;
        else if (pf > 0) freeCount++;
        else unansweredCount++;
      }
      windows.push({
        start: format(allDates[i], 'yyyy-MM-dd'),
        minNights: plan.min_duration,
        maxNights,
        score: (preferredCount * 3) + (freeCount * 2) + (unansweredCount * 1) - (cantDoCount * 10),
        preferredCount, freeCount, unansweredCount, cantDoCount,
      });
    }
    return windows.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  if (!plan) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-ink)' }}>
        <div className="text-center">
          <p className="font-display italic" style={{ fontSize: '2rem', color: 'var(--color-muted)' }}>Loading…</p>
        </div>
      </main>
    );
  }

  const dates = eachDayOfInterval({ start: parseISO(plan.window_start), end: parseISO(plan.window_end) });
  const myAvailability = (date: string): Status | null =>
    availability.find(a => a.participant_id === me?.id && a.date === date)?.status ?? null;

  const getDateBreakdown = (date: string): Record<Status | 'no_answer', string[]> => {
    const result: Record<Status | 'no_answer', string[]> = { preferred: [], free: [], cant_do: [], no_answer: [] };
    for (const p of participants) {
      const entry = availability.find(a => a.participant_id === p.id && a.date === date);
      if (entry) result[entry.status].push(p.name);
      else result.no_answer.push(p.name);
    }
    return result;
  };

  const dateStats = (date: string) => {
    const entries = availability.filter(a => a.date === date);
    return {
      preferred: entries.filter(e => e.status === 'preferred').length,
      free: entries.filter(e => e.status === 'free').length,
      cant_do: entries.filter(e => e.status === 'cant_do').length,
    };
  };

  const bestWindows = getBestWindows();

  const months: { label: string; dates: string[] }[] = [];
  for (const date of dates) {
    const label = format(date, 'MMMM yyyy');
    const dateStr = format(date, 'yyyy-MM-dd');
    const last = months[months.length - 1];
    if (last && last.label === label) last.dates.push(dateStr);
    else months.push({ label, dates: [dateStr] });
  }

  const card = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
  };

  return (
    <main
      className="min-h-screen p-4 pb-16"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1A1610 0%, #0D0C0A 60%)' }}
    >
      <div className="max-w-xl mx-auto space-y-3">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="fade-up fade-up-1 pt-8 pb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="label-caps mb-2" style={{ color: 'var(--color-accent)' }}>Holiday Planner</p>
              <h1
                className="font-display italic"
                style={{ fontSize: '2.4rem', lineHeight: 1.1, fontWeight: 300, color: 'var(--color-cream)' }}
              >
                {plan.name}
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)', letterSpacing: '0.02em' }}>
                {format(parseISO(plan.window_start), 'd MMM')} – {format(parseISO(plan.window_end), 'd MMM yyyy')}
                <span style={{ color: 'var(--color-faint)', margin: '0 0.5em' }}>·</span>
                {plan.min_duration}–{plan.max_duration} nights
              </p>
              <div className="mt-3">
                {plan.is_locked ? (
                  <span className="label-caps" style={{ color: '#C4A44A' }}>⊗ Locked</span>
                ) : (
                  <span className="label-caps" style={{ color: 'var(--color-sage)' }}>◎ Open for responses</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={copyShareLink}
                className="label-caps px-3 py-2 transition-all duration-150"
                style={{
                  border: '1px solid var(--color-border-light)',
                  color: copied ? 'var(--color-sage)' : 'var(--color-muted)',
                  borderRadius: '2px',
                }}
              >
                {copied ? '✓ Copied' : 'Share link'}
              </button>
              {creatorToken && (
                <>
                  <button
                    onClick={toggleLock}
                    disabled={actionLoading}
                    className="label-caps px-3 py-2 transition-all duration-150 disabled:opacity-40"
                    style={{ border: '1px solid var(--color-border-light)', color: 'var(--color-muted)', borderRadius: '2px' }}
                  >
                    {plan.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    onClick={deletePlan}
                    disabled={actionLoading}
                    className="label-caps px-3 py-2 transition-all duration-150 disabled:opacity-40"
                    style={{ border: '1px solid #6E3030', color: '#C47878', borderRadius: '2px' }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Join / identity ─────────────────────────────── */}
        {!me ? (
          <div className="fade-up fade-up-2 py-6" style={card}>
            <div className="px-6">
              <h2 className="font-display italic mb-1" style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--color-cream)' }}>
                Who are you?
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>Enter your name to mark your availability.</p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && joinPlan()}
                    className="input-line"
                  />
                </div>
                <button
                  onClick={joinPlan}
                  disabled={joiningName || !nameInput.trim()}
                  className="label-caps px-4 py-3 mb-0.5 transition-all duration-150 disabled:opacity-40"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-ink)',
                    borderRadius: '2px',
                    letterSpacing: '0.1em',
                  }}
                >
                  {joiningName ? '…' : 'Join →'}
                </button>
              </div>
              {nameError && <p className="mt-2 text-xs" style={{ color: '#C47878' }}>{nameError}</p>}
            </div>
          </div>
        ) : (
          <div className="fade-up fade-up-2 flex items-center justify-between px-4 py-3" style={card}>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Marking as{' '}
              <span className="font-medium" style={{ color: 'var(--color-cream)' }}>{me.name}</span>
            </p>
            <button
              onClick={() => { localStorage.removeItem(`participant_${planId}`); setMe(null); setNameInput(''); }}
              className="label-caps transition-opacity hover:opacity-100"
              style={{ color: 'var(--color-faint)', opacity: 0.7 }}
            >
              Change
            </button>
          </div>
        )}

        {/* ── Legend ──────────────────────────────────────── */}
        {me && !plan.is_locked && (
          <div className="fade-up fade-up-3 px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2" style={card}>
            <span className="label-caps" style={{ color: 'var(--color-faint)' }}>Click to cycle:</span>
            {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([, cfg]) => (
              <span key={cfg.label} className="flex items-center gap-1.5 label-caps" style={{ color: cfg.labelColor }}>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                {cfg.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 label-caps" style={{ color: 'var(--color-faint)' }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--color-border-light)' }} />
              No answer
            </span>
            <p className="w-full label-caps mt-0.5" style={{ color: 'var(--color-faint)', fontSize: '0.58rem' }}>
              Ranked by priority: preferred › free › no answer › can&apos;t do
            </p>
          </div>
        )}

        {/* ── Calendar ────────────────────────────────────── */}
        <div className="fade-up fade-up-3" style={card}>
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="font-display italic" style={{ fontSize: '1.3rem', fontWeight: 300, color: 'var(--color-cream)' }}>
              {months.length > 1 ? months[activeMonthIndex].label : 'Availability'}
            </h2>
            {months.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveMonthIndex(i => Math.max(0, i - 1))}
                  disabled={activeMonthIndex === 0}
                  className="w-8 h-8 flex items-center justify-center transition-all duration-150 disabled:opacity-20"
                  style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: '2px', fontSize: '1.1rem' }}
                  aria-label="Previous month"
                >‹</button>
                <span className="label-caps px-1" style={{ color: 'var(--color-faint)', minWidth: '5rem', textAlign: 'center' }}>
                  {activeMonthIndex + 1} / {months.length}
                </span>
                <button
                  onClick={() => setActiveMonthIndex(i => Math.min(months.length - 1, i + 1))}
                  disabled={activeMonthIndex === months.length - 1}
                  className="w-8 h-8 flex items-center justify-center transition-all duration-150 disabled:opacity-20"
                  style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)', borderRadius: '2px', fontSize: '1.1rem' }}
                  aria-label="Next month"
                >›</button>
              </div>
            )}
          </div>

          {/* Grid */}
          {(() => {
            const month = months[activeMonthIndex] ?? months[0];
            if (!month) return null;
            return (
              <div className="p-4">
                <div className="grid grid-cols-7 mb-1">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="label-caps text-center py-1" style={{ fontSize: '0.6rem', color: 'var(--color-faint)' }}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: (new Date(month.dates[0]).getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`e-${i}`} />
                  ))}
                  {month.dates.map(date => {
                    const myStatus = myAvailability(date);
                    const stats = dateStats(date);
                    const cfg = myStatus ? STATUS_CONFIG[myStatus] : null;
                    const hasAnyResponse = stats.preferred + stats.free + stats.cant_do > 0;
                    const isClickable = !!me && !plan.is_locked;
                    const breakdown = participants.length > 0 ? getDateBreakdown(date) : null;
                    const isHovered = hoveredDate === date;
                    const isPopping = poppingDate === date;

                    return (
                      <div
                        key={date}
                        onClick={() => isClickable && toggleDate(date)}
                        onMouseEnter={() => setHoveredDate(date)}
                        onMouseLeave={() => setHoveredDate(null)}
                        className={`relative aspect-square flex flex-col items-center justify-center text-xs transition-all duration-150 ${isPopping ? 'cell-pop' : ''} ${isClickable ? 'cursor-pointer' : ''}`}
                        style={{
                          background: cfg ? cfg.bg : 'var(--color-raised)',
                          color: cfg ? '#F2EDE4' : 'var(--color-muted)',
                          borderRadius: '3px',
                          opacity: isClickable && !cfg ? 0.85 : 1,
                        }}
                        onMouseOver={e => {
                          if (isClickable) (e.currentTarget as HTMLDivElement).style.opacity = '0.8';
                        }}
                        onMouseOut={e => {
                          (e.currentTarget as HTMLDivElement).style.opacity = '1';
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 400, fontSize: '0.75rem' }}>
                          {format(parseISO(date), 'd')}
                        </span>
                        {hasAnyResponse && (
                          <div className="absolute bottom-0.5 flex gap-0.5">
                            {stats.preferred > 0 && <span className="w-1 h-1 rounded-full" style={{ background: STATUS_CONFIG.preferred.dot, opacity: 0.9 }} />}
                            {stats.free > 0 && <span className="w-1 h-1 rounded-full" style={{ background: STATUS_CONFIG.free.dot, opacity: 0.9 }} />}
                            {stats.cant_do > 0 && <span className="w-1 h-1 rounded-full" style={{ background: STATUS_CONFIG.cant_do.dot, opacity: 0.9 }} />}
                          </div>
                        )}
                        {/* Tooltip */}
                        {isHovered && breakdown && participants.length > 0 && (
                          <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
                            style={{
                              width: '11rem',
                              background: '#1E1C18',
                              border: '1px solid var(--color-border-light)',
                              borderRadius: '4px',
                              padding: '0.75rem',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            }}
                          >
                            <p className="label-caps mb-2" style={{ color: 'var(--color-accent)', fontSize: '0.6rem' }}>
                              {format(parseISO(date), 'd MMM yyyy')}
                            </p>
                            {breakdown.preferred.length > 0 && (
                              <div className="mb-1 text-xs" style={{ color: STATUS_CONFIG.preferred.dot }}>
                                <span className="font-medium">Preferred: </span>
                                <span style={{ color: 'var(--color-cream)', fontWeight: 300 }}>{breakdown.preferred.join(', ')}</span>
                              </div>
                            )}
                            {breakdown.free.length > 0 && (
                              <div className="mb-1 text-xs" style={{ color: STATUS_CONFIG.free.dot }}>
                                <span className="font-medium">Free: </span>
                                <span style={{ color: 'var(--color-cream)', fontWeight: 300 }}>{breakdown.free.join(', ')}</span>
                              </div>
                            )}
                            {breakdown.cant_do.length > 0 && (
                              <div className="mb-1 text-xs" style={{ color: STATUS_CONFIG.cant_do.dot }}>
                                <span className="font-medium">Can&apos;t do: </span>
                                <span style={{ color: 'var(--color-cream)', fontWeight: 300 }}>{breakdown.cant_do.join(', ')}</span>
                              </div>
                            )}
                            {breakdown.no_answer.length > 0 && (
                              <div className="text-xs" style={{ color: 'var(--color-faint)' }}>
                                <span className="font-medium">No answer: </span>
                                <span style={{ fontWeight: 300 }}>{breakdown.no_answer.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Participants ─────────────────────────────────── */}
        {participants.length > 0 && (
          <div className="fade-up fade-up-4 px-5 py-4" style={card}>
            <p className="label-caps mb-3" style={{ color: 'var(--color-muted)' }}>
              {participants.length} {participants.length === 1 ? 'person' : 'people'} planning
            </p>
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <span
                  key={p.id}
                  className="text-xs px-3 py-1"
                  style={{
                    border: `1px solid ${me?.id === p.id ? 'var(--color-accent-dim)' : 'var(--color-border-light)'}`,
                    color: me?.id === p.id ? 'var(--color-accent)' : 'var(--color-muted)',
                    borderRadius: '2px',
                  }}
                >
                  {p.name}{me?.id === p.id && ' ·you'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Best windows ─────────────────────────────────── */}
        {bestWindows.length > 0 && availability.length > 0 && (
          <div className="fade-up fade-up-5" style={card}>
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h2 className="font-display italic" style={{ fontSize: '1.3rem', fontWeight: 300, color: 'var(--color-cream)' }}>
                Best dates
              </h2>
              <p className="label-caps mt-1" style={{ color: 'var(--color-faint)' }}>
                Ranked by group availability
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {bestWindows.map((w, i) => {
                const endDate = addDays(parseISO(w.start), w.maxNights - 1);
                const nightsLabel = w.minNights === w.maxNights
                  ? `${w.minNights} night${w.minNights !== 1 ? 's' : ''}`
                  : `${w.minNights}–${w.maxNights} nights`;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4"
                    style={{ background: i === 0 ? 'rgba(200,145,106,0.04)' : 'transparent' }}
                  >
                    <div
                      className="font-display italic flex-shrink-0"
                      style={{
                        fontSize: '2rem',
                        fontWeight: 300,
                        lineHeight: 1,
                        color: i === 0 ? 'var(--color-accent)' : 'var(--color-border-light)',
                        width: '2.5rem',
                        textAlign: 'center',
                      }}
                    >
                      {i === 0 ? '①' : `${i + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm" style={{ color: 'var(--color-cream)' }}>
                        {format(parseISO(w.start), 'd MMM')} – {format(endDate, 'd MMM yyyy')}
                        <span className="ml-2" style={{ color: 'var(--color-muted)', fontWeight: 300 }}>{nightsLabel}</span>
                      </p>
                      <div className="flex gap-3 mt-1">
                        {w.preferredCount > 0 && (
                          <span className="label-caps" style={{ color: STATUS_CONFIG.preferred.dot, fontSize: '0.6rem' }}>
                            {w.preferredCount} preferred
                          </span>
                        )}
                        {w.freeCount > 0 && (
                          <span className="label-caps" style={{ color: STATUS_CONFIG.free.dot, fontSize: '0.6rem' }}>
                            {w.freeCount} free
                          </span>
                        )}
                        {w.unansweredCount > 0 && (
                          <span className="label-caps" style={{ color: 'var(--color-faint)', fontSize: '0.6rem' }}>
                            {w.unansweredCount} no answer
                          </span>
                        )}
                        {w.cantDoCount > 0 && (
                          <span className="label-caps" style={{ color: STATUS_CONFIG.cant_do.dot, fontSize: '0.6rem' }}>
                            {w.cantDoCount} can&apos;t do
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
