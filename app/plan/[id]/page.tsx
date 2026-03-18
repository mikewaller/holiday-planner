'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { createClient } from '@/lib/supabase/client';
import { addDays, format, parseISO, eachDayOfInterval } from 'date-fns';

type Status = 'free' | 'cant_do' | 'preferred';

interface Plan {
  id: string; name: string; window_start: string; window_end: string;
  min_duration: number; max_duration: number; is_locked: number;
}
interface Participant { id: string; name: string; participant_token: string; }
interface Availability { participant_id: string; date: string; status: Status; }
interface BestWindow {
  start: string; minNights: number; maxNights: number; score: number;
  preferredCount: number; freeCount: number; unansweredCount: number; cantDoCount: number;
}

const STATUS_CONFIG: Record<Status, { label: string; cellBg: string; cellText: string; dot: string; tagBg: string; tagText: string }> = {
  preferred: { label: 'Preferred', cellBg: '#059669', cellText: '#fff', dot: '#34D399', tagBg: '#ECFDF5', tagText: '#065F46' },
  free:      { label: 'Free',      cellBg: '#0284C7', cellText: '#fff', dot: '#38BDF8', tagBg: '#E0F2FE', tagText: '#075985' },
  cant_do:   { label: "Can't do",  cellBg: '#DC2626', cellText: '#fff', dot: '#F87171', tagBg: '#FEF2F2', tagText: '#991B1B' },
};

