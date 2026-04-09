'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Nav from '@/components/Nav';
import WidgetNote from '@/components/board/WidgetNote';
import WidgetLink from '@/components/board/WidgetLink';
import WidgetCalendar from '@/components/board/WidgetCalendar';
import { format, parseISO } from 'date-fns';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Board {
  id: string; title: string; destination: string | null;
  window_start: string | null; window_end: string | null;
}
interface Member { id: string; name: string; participant_token: string; }
interface Widget { id: string; type: string; data: Record<string, unknown>; position: number; created_by: string; }

const WIDGET_TYPES = [
  { type: 'note', label: '📝 Note', description: 'Write anything' },
  { type: 'link', label: '🔗 Link', description: 'Share a URL with preview' },
  { type: 'calendar', label: '📅 Availability', description: 'Mark dates and find the best windows' },
];

function SortableWidget({ widget, me, creatorToken, boardId, members, onUpdate, onDelete }: {
  widget: Widget;
  me: Member | null;
  creatorToken: string | null;
  boardId: string;
  members: Member[];
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });

  const canEdit = !!(me && (me.participant_token === widget.created_by || creatorToken));

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
    >
      <div className="card px-4 py-4" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 mt-0.5 touch-none cursor-grab active:cursor-grabbing"
            style={{ color: 'var(--color-border-mid)', padding: '2px' }}
            aria-label="Drag to reorder"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/>
              <circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/>
              <circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            {widget.type === 'note' && (
              <WidgetNote
                id={widget.id}
                data={widget.data as { content: string }}
                canEdit={canEdit}
                onUpdate={data => onUpdate(widget.id, data)}
                onDelete={() => onDelete(widget.id)}
              />
            )}
            {widget.type === 'link' && (
              <WidgetLink
                id={widget.id}
                data={widget.data}
                canEdit={canEdit}
                onUpdate={data => onUpdate(widget.id, data)}
                onDelete={() => onDelete(widget.id)}
              />
            )}
            {widget.type === 'calendar' && (
              <WidgetCalendar
                id={widget.id}
                boardId={boardId}
                data={widget.data}
                me={me}
                members={members}
                canEdit={canEdit}
                onUpdate={data => onUpdate(widget.id, data)}
                onDelete={() => onDelete(widget.id)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const boardId = params.id as string;
  const creatorParam = searchParams.get('creator');

  const [board, setBoard] = useState<Board | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [me, setMe] = useState<Member | null>(null);
  const [creatorToken, setCreatorToken] = useState<string | null>(creatorParam);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [joining, setJoining] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const meRef = useRef(me);
  useEffect(() => { meRef.current = me; }, [me]);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}`);
      if (res.status === 404) { setLoadError('Board not found — it may have been deleted.'); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoadError(`Failed to load board (${res.status}): ${err.error ?? 'unknown error'}`);
        return;
      }
      const data = await res.json();
      setBoard(data.board);
      setMembers(data.members);
      setWidgets(data.widgets);
      if (data.creator_token) setCreatorToken(data.creator_token);
    } catch (e) {
      setLoadError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [boardId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`board-${boardId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_widgets', filter: `board_id=eq.${boardId}` }, fetchBoard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_members', filter: `board_id=eq.${boardId}` }, fetchBoard)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [boardId, fetchBoard]);

  // Restore identity
  useEffect(() => {
    const stored = localStorage.getItem(`board_member_${boardId}`);
    if (stored) setMe(JSON.parse(stored));
    else setShowNameModal(true);
  }, [boardId]);

  // Auto-join logged-in users
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name && !me) {
        const stored = localStorage.getItem(`board_member_${boardId}`);
        if (!stored) joinBoard(user.user_metadata.full_name);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function joinBoard(name: string) {
    setJoining(true); setNameError('');
    const storedToken = localStorage.getItem(`board_token_${boardId}_${name}`);
    const res = await fetch(`/api/boards/${boardId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, participant_token: storedToken }),
    });
    if (res.status === 409) { setNameError('That name is taken — try another.'); setJoining(false); return; }
    if (!res.ok) { setNameError('Something went wrong.'); setJoining(false); return; }
    const { member } = await res.json();
    setMe(member);
    localStorage.setItem(`board_member_${boardId}`, JSON.stringify(member));
    localStorage.setItem(`board_token_${boardId}_${name}`, member.participant_token);
    setShowNameModal(false);
    setJoining(false);
    fetchBoard();
  }

  async function addWidget(type: string) {
    if (!me) { setShowNameModal(true); return; }
    setShowWidgetPicker(false);
    const res = await fetch(`/api/boards/${boardId}/widgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        data: type === 'calendar'
          ? { window_start: board?.window_start ?? null, window_end: board?.window_end ?? null, min_duration: 3, max_duration: 7 }
          : {},
        participant_token: me.participant_token,
      }),
    });
    if (!res.ok) return;
    const { widget } = await res.json();
    setWidgets(prev => [...prev, widget]);
  }

  async function updateWidget(id: string, data: Record<string, unknown>) {
    if (!me) return;
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, data } : w));
    await fetch(`/api/boards/${boardId}/widgets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, participant_token: me.participant_token }),
    });
  }

  async function deleteWidget(id: string) {
    if (!me) return;
    setWidgets(prev => prev.filter(w => w.id !== id));
    await fetch(`/api/boards/${boardId}/widgets/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_token: me.participant_token }),
    });
  }

  // dnd-kit sensors — use PointerSensor with a small activation distance so
  // taps don't accidentally trigger drag, and TouchSensor for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !me) return;

    const oldIndex = widgets.findIndex(w => w.id === active.id);
    const newIndex = widgets.findIndex(w => w.id === over.id);
    const reordered = arrayMove(widgets, oldIndex, newIndex);

    setWidgets(reordered);

    // Persist new positions
    await Promise.all(reordered.map((w, i) =>
      fetch(`/api/boards/${boardId}/widgets/${w.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: i, participant_token: me.participant_token }),
      })
    ));
  }

  function copyLink() {
    const url = `${window.location.origin}/board/${boardId}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
    else fallbackCopy(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function fallbackCopy(text: string) {
    const el = document.createElement('textarea');
    el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
    document.body.appendChild(el); el.select(); document.execCommand('copy');
    document.body.removeChild(el);
  }

  if (loadError) return (
    <main className="dot-bg min-h-screen flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full text-center">
        <p className="text-2xl mb-3">⚠️</p>
        <p className="font-display font-bold text-lg mb-2" style={{ color: 'var(--color-ink)' }}>Something went wrong</p>
        <p className="text-sm font-mono break-all" style={{ color: 'var(--color-cantdo)' }}>{loadError}</p>
      </div>
    </main>
  );

  if (!board) return (
    <main className="dot-bg min-h-screen flex items-center justify-center">
      <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-muted)' }}>Loading…</p>
    </main>
  );

  return (
    <main className="dot-bg min-h-screen pb-24">
      <Nav />

      {/* ── Board header ─────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-6 fade-up fade-up-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <a href="/" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
              style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
              <span style={{ fontSize: '0.7rem' }}>✈️</span>
              <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>Hatchd</span>
            </a>
            <h1 className="font-display font-bold" style={{ fontSize: '2rem', lineHeight: 1.15, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
              {board.title}
            </h1>
            {(board.destination || board.window_start) && (
              <p className="mt-1 text-sm flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--color-muted)' }}>
                {board.destination && <span>{board.destination}</span>}
                {board.destination && board.window_start && <span style={{ color: 'var(--color-faint)' }}>·</span>}
                {board.window_start && board.window_end && (
                  <span>{format(parseISO(board.window_start), 'd MMM')} – {format(parseISO(board.window_end), 'd MMM yyyy')}</span>
                )}
              </p>
            )}
          </div>
          <button onClick={copyLink}
            className="flex-shrink-0 label-tag px-3 py-2 rounded-xl transition-all duration-150"
            style={{
              background: copied ? 'var(--color-preferred-bg)' : 'var(--color-coral)',
              color: copied ? 'var(--color-preferred)' : '#fff',
              boxShadow: copied ? 'none' : '0 2px 8px rgba(244,98,31,0.25)',
            }}>
            {copied ? '✓ Copied!' : 'Invite'}
          </button>
        </div>

        {/* Members */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {members.map(m => (
            <span key={m.id}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: me?.id === m.id ? 'var(--color-coral-light)' : 'var(--color-bg)',
                color: me?.id === m.id ? 'var(--color-coral)' : 'var(--color-muted)',
                border: `1.5px solid ${me?.id === m.id ? 'rgba(244,98,31,0.2)' : 'var(--color-border)'}`,
              }}>
              {m.name}{me?.id === m.id && ' · you'}
            </span>
          ))}
          {!me && (
            <button onClick={() => setShowNameModal(true)}
              className="text-xs px-2.5 py-1 rounded-full font-semibold transition-opacity hover:opacity-70"
              style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)', border: '1.5px solid rgba(244,98,31,0.2)' }}>
              + Join board
            </button>
          )}
        </div>
      </div>

      {/* ── Widget list ───────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4">
        {widgets.length === 0 ? (
          <div className="text-center py-16 fade-up fade-up-2">
            <p className="text-3xl mb-3">🗂️</p>
            <p className="font-display font-bold text-lg mb-1" style={{ color: 'var(--color-ink)' }}>Nothing here yet</p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Add a note or drop in a link to get started.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3 fade-up fade-up-2">
                {widgets.map(widget => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    me={me}
                    creatorToken={creatorToken}
                    boardId={boardId}
                    members={members}
                    onUpdate={updateWidget}
                    onDelete={deleteWidget}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* ── Add widget button ─────────────────────────────── */}
      {me && (
        <button
          onClick={() => setShowWidgetPicker(true)}
          className="fixed flex items-center justify-center transition-all duration-200"
          style={{
            bottom: '1.5rem', left: '1.5rem',
            width: '3.25rem', height: '3.25rem',
            borderRadius: '50%',
            background: 'var(--color-coral)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(244,98,31,0.4)',
            fontSize: '1.6rem',
            zIndex: 100,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          aria-label="Add widget"
        >
          +
        </button>
      )}

      {/* ── Widget picker modal ───────────────────────────── */}
      {showWidgetPicker && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(44,31,20,0.5)', zIndex: 2000, backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowWidgetPicker(false); }}>
          <div className="card w-full max-w-sm fade-up fade-up-1" style={{ boxShadow: '0 16px 48px rgba(44,31,20,0.2)' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: '1.5px solid var(--color-border)' }}>
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>Add to board</h2>
              <button onClick={() => setShowWidgetPicker(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold"
                style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>✕</button>
            </div>
            <div className="p-4 space-y-2">
              {WIDGET_TYPES.map(wt => (
                <button key={wt.type} onClick={() => addWidget(wt.type)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-150"
                  style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-coral)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; }}>
                  <span style={{ fontSize: '1.4rem' }}>{wt.label.split(' ')[0]}</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>{wt.label.split(' ').slice(1).join(' ')}</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{wt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Join modal ────────────────────────────────────── */}
      {showNameModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(44,31,20,0.55)', zIndex: 2000, backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget && me) setShowNameModal(false); }}>
          <div className="card w-full max-w-sm p-6 fade-up fade-up-1" style={{ boxShadow: '0 16px 48px rgba(44,31,20,0.22)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-coral-light)' }}>
                <span style={{ fontSize: '1rem' }}>✈️</span>
              </div>
              <span className="label-tag" style={{ color: 'var(--color-coral)' }}>You&apos;ve been invited</span>
            </div>
            <h2 className="font-display font-bold mb-1" style={{ fontSize: '1.5rem', color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
              {board.title}
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--color-muted)', lineHeight: 1.6 }}>
              Enter your name to join the board and start adding ideas.
            </p>
            <div className="space-y-3">
              <input
                type="text" placeholder="Your name" value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinBoard(nameInput)}
                className="field-input" autoFocus
              />
              <button onClick={() => joinBoard(nameInput)} disabled={joining || !nameInput.trim()}
                className="w-full py-3 rounded-xl font-display font-semibold text-lg transition-all duration-200 disabled:opacity-40"
                style={{ background: 'var(--color-coral)', color: '#fff', boxShadow: '0 4px 14px rgba(244,98,31,0.35)', letterSpacing: '-0.01em' }}>
                {joining ? 'Joining…' : 'Join the board →'}
              </button>
              {nameError && <p className="text-sm font-medium text-center" style={{ color: 'var(--color-cantdo)' }}>{nameError}</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
