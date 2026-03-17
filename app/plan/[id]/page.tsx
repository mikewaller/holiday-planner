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

const STATUS_CONFIG: Record<Status, { label: string; bg: string; ring: string; text: string }> = {
  preferred: { label: 'Preferred', bg: 'bg-green-500', ring: 'ring-green-600', text: 'text-white' },
  free: { label: 'Free', bg: 'bg-blue-400', ring: 'ring-blue-500', text: 'text-white' },
  cant_do: { label: "Can't do", bg: 'bg-red-400', ring: 'ring-red-500', text: 'text-white' },
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

  const fetchPlan = useCallback(async () => {
    const res = await fetch(`/api/plans/${planId}`);
    if (!res.ok) return;
    const data = await res.json();
    setPlan(data.plan);
    setParticipants(data.participants);
    setAvailability(data.availability);
  }, [planId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Restore participant identity from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`participant_${planId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setMe(parsed);
    }
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

    if (res.status === 409) {
      setNameError('That name is already taken. Choose a different one.');
      setJoiningName(false);
      return;
    }

    if (!res.ok) {
      setNameError('Something went wrong.');
      setJoiningName(false);
      return;
    }

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

    // Optimistic update
    setAvailability(prev => {
      const filtered = prev.filter(a => !(a.participant_id === me.id && a.date === date));
      if (nextStatus) {
        return [...filtered, { participant_id: me.id, date, status: nextStatus }];
      }
      return filtered;
    });

    await fetch('/api/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: me.id,
        participant_token: me.token,
        plan_id: planId,
        date,
        status: nextStatus,
      }),
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
    if (!confirm('Are you sure you want to delete this plan? This cannot be undone.')) return;
    setActionLoading(true);
    await fetch(`/api/plans/${planId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_token: creatorToken }),
    });
    window.location.href = '/';
  }

  function copyShareLink() {
    const url = `${window.location.origin}/plan/${planId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getBestWindows(): BestWindow[] {
    if (!plan || participants.length === 0) return [];

    const allDates = eachDayOfInterval({
      start: parseISO(plan.window_start),
      end: parseISO(plan.window_end),
    });

    const windows: BestWindow[] = [];

    for (let i = 0; i <= allDates.length - plan.min_duration; i++) {
      // Find max viable duration from this start: stop when any participant has a cant_do on the next day
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

      // Score over the max viable window
      const windowDates = allDates.slice(i, i + maxNights).map(d => format(d, 'yyyy-MM-dd'));
      let preferredCount = 0, freeCount = 0, unansweredCount = 0, cantDoCount = 0;

      for (const participant of participants) {
        let participantPreferred = 0, participantFree = 0, participantCantDo = 0;
        for (const date of windowDates) {
          const entry = availability.find(a => a.participant_id === participant.id && a.date === date);
          if (entry?.status === 'preferred') participantPreferred++;
          else if (entry?.status === 'free') participantFree++;
          else if (entry?.status === 'cant_do') participantCantDo++;
        }
        if (participantCantDo > 0) cantDoCount++;
        else if (participantPreferred > 0) preferredCount++;
        else if (participantFree > 0) freeCount++;
        else unansweredCount++;
      }

      const score = (preferredCount * 3) + (freeCount * 2) + (unansweredCount * 1) - (cantDoCount * 10);

      windows.push({
        start: format(allDates[i], 'yyyy-MM-dd'),
        minNights: plan.min_duration,
        maxNights,
        score,
        preferredCount,
        freeCount,
        unansweredCount,
        cantDoCount,
      });
    }

    return windows
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  if (!plan) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  const dates = eachDayOfInterval({
    start: parseISO(plan.window_start),
    end: parseISO(plan.window_end),
  });

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

  // Group dates by month for display
  const months: { label: string; dates: string[] }[] = [];
  for (const date of dates) {
    const label = format(date, 'MMMM yyyy');
    const dateStr = format(date, 'yyyy-MM-dd');
    const last = months[months.length - 1];
    if (last && last.label === label) {
      last.dates.push(dateStr);
    } else {
      months.push({ label, dates: [dateStr] });
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-indigo-700">{plan.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {format(parseISO(plan.window_start), 'd MMM yyyy')} – {format(parseISO(plan.window_end), 'd MMM yyyy')}
                {' · '}{plan.min_duration}–{plan.max_duration} nights
              </p>
              {plan.is_locked ? (
                <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                  Locked — no more changes
                </span>
              ) : (
                <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  Open for responses
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={copyShareLink}
                className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition"
              >
                {copied ? 'Copied!' : 'Copy share link'}
              </button>
              {creatorToken && (
                <>
                  <button
                    onClick={toggleLock}
                    disabled={actionLoading}
                    className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition disabled:opacity-50"
                  >
                    {plan.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    onClick={deletePlan}
                    disabled={actionLoading}
                    className="text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Join / identity */}
        {!me ? (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Who are you?</h2>
            <p className="text-sm text-gray-500 mb-4">Enter your name to start marking your availability.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Your name"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinPlan()}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={joinPlan}
                disabled={joiningName || !nameInput.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {joiningName ? '...' : 'Join'}
              </button>
            </div>
            {nameError && <p className="text-red-500 text-sm mt-2">{nameError}</p>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow px-6 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Marking availability as <span className="font-semibold text-indigo-700">{me.name}</span>
            </p>
            <button
              onClick={() => {
                localStorage.removeItem(`participant_${planId}`);
                setMe(null);
                setNameInput('');
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Change name
            </button>
          </div>
        )}

        {/* Legend */}
        {me && !plan.is_locked && (
          <div className="bg-white rounded-2xl shadow px-6 py-3">
            <p className="text-xs text-gray-500 mb-2">Click a date to cycle through:</p>
            <div className="flex gap-3 flex-wrap">
              {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([status, cfg]) => (
                <span key={status} className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.bg} ${cfg.text} px-2 py-1 rounded-full`}>
                  {cfg.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                No answer
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Best dates are ranked by priority: <span className="text-green-600 font-medium">preferred</span> &gt; <span className="text-blue-500 font-medium">free</span> &gt; <span className="font-medium">no answer</span> &gt; <span className="text-red-400 font-medium">can&apos;t do</span>.
            </p>
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Availability calendar</h2>
            {months.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveMonthIndex(i => Math.max(0, i - 1))}
                  disabled={activeMonthIndex === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <span className="text-sm font-medium text-gray-700 w-28 text-center">
                  {months[activeMonthIndex].label}
                </span>
                <button
                  onClick={() => setActiveMonthIndex(i => Math.min(months.length - 1, i + 1))}
                  disabled={activeMonthIndex === months.length - 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          {(() => {
            const month = months[activeMonthIndex] ?? months[0];
            if (!month) return null;
            return (
            <div>
              {months.length === 1 && (
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{month.label}</h3>
              )}
              <div className="grid grid-cols-7 gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-center text-xs text-gray-400 font-medium pb-1">{d}</div>
                ))}
                {/* Empty cells to align first day */}
                {Array.from({ length: (new Date(month.dates[0]).getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {month.dates.map(date => {
                  const myStatus = myAvailability(date);
                  const stats = dateStats(date);
                  const cfg = myStatus ? STATUS_CONFIG[myStatus] : null;
                  const hasAnyResponse = stats.preferred + stats.free + stats.cant_do > 0;
                  const isClickable = !!me && !plan.is_locked;
                  const breakdown = participants.length > 0 ? getDateBreakdown(date) : null;
                  const isHovered = hoveredDate === date;

                  return (
                    <div
                      key={date}
                      onClick={() => isClickable && toggleDate(date)}
                      onMouseEnter={() => setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`
                        relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium
                        ${cfg ? `${cfg.bg} ${cfg.text}` : 'bg-gray-50 text-gray-700'}
                        ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}
                        transition
                      `}
                    >
                      <span>{format(parseISO(date), 'd')}</span>
                      {hasAnyResponse && (
                        <div className="absolute bottom-0.5 flex gap-0.5">
                          {stats.preferred > 0 && <span className="w-1 h-1 rounded-full bg-green-600 opacity-80" />}
                          {stats.free > 0 && <span className="w-1 h-1 rounded-full bg-blue-600 opacity-80" />}
                          {stats.cant_do > 0 && <span className="w-1 h-1 rounded-full bg-red-600 opacity-80" />}
                        </div>
                      )}
                      {isHovered && breakdown && participants.length > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-44 bg-gray-900 text-white text-xs rounded-xl shadow-xl p-3 pointer-events-none">
                          <p className="font-semibold mb-1.5 text-gray-200">{format(parseISO(date), 'd MMM yyyy')}</p>
                          {breakdown.preferred.length > 0 && (
                            <div className="mb-1">
                              <span className="text-green-400 font-medium">Preferred: </span>
                              {breakdown.preferred.join(', ')}
                            </div>
                          )}
                          {breakdown.free.length > 0 && (
                            <div className="mb-1">
                              <span className="text-blue-400 font-medium">Free: </span>
                              {breakdown.free.join(', ')}
                            </div>
                          )}
                          {breakdown.cant_do.length > 0 && (
                            <div className="mb-1">
                              <span className="text-red-400 font-medium">Can&apos;t do: </span>
                              {breakdown.cant_do.join(', ')}
                            </div>
                          )}
                          {breakdown.no_answer.length > 0 && (
                            <div className="text-gray-400">
                              <span className="font-medium">No answer: </span>
                              {breakdown.no_answer.join(', ')}
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

        {/* Participants */}
        {participants.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Participants ({participants.length})</h2>
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <span key={p.id} className="bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full">
                  {p.name}
                  {me?.id === p.id && ' (you)'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Best windows */}
        {bestWindows.length > 0 && availability.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Best dates</h2>
            <p className="text-sm text-gray-500 mb-4">
              Top windows based on everyone&apos;s availability
            </p>
            <div className="space-y-3">
              {bestWindows.map((w, i) => {
                const endDate = addDays(parseISO(w.start), w.maxNights - 1);
                const nightsLabel = w.minNights === w.maxNights
                  ? `${w.minNights} night${w.minNights !== 1 ? 's' : ''}`
                  : `${w.minNights}–${w.maxNights} nights`;
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                    <div>
                      <p className="font-medium text-gray-800">
                        {format(parseISO(w.start), 'd MMM')} – {format(endDate, 'd MMM yyyy')}
                        <span className="text-sm text-gray-500 ml-2">{nightsLabel}</span>
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {w.preferredCount > 0 && <span className="text-green-600">{w.preferredCount} preferred</span>}
                        {w.freeCount > 0 && <span className="text-blue-600">{w.freeCount} free</span>}
                        {w.unansweredCount > 0 && <span className="text-gray-400">{w.unansweredCount} no answer</span>}
                        {w.cantDoCount > 0 && <span className="text-red-500">{w.cantDoCount} can&apos;t do</span>}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${i === 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                      {i === 0 ? '★' : `#${i + 1}`}
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
