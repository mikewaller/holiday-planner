'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addDays, format, parseISO, eachDayOfInterval } from 'date-fns';

type Status = 'free' | 'cant_do' | 'preferred';

interface Member {
  id: string;
  name: string;
  participant_token: string;
}

interface Availability {
  member_id: string;
  date: string;
  status: Status;
}

interface CalendarData {
  window_start?: string;
  window_end?: string;
  min_duration?: number;
  max_duration?: number;
}

interface Props {
  id: string;
  boardId: string;
  data: Partial<CalendarData>;
  me: Member | null;
  members: Member[];
  canEdit: boolean;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
}

const STATUS_CONFIG = {
  preferred: { label: 'Preferred', cellBg: '#059669', cellText: '#fff', dot: '#34D399', tagBg: '#ECFDF5', tagText: '#065F46' },
  free:      { label: 'Free',      cellBg: '#0284C7', cellText: '#fff', dot: '#38BDF8', tagBg: '#E0F2FE', tagText: '#075985' },
  cant_do:   { label: "Can't do",  cellBg: '#DC2626', cellText: '#fff', dot: '#F87171', tagBg: '#FEF2F2', tagText: '#991B1B' },
} as const;

export default function WidgetCalendar({ id, boardId, data, me, members, canEdit, onUpdate, onDelete }: Props) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [activeStatus, setActiveStatus] = useState<Status | 'erase'>('free');
  const [isPainting, setIsPainting] = useState(false);
  const paintedInGesture = useRef(new Set<string>());
  const [poppingDate, setPoppingDate] = useState<string | null>(null);
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);

  // Setup state
  const [setupStart, setSetupStart] = useState(data.window_start ?? '');
  const [setupEnd, setSetupEnd] = useState(data.window_end ?? '');
  const [setupMin, setSetupMin] = useState(data.min_duration ?? 3);
  const [setupMax, setSetupMax] = useState(data.max_duration ?? 7);
  const [singleDay, setSingleDay] = useState(false);

  const hasConfig = !!(data.window_start && data.window_end);

  const fetchAvailability = useCallback(async () => {
    const res = await fetch(`/api/boards/${boardId}/availability?widget_id=${id}`);
    if (!res.ok) return;
    const { availability: rows } = await res.json();
    setAvailability(rows);
  }, [boardId, id]);

  useEffect(() => {
    if (hasConfig) fetchAvailability();
  }, [hasConfig, fetchAvailability]);

  // Realtime
  useEffect(() => {
    if (!hasConfig) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`board-avail-${id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'board_availability', filter: `widget_id=eq.${id}` },
        () => fetchAvailability()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, hasConfig, fetchAvailability]);

  useEffect(() => {
    const stop = () => setIsPainting(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  function paintDate(date: string, toggleOnSame = false) {
    if (!me) return;
    const current = availability.find(a => a.member_id === me.id && a.date === date);
    let newStatus: Status | null = activeStatus === 'erase' ? null : activeStatus;
    if (toggleOnSame && activeStatus !== 'erase' && current?.status === activeStatus) newStatus = null;
    if ((current?.status ?? null) === newStatus) return;

    setPoppingDate(date);
    setTimeout(() => setPoppingDate(null), 250);

    setAvailability(prev => {
      const filtered = prev.filter(a => !(a.member_id === me.id && a.date === date));
      return newStatus ? [...filtered, { member_id: me.id, date, status: newStatus }] : filtered;
    });

    fetch(`/api/boards/${boardId}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widget_id: id,
        participant_token: me.participant_token,
        date,
        status: newStatus,
      }),
    });
  }

  // ── Setup UI ────────────────────────────────────────────
  if (!hasConfig) {
    if (!canEdit) {
      return (
        <div className="py-4 text-center">
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>The organiser hasn&apos;t set up the calendar yet.</p>
        </div>
      );
    }
    const today = new Date().toISOString().split('T')[0];
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Set the date window</p>

        <button type="button" onClick={() => setSingleDay(v => !v)} className="flex items-center gap-3 w-full text-left">
          <div className="flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 relative"
            style={{ background: singleDay ? 'var(--color-coral)' : 'var(--color-border-mid)' }}>
            <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
              style={{ left: singleDay ? '1.25rem' : '0.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Single day event</p>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>Earliest</p>
            <input type="date" min={today} value={setupStart} onChange={e => setSetupStart(e.target.value)} className="field-input" />
          </div>
          <div>
            <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>Latest</p>
            <input type="date" min={setupStart || today} value={setupEnd} onChange={e => setSetupEnd(e.target.value)} className="field-input" />
          </div>
        </div>

        {!singleDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>Min nights</p>
              <input type="number" min={1} max={30} value={setupMin} onChange={e => setSetupMin(Number(e.target.value))} className="field-input" />
            </div>
            <div>
              <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>Max nights</p>
              <input type="number" min={1} max={30} value={setupMax} onChange={e => setSetupMax(Number(e.target.value))} className="field-input" />
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (!setupStart || !setupEnd) return;
            onUpdate({
              window_start: setupStart,
              window_end: setupEnd,
              min_duration: singleDay ? 1 : setupMin,
              max_duration: singleDay ? 1 : setupMax,
            });
          }}
          disabled={!setupStart || !setupEnd}
          className="w-full py-2.5 rounded-xl label-tag font-semibold transition-all disabled:opacity-40"
          style={{ background: 'var(--color-coral)', color: '#fff' }}
        >
          Save
        </button>

      </div>
    );
  }

  // ── Calendar rendering ──────────────────────────────────
  const dates = eachDayOfInterval({ start: parseISO(data.window_start!), end: parseISO(data.window_end!) });
  const myAvailability = (date: string): Status | null =>
    availability.find(a => a.member_id === me?.id && a.date === date)?.status ?? null;
  const dateStats = (date: string) => {
    const entries = availability.filter(a => a.date === date);
    return {
      preferred: entries.filter(e => e.status === 'preferred').length,
      free: entries.filter(e => e.status === 'free').length,
      cant_do: entries.filter(e => e.status === 'cant_do').length,
    };
  };

  const months: { label: string; dates: string[] }[] = [];
  for (const date of dates) {
    const label = format(date, 'MMMM yyyy');
    const ds = format(date, 'yyyy-MM-dd');
    const last = months[months.length - 1];
    if (last && last.label === label) last.dates.push(ds);
    else months.push({ label, dates: [ds] });
  }
  const month = months[activeMonthIndex] ?? months[0];

  const minD = data.min_duration ?? 1;
  const maxD = data.max_duration ?? minD;
  const isDayTrip = minD === 1 && maxD === 1;

  function getBestWindows() {
    if (!data.window_start || !data.window_end || members.length === 0 || availability.length === 0) return [];
    const allDates = eachDayOfInterval({ start: parseISO(data.window_start), end: parseISO(data.window_end) });
    const windows = [];
    for (let i = 0; i <= allDates.length - minD; i++) {
      let maxNights = 0;
      for (let d = minD; d <= maxD; d++) {
        if (i + d > allDates.length) break;
        const lastDate = format(allDates[i + d - 1], 'yyyy-MM-dd');
        if (members.some(p => availability.find(a => a.member_id === p.id && a.date === lastDate)?.status === 'cant_do')) break;
        maxNights = d;
      }
      if (maxNights < minD) continue;
      const windowDates = allDates.slice(i, i + maxNights).map(d => format(d, 'yyyy-MM-dd'));
      let preferred = 0, free = 0, unanswered = 0, cantDo = 0;
      for (const p of members) {
        let pp = 0, pf = 0, pc = 0;
        for (const date of windowDates) {
          const e = availability.find(a => a.member_id === p.id && a.date === date);
          if (e?.status === 'preferred') pp++; else if (e?.status === 'free') pf++; else if (e?.status === 'cant_do') pc++;
        }
        if (pc > 0) cantDo++; else if (pp > 0) preferred++; else if (pf > 0) free++; else unanswered++;
      }
      windows.push({
        start: format(allDates[i], 'yyyy-MM-dd'),
        maxNights, minNights: minD,
        preferredCount: preferred, freeCount: free, unansweredCount: unanswered, cantDoCount: cantDo,
        score: preferred * 3 + free * 2 + unanswered - cantDo * 10,
      });
    }
    return windows.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  const bestWindows = getBestWindows();

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-display font-bold" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
            {months.length > 1 ? month.label : `${format(parseISO(data.window_start!), 'd MMM')} – ${format(parseISO(data.window_end!), 'd MMM yyyy')}`}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {isDayTrip ? 'Day trip' : `${minD}–${maxD} nights`}
          </p>
        </div>
        {months.length > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setActiveMonthIndex(i => Math.max(0, i - 1))} disabled={activeMonthIndex === 0}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-25"
              style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)', fontSize: '1rem' }}>‹</button>
            <span className="label-tag" style={{ color: 'var(--color-faint)', fontSize: '0.58rem' }}>{activeMonthIndex + 1}/{months.length}</span>
            <button onClick={() => setActiveMonthIndex(i => Math.min(months.length - 1, i + 1))} disabled={activeMonthIndex === months.length - 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all disabled:opacity-25"
              style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)', fontSize: '1rem' }}>›</button>
          </div>
        )}
      </div>

      {/* Paint selector */}
      {me && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-3">
          <span className="label-tag" style={{ color: 'var(--color-faint)' }}>Paint:</span>
          {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([status, cfg]) => (
            <button key={status} type="button" onClick={() => setActiveStatus(status)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full label-tag transition-all duration-150"
              style={{
                background: activeStatus === status ? cfg.cellBg : cfg.tagBg,
                color: activeStatus === status ? '#fff' : cfg.tagText,
                border: `1.5px solid ${activeStatus === status ? cfg.cellBg : 'transparent'}`,
                boxShadow: activeStatus === status ? `0 2px 8px ${cfg.dot}55` : 'none',
              }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: activeStatus === status ? '#fff' : cfg.dot }} />
              {cfg.label}
            </button>
          ))}
          <button type="button" onClick={() => setActiveStatus('erase')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full label-tag transition-all duration-150"
            style={{
              background: activeStatus === 'erase' ? 'var(--color-border-mid)' : 'var(--color-bg)',
              color: activeStatus === 'erase' ? 'var(--color-ink)' : 'var(--color-faint)',
              border: `1.5px solid ${activeStatus === 'erase' ? 'var(--color-border-mid)' : 'var(--color-border)'}`,
            }}>
            ✕ Erase
          </button>
        </div>
      )}

      {/* First-time hint */}
      {me && !availability.some(a => a.member_id === me.id) && (
        <div className="mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ background: 'var(--color-coral-light)', border: '1.5px solid rgba(244,98,31,0.18)' }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>👆</span>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-coral)', lineHeight: 1.4 }}>
            Pick a status above — then tap a date, or hold and drag to mark several at once
          </p>
        </div>
      )}

      {/* Calendar grid */}
      {month && (
        <div>
          <div className="grid grid-cols-7 mb-1.5">
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} className="text-center label-tag py-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>{d}</div>
            ))}
          </div>
          <div
            className="grid grid-cols-7 gap-1"
            style={{ touchAction: me ? 'none' : 'auto' }}
            onMouseLeave={() => setIsPainting(false)}
          >
            {Array.from({ length: (new Date(month.dates[0]).getDay() + 6) % 7 }).map((_, i) => <div key={`e-${i}`} />)}
            {month.dates.map(date => {
              const myStatus = myAvailability(date);
              const stats = dateStats(date);
              const cfg = myStatus ? STATUS_CONFIG[myStatus] : null;
              const hasAnyResponse = stats.preferred + stats.free + stats.cant_do > 0;
              const isPopping = poppingDate === date;
              return (
                <div
                  key={date}
                  data-date={date}
                  onMouseDown={e => {
                    if (!me) return;
                    e.preventDefault();
                    setIsPainting(true);
                    paintedInGesture.current = new Set([date]);
                    paintDate(date, true);
                  }}
                  onMouseEnter={() => {
                    if (isPainting && me && !paintedInGesture.current.has(date)) {
                      paintedInGesture.current.add(date);
                      paintDate(date, false);
                    }
                  }}
                  onTouchStart={() => {
                    if (!me) return;
                    setIsPainting(true);
                    paintedInGesture.current = new Set([date]);
                    paintDate(date, true);
                  }}
                  onTouchMove={e => {
                    if (!isPainting) return;
                    const touch = e.touches[0];
                    const el = document.elementFromPoint(touch.clientX, touch.clientY);
                    const d = el?.closest('[data-date]')?.getAttribute('data-date');
                    if (d && !paintedInGesture.current.has(d)) {
                      paintedInGesture.current.add(d);
                      paintDate(d, false);
                    }
                  }}
                  onTouchEnd={() => setIsPainting(false)}
                  className={`relative aspect-square flex flex-col items-center justify-center text-xs font-semibold transition-all duration-150 ${isPopping ? 'cell-pop' : ''} ${me ? 'cursor-pointer' : ''}`}
                  style={{
                    background: cfg ? cfg.cellBg : 'var(--color-bg)',
                    color: cfg ? cfg.cellText : 'var(--color-muted)',
                    borderRadius: '8px',
                    border: cfg ? 'none' : '1.5px solid var(--color-border)',
                    boxShadow: cfg ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                  }}
                  onMouseOver={e => { if (me) (e.currentTarget as HTMLDivElement).style.opacity = '0.82'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                >
                  <span style={{ fontFamily: 'var(--font-nunito)', fontSize: '0.75rem' }}>
                    {format(parseISO(date), 'd')}
                  </span>
                  {stats.cant_do > 0 && (
                    <span className="absolute flex items-center justify-center"
                      style={{ top: '1px', right: '1px', width: '11px', height: '11px', borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: '0.45rem', fontWeight: 800 }}>!</span>
                  )}
                  {hasAnyResponse && stats.cant_do === 0 && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      {stats.preferred > 0 && <span className="w-1 h-1 rounded-full" style={{ background: STATUS_CONFIG.preferred.dot }} />}
                      {stats.free > 0 && <span className="w-1 h-1 rounded-full" style={{ background: STATUS_CONFIG.free.dot }} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best windows */}
      {bestWindows.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: '1.5px solid var(--color-border)' }}>
          <p className="label-tag mb-2" style={{ color: 'var(--color-muted)' }}>Best windows</p>
          <div className="space-y-2">
            {bestWindows.map((w, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const endDate = addDays(parseISO(w.start), w.maxNights - 1);
              const nightsLabel = isDayTrip ? 'Day trip'
                : w.minNights === w.maxNights ? `${w.maxNights} night${w.maxNights !== 1 ? 's' : ''}`
                : `${w.minNights}–${w.maxNights} nights`;
              return (
                <div key={w.start} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)' }}>
                  <span className="text-base flex-shrink-0">{medals[i]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>
                      {format(parseISO(w.start), 'd MMM')} – {format(endDate, 'd MMM yyyy')}
                      <span className="ml-2 font-normal text-xs" style={{ color: 'var(--color-muted)' }}>{nightsLabel}</span>
                    </p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {w.preferredCount > 0 && <span className="label-tag px-1.5 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#065F46', fontSize: '0.58rem' }}>{w.preferredCount} preferred</span>}
                      {w.freeCount > 0 && <span className="label-tag px-1.5 py-0.5 rounded-full" style={{ background: '#E0F2FE', color: '#075985', fontSize: '0.58rem' }}>{w.freeCount} free</span>}
                      {w.unansweredCount > 0 && <span className="label-tag px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-faint)', border: '1px solid var(--color-border)', fontSize: '0.58rem' }}>{w.unansweredCount} no answer</span>}
                      {w.cantDoCount > 0 && <span className="label-tag px-1.5 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#991B1B', fontSize: '0.58rem' }}>! {w.cantDoCount} can&apos;t make it</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      {canEdit && (
        <div className="mt-4 pt-3" style={{ borderTop: '1.5px solid var(--color-border)' }}>
          <button onClick={() => onUpdate({ ...data, window_start: undefined, window_end: undefined })}
            className="label-tag transition-opacity hover:opacity-70" style={{ color: 'var(--color-faint)' }}>
            Edit dates
          </button>
        </div>
      )}
    </div>
  );
}