export default function PlanPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const creatorToken = searchParams.get('creator');

  const [plan, setPlan] = useState<Plan | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [resolvedCreatorToken, setResolvedCreatorToken] = useState<string | null>(creatorToken);
  const [me, setMe] = useState<{ id: string; name: string; token: string } | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [joiningName, setJoiningName] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [editWindowStart, setEditWindowStart] = useState('');
  const [editWindowEnd, setEditWindowEnd] = useState('');
  const [editMinDuration, setEditMinDuration] = useState(1);
  const [editMaxDuration, setEditMaxDuration] = useState(7);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);
  const [poppingDate, setPoppingDate] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    const res = await fetch(`/api/plans/${planId}`);
    if (!res.ok) return;
    const data = await res.json();
    setPlan(data.plan); setParticipants(data.participants); setAvailability(data.availability);
    // If API returns creator_token (logged-in owner), use it
    if (data.creator_token) setResolvedCreatorToken(data.creator_token);
  }, [planId]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);
  useEffect(() => {
    const stored = localStorage.getItem(`participant_${planId}`);
    if (stored) setMe(JSON.parse(stored));
  }, [planId]);
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setAuthed(!!user));
  }, []);

  async function joinPlan() {
    if (!nameInput.trim()) return;
    setJoiningName(true); setNameError('');
    const storedToken = localStorage.getItem(`participant_token_${planId}_${nameInput.trim()}`);
    const res = await fetch('/api/availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId, name: nameInput.trim(), participant_token: storedToken }),
    });
    if (res.status === 409) { setNameError('That name is taken — try another!'); setJoiningName(false); return; }
    if (!res.ok) { setNameError('Something went wrong.'); setJoiningName(false); return; }
    const { participant_id, participant_token } = await res.json();
    const meData = { id: participant_id, name: nameInput.trim(), token: participant_token };
    setMe(meData);
    localStorage.setItem(`participant_${planId}`, JSON.stringify(meData));
    setJoiningName(false); fetchPlan();
  }

  async function toggleDate(date: string) {
    if (!me || plan?.is_locked) return;
    const current = availability.find(a => a.participant_id === me.id && a.date === date);
    const cycle: (Status | null)[] = ['free', 'preferred', 'cant_do', null];
    const currentIndex = current ? cycle.indexOf(current.status) : 3;
    const nextStatus = cycle[(currentIndex + 1) % cycle.length];
    setPoppingDate(date); setTimeout(() => setPoppingDate(null), 250);
    setAvailability(prev => {
      const filtered = prev.filter(a => !(a.participant_id === me.id && a.date === date));
      return nextStatus ? [...filtered, { participant_id: me.id, date, status: nextStatus }] : filtered;
    });
    await fetch('/api/availability', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_id: me.id, participant_token: me.token, plan_id: planId, date, status: nextStatus }),
    });
  }

  async function toggleLock() {
    if (!resolvedCreatorToken || !plan) return;
    setActionLoading(true);
    await fetch(`/api/plans/${planId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creator_token: resolvedCreatorToken, is_locked: !plan.is_locked }) });
    await fetchPlan(); setActionLoading(false);
  }

  async function deletePlan() {
    if (!resolvedCreatorToken || !confirm('Delete this plan? This cannot be undone.')) return;
    setActionLoading(true);
    await fetch(`/api/plans/${planId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creator_token: resolvedCreatorToken }) });
    window.location.href = '/';
  }

  function copyShareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/plan/${planId}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function openEditDates() {
    if (!plan) return;
    setEditWindowStart(plan.window_start);
    setEditWindowEnd(plan.window_end);
    setEditMinDuration(plan.min_duration);
    setEditMaxDuration(plan.max_duration);
    setEditingDates(true);
  }

  async function saveDates() {
    if (!resolvedCreatorToken || editMinDuration > editMaxDuration) return;
    setActionLoading(true);
    await fetch(`/api/plans/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creator_token: resolvedCreatorToken,
        window_start: editWindowStart,
        window_end: editWindowEnd,
        min_duration: editMinDuration,
        max_duration: editMaxDuration,
      }),
    });
    setEditingDates(false);
    await fetchPlan();
    setActionLoading(false);
  }

  function getBestWindows(): BestWindow[] {
    if (!plan || participants.length === 0) return [];
    const allDates = eachDayOfInterval({ start: parseISO(plan.window_start), end: parseISO(plan.window_end) });
    const windows: BestWindow[] = [];
    for (let i = 0; i <= allDates.length - plan.min_duration; i++) {
      let maxNights = 0;
      for (let d = plan.min_duration; d <= plan.max_duration; d++) {
        if (i + d > allDates.length) break;
        const lastDate = format(allDates[i + d - 1], 'yyyy-MM-dd');
        if (participants.some(p => availability.find(a => a.participant_id === p.id && a.date === lastDate)?.status === 'cant_do')) break;
        maxNights = d;
      }
      if (maxNights < plan.min_duration) continue;
      const windowDates = allDates.slice(i, i + maxNights).map(d => format(d, 'yyyy-MM-dd'));
      let preferred = 0, free = 0, unanswered = 0, cantDo = 0;
      for (const p of participants) {
        let pp = 0, pf = 0, pc = 0;
        for (const date of windowDates) {
          const e = availability.find(a => a.participant_id === p.id && a.date === date);
          if (e?.status === 'preferred') pp++; else if (e?.status === 'free') pf++; else if (e?.status === 'cant_do') pc++;
        }
        if (pc > 0) cantDo++; else if (pp > 0) preferred++; else if (pf > 0) free++; else unanswered++;
      }
      windows.push({ start: format(allDates[i], 'yyyy-MM-dd'), minNights: plan.min_duration, maxNights, score: preferred * 3 + free * 2 + unanswered - cantDo * 10, preferredCount: preferred, freeCount: free, unansweredCount: unanswered, cantDoCount: cantDo });
    }
    return windows.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  if (!plan) return (
    <main className="dot-bg min-h-screen flex items-center justify-center">
      <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-muted)' }}>Loading your trip…</p>
    </main>
  );

  const dates = eachDayOfInterval({ start: parseISO(plan.window_start), end: parseISO(plan.window_end) });
  const myAvailability = (date: string): Status | null => availability.find(a => a.participant_id === me?.id && a.date === date)?.status ?? null;
  const getDateBreakdown = (date: string) => {
    const result: Record<Status | 'no_answer', string[]> = { preferred: [], free: [], cant_do: [], no_answer: [] };
    for (const p of participants) {
      const e = availability.find(a => a.participant_id === p.id && a.date === date);
      if (e) result[e.status].push(p.name); else result.no_answer.push(p.name);
    }
    return result;
  };
  const dateStats = (date: string) => {
    const entries = availability.filter(a => a.date === date);
    return { preferred: entries.filter(e => e.status === 'preferred').length, free: entries.filter(e => e.status === 'free').length, cant_do: entries.filter(e => e.status === 'cant_do').length };
  };

  const bestWindows = getBestWindows();
  const months: { label: string; dates: string[] }[] = [];
  for (const date of dates) {
    const label = format(date, 'MMMM yyyy');
    const ds = format(date, 'yyyy-MM-dd');
    const last = months[months.length - 1];
    if (last && last.label === label) last.dates.push(ds); else months.push({ label, dates: [ds] });
  }

  const hoveredBreakdown = hoveredDate ? getDateBreakdown(hoveredDate) : null;

  return (
    <main className="dot-bg min-h-screen p-4 pb-16">
      <Nav />
      <div className="max-w-xl mx-auto space-y-4">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="fade-up fade-up-1 pt-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <a href="/"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}
                >
                  <span style={{ fontSize: '0.7rem' }}>✈️</span>
                  <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>Hatch a Plan</span>
                </a>
              </div>
              <h1 className="font-display font-bold" style={{ fontSize: '2rem', lineHeight: 1.15, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
                {plan.name}
              </h1>
              {editingDates ? (
                <div className="mt-2 p-3 rounded-xl space-y-3" style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.6rem' }}>Earliest</p>
                      <input type="date" value={editWindowStart} onChange={e => setEditWindowStart(e.target.value)} className="field-input text-sm py-1.5" />
                    </div>
                    <div>
                      <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.6rem' }}>Latest</p>
                      <input type="date" value={editWindowEnd} min={editWindowStart} onChange={e => setEditWindowEnd(e.target.value)} className="field-input text-sm py-1.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.6rem' }}>Min nights</p>
                      <input type="number" min={1} max={30} value={editMinDuration} onChange={e => setEditMinDuration(Number(e.target.value))} className="field-input text-sm py-1.5" />
                    </div>
                    <div>
                      <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.6rem' }}>Max nights</p>
                      <input type="number" min={1} max={30} value={editMaxDuration} onChange={e => setEditMaxDuration(Number(e.target.value))} className="field-input text-sm py-1.5" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveDates} disabled={actionLoading || editMinDuration > editMaxDuration}
                      className="flex-1 py-2 rounded-lg label-tag font-semibold transition-all duration-150 disabled:opacity-40"
                      style={{ background: 'var(--color-coral)', color: '#fff' }}>
                      {actionLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingDates(false)}
                      className="flex-1 py-2 rounded-lg label-tag transition-all duration-150"
                      style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)' }}>
                      Cancel
                    </button>
                  </div>
                  {editMinDuration > editMaxDuration && (
                    <p className="text-xs font-medium" style={{ color: 'var(--color-cantdo)' }}>Min nights can&apos;t exceed max nights</p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  {format(parseISO(plan.window_start), 'd MMM')} – {format(parseISO(plan.window_end), 'd MMM yyyy')}
                  <span className="mx-0.5" style={{ color: 'var(--color-faint)' }}>·</span>
                  {plan.min_duration}–{plan.max_duration} nights
                  {resolvedCreatorToken && (
                    <button onClick={openEditDates} title="Edit date range"
                      className="transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-faint)', lineHeight: 1, padding: '2px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </p>
              )}
              <div className="mt-2">
                {plan.is_locked
                  ? <span className="label-tag px-2.5 py-1 rounded-full" style={{ background: '#FEF9C3', color: '#854D0E' }}>🔒 Locked</span>
                  : <span className="label-tag px-2.5 py-1 rounded-full" style={{ background: 'var(--color-preferred-bg)', color: '#065F46' }}>● Open for responses</span>
                }
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              {resolvedCreatorToken && <>
                <button onClick={toggleLock} disabled={actionLoading} className="label-tag px-3 py-2 rounded-xl transition-all duration-150 disabled:opacity-40" style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  {plan.is_locked ? 'Unlock' : 'Lock'}
                </button>
                <button onClick={deletePlan} disabled={actionLoading} className="label-tag px-3 py-2 rounded-xl transition-all duration-150 disabled:opacity-40" style={{ background: 'var(--color-cantdo-bg)', border: '1.5px solid #FECACA', color: 'var(--color-cantdo)' }}>
                  Delete
                </button>
              </>}
            </div>
          </div>
        </div>

        {/* ── Share link box ──────────────────────────────── */}
        <div className="fade-up fade-up-2 card px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="label-tag mb-0.5" style={{ color: 'var(--color-faint)' }}>Share with your group</p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-muted)' }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/plan/${planId}` : `/plan/${planId}`}
            </p>
          </div>
          <button
            onClick={copyShareLink}
            className="label-tag px-3 py-2.5 rounded-xl transition-all duration-150 flex-shrink-0"
            style={{
              background: copied ? '#ECFDF5' : 'var(--color-coral)',
              color: copied ? '#065F46' : '#fff',
              boxShadow: copied ? 'none' : '0 2px 8px rgba(244,98,31,0.25)',
            }}
          >
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Join our trip planner! Mark your availability for ${plan.name}: ${typeof window !== 'undefined' ? `${window.location.origin}/plan/${planId}` : ''}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="label-tag px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all duration-150 flex-shrink-0"
            style={{ background: '#25D366', color: '#fff', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
        </div>

        {/* ── Sign-up info (unauthenticated creators only) ─── */}
        {!authed && resolvedCreatorToken && (
          <div className="fade-up fade-up-2 px-4 py-3 rounded-xl flex items-start gap-3" style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.15)' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.05rem' }}>💡</span>
            <p className="text-sm" style={{ color: 'var(--color-muted)', lineHeight: 1.5 }}>
              No account needed — anyone with this link can join and mark their availability.{' '}
              <a href="/login" style={{ color: 'var(--color-coral)', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
              {' '}to keep all your created trips in one place. This plan will always be accessible at this URL.
            </p>
          </div>
        )}

        {/* ── Join / identity ─────────────────────────────── */}
        {!me ? (
          <div className="fade-up fade-up-2 card p-5">
            <h2 className="font-display font-bold text-xl mb-1" style={{ color: 'var(--color-ink)' }}>Who&apos;s joining? 👋</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Enter your name to start marking your dates.</p>
            <div className="flex gap-2 items-stretch">
              <input type="text" placeholder="Your name" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinPlan()} className="field-input flex-1" />
              <button onClick={joinPlan} disabled={joiningName || !nameInput.trim()} className="px-5 rounded-xl font-display font-semibold text-white transition-all duration-150 disabled:opacity-40" style={{ background: 'var(--color-coral)', boxShadow: '0 3px 10px rgba(244,98,31,0.3)' }}>
                {joiningName ? '…' : 'Join →'}
              </button>
            </div>
            {nameError && <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-cantdo)' }}>{nameError}</p>}
            {showNamePrompt && !nameError && <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-coral)' }}>Enter your name above to start marking your dates 👆</p>}
          </div>
        ) : (
          <div className="fade-up fade-up-2 flex items-center justify-between px-4 py-3 card">
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Marking as <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{me.name}</span>
            </p>
            <button onClick={() => { localStorage.removeItem(`participant_${planId}`); setMe(null); setNameInput(''); }} className="label-tag transition-opacity" style={{ color: 'var(--color-faint)' }}>
              Change
            </button>
          </div>
        )}

        {/* ── Legend ──────────────────────────────────────── */}
        {me && !plan.is_locked && (
          <div className="fade-up fade-up-3 card px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="label-tag" style={{ color: 'var(--color-faint)' }}>Tap a date:</span>
              {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([, cfg]) => (
                <span key={cfg.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full label-tag" style={{ background: cfg.tagBg, color: cfg.tagText }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.dot }} />
                  {cfg.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full label-tag" style={{ background: 'var(--color-bg)', color: 'var(--color-faint)', border: '1px solid var(--color-border)' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--color-border-mid)' }} />
                No answer
              </span>
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--color-faint)' }}>
              Best dates ranked: preferred › free › no answer › can&apos;t do
            </p>
          </div>
        )}

        {/* ── Calendar ────────────────────────────────────── */}
        <div className="fade-up fade-up-3 card">
          <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1.5px solid var(--color-border)' }}>
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--color-ink)' }}>
              {months.length > 1 ? months[activeMonthIndex].label : 'Availability'}
            </h2>
            {months.length > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setActiveMonthIndex(i => Math.max(0, i - 1))} disabled={activeMonthIndex === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-25"
                  style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)', fontSize: '1.1rem' }}
                  aria-label="Previous month">‹</button>
                <span className="label-tag px-2" style={{ color: 'var(--color-faint)', minWidth: '3.5rem', textAlign: 'center' }}>
                  {activeMonthIndex + 1}/{months.length}
                </span>
                <button onClick={() => setActiveMonthIndex(i => Math.min(months.length - 1, i + 1))} disabled={activeMonthIndex === months.length - 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-25"
                  style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)', fontSize: '1.1rem' }}
                  aria-label="Next month">›</button>
              </div>
            )}
          </div>

          {(() => {
            const month = months[activeMonthIndex] ?? months[0];
            if (!month) return null;
            return (
              <div className="p-4">
                <div className="grid grid-cols-7 mb-2">
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <div key={i} className="text-center label-tag py-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: (new Date(month.dates[0]).getDay() + 6) % 7 }).map((_, i) => <div key={`e-${i}`} />)}
                  {month.dates.map(date => {
                    const myStatus = myAvailability(date);
                    const stats = dateStats(date);
                    const cfg = myStatus ? STATUS_CONFIG[myStatus] : null;
                    const hasAnyResponse = stats.preferred + stats.free + stats.cant_do > 0;
                    const isClickable = !!me && !plan.is_locked;
                    const isPopping = poppingDate === date;

                    return (
                      <div
                        key={date}
                        onClick={() => {
                          if (!me && !plan.is_locked) {
                            setShowNamePrompt(true);
                            setTimeout(() => setShowNamePrompt(false), 3000);
                          } else if (isClickable) {
                            toggleDate(date);
                          }
                        }}
                        onMouseEnter={e => {
                          setHoveredDate(date);
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          setTooltipPos({ top: rect.top, left: rect.left + rect.width / 2 });
                        }}
                        onMouseLeave={() => { setHoveredDate(null); setTooltipPos(null); }}
                        className={`relative aspect-square flex flex-col items-center justify-center text-xs font-semibold transition-all duration-150 ${isPopping ? 'cell-pop' : ''} ${!plan.is_locked ? 'cursor-pointer' : ''}`}
                        style={{
                          background: cfg ? cfg.cellBg : 'var(--color-bg)',
                          color: cfg ? cfg.cellText : 'var(--color-muted)',
                          borderRadius: '10px',
                          border: cfg ? 'none' : '1.5px solid var(--color-border)',
                          boxShadow: cfg ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                        }}
                        onMouseOver={e => { if (isClickable) (e.currentTarget as HTMLDivElement).style.opacity = '0.82'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                      >
                        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: '0.78rem' }}>
                          {format(parseISO(date), 'd')}
                        </span>
                        {hasAnyResponse && (
                          <div className="absolute bottom-1 flex gap-0.5">
                            {stats.preferred > 0 && <span className="w-1 h-1 rounded-full" style={{ background: STATUS_CONFIG.preferred.dot }} />}
                            {stats.free > 0 && <span className="w-1 h-1 rounded-full" style={{ background: STATUS_CONFIG.free.dot }} />}
                            {stats.cant_do > 0 && <span className="w-1 h-1 rounded-full" style={{ background: STATUS_CONFIG.cant_do.dot }} />}
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
          <div className="fade-up fade-up-4 card px-5 py-4">
            <h3 className="font-display font-bold mb-3" style={{ color: 'var(--color-ink)' }}>
              {participants.length} {participants.length === 1 ? 'person' : 'people'} planning 🌍
            </h3>
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <span key={p.id} className="text-sm px-3 py-1.5 rounded-full font-medium"
                  style={{ background: me?.id === p.id ? 'var(--color-coral-light)' : 'var(--color-bg)', color: me?.id === p.id ? 'var(--color-coral)' : 'var(--color-muted)', border: `1.5px solid ${me?.id === p.id ? 'rgba(244,98,31,0.2)' : 'var(--color-border)'}` }}>
                  {p.name}{me?.id === p.id && ' · you'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Best windows ─────────────────────────────────── */}
        {bestWindows.length > 0 && availability.length > 0 && (
          <div className="fade-up fade-up-5 card overflow-hidden">
            <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #FFF7F3 0%, #FFF0E9 100%)', borderBottom: '1.5px solid var(--color-border)' }}>
              <h2 className="font-display font-bold text-xl" style={{ color: 'var(--color-ink)' }}>Best dates ✨</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Top windows based on everyone&apos;s availability</p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {bestWindows.map((w, i) => {
                const endDate = addDays(parseISO(w.start), w.maxNights - 1);
                const nightsLabel = w.minNights === w.maxNights ? `${w.minNights} night${w.minNights !== 1 ? 's' : ''}` : `${w.minNights}–${w.maxNights} nights`;
                const medals = ['🥇', '🥈', '🥉', '4th', '5th'];
                return (
                  <a
                    key={i}
                    href={`/plan/${planId}/book?start=${w.start}&nights=${w.maxNights}`}
                    className="flex items-center gap-3 px-5 py-4 transition-all duration-150"
                    style={{ textDecoration: 'none', display: 'flex' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-bg)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = ''; }}
                  >
                    <div className="text-xl flex-shrink-0 w-8 text-center">
                      {i < 3 ? medals[i] : <span className="label-tag" style={{ color: 'var(--color-faint)' }}>#{i+1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>
                        {format(parseISO(w.start), 'd MMM')} – {format(endDate, 'd MMM yyyy')}
                        <span className="ml-2 font-normal text-xs" style={{ color: 'var(--color-muted)' }}>{nightsLabel}</span>
                      </p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {w.preferredCount > 0 && <span className="label-tag px-2 py-0.5 rounded-full" style={{ background: 'var(--color-preferred-bg)', color: 'var(--color-preferred)', fontSize: '0.58rem' }}>{w.preferredCount} preferred</span>}
                        {w.freeCount > 0 && <span className="label-tag px-2 py-0.5 rounded-full" style={{ background: 'var(--color-free-bg)', color: 'var(--color-free)', fontSize: '0.58rem' }}>{w.freeCount} free</span>}
                        {w.unansweredCount > 0 && <span className="label-tag px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-faint)', fontSize: '0.58rem' }}>{w.unansweredCount} no answer</span>}
                        {w.cantDoCount > 0 && <span className="label-tag px-2 py-0.5 rounded-full" style={{ background: 'var(--color-cantdo-bg)', color: 'var(--color-cantdo)', fontSize: '0.58rem' }}>{w.cantDoCount} can&apos;t do</span>}
                      </div>
                    </div>
                    <span style={{ color: 'var(--color-faint)', fontSize: '1.1rem' }}>›</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Fixed calendar tooltip (escapes overflow:hidden) ─ */}
      {hoveredDate && hoveredBreakdown && participants.length > 0 && tooltipPos && (
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: tooltipPos.top - 8,
            left: tooltipPos.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            width: '12rem',
            background: 'var(--color-ink)',
            borderRadius: '12px',
            padding: '0.75rem',
            boxShadow: '0 8px 24px rgba(44,31,20,0.22)',
          }}
        >
          <p className="label-tag mb-2" style={{ color: 'var(--color-coral)', fontSize: '0.6rem' }}>
            {format(parseISO(hoveredDate), 'd MMMM yyyy')}
          </p>
          {hoveredBreakdown.preferred.length > 0 && (
            <div className="mb-1 text-xs" style={{ color: STATUS_CONFIG.preferred.dot }}>
              <span className="font-semibold">Preferred: </span>
              <span style={{ color: '#E5E7EB', fontWeight: 400 }}>{hoveredBreakdown.preferred.join(', ')}</span>
            </div>
          )}
          {hoveredBreakdown.free.length > 0 && (
            <div className="mb-1 text-xs" style={{ color: STATUS_CONFIG.free.dot }}>
              <span className="font-semibold">Free: </span>
              <span style={{ color: '#E5E7EB', fontWeight: 400 }}>{hoveredBreakdown.free.join(', ')}</span>
            </div>
          )}
          {hoveredBreakdown.cant_do.length > 0 && (
            <div className="mb-1 text-xs" style={{ color: STATUS_CONFIG.cant_do.dot }}>
              <span className="font-semibold">Can&apos;t do: </span>
              <span style={{ color: '#E5E7EB', fontWeight: 400 }}>{hoveredBreakdown.cant_do.join(', ')}</span>
            </div>
          )}
          {hoveredBreakdown.no_answer.length > 0 && (
            <div className="text-xs" style={{ color: '#6B7280' }}>
              <span className="font-semibold">No answer: </span>
              <span style={{ fontWeight: 400 }}>{hoveredBreakdown.no_answer.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
