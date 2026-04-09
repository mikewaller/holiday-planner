'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type CardType = 'activity' | 'link';

interface Card {
  id: string;
  type: CardType;
  content?: string;
  url?: string;
  og_title?: string;
  og_image?: string;
  og_description?: string;
  og_site_name?: string;
}

interface Day {
  id: string;
  label: string;
  cards: Card[];
}

interface Reaction {
  card_id: string;
  member_id: string;
  emoji: string;
}

interface Member {
  id: string;
  name: string;
  participant_token: string;
}

interface Props {
  id: string;
  boardId: string;
  data: Record<string, unknown>;
  me: Member | null;
  members: Member[];
  canEdit: boolean;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
}

const EMOJI_OPTIONS = ['😍', '👍', '👎', '🤔', '🎉', '😂', '❤️', '🔥', '💯', '😬', '🙌', '😭'];

export default function WidgetItinerary({ id, boardId, data, me, members, canEdit, onUpdate, onDelete }: Props) {
  const [days, setDays] = useState<Day[]>(() => (data.days as Day[]) ?? []);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set());
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayLabel, setEditingDayLabel] = useState('');
  const [addingCardDayId, setAddingCardDayId] = useState<string | null>(null);
  const [cardInput, setCardInput] = useState('');
  const [fetchingOg, setFetchingOg] = useState(false);
  const [emojiPickerCardId, setEmojiPickerCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardContent, setEditingCardContent] = useState('');

  const fetchReactions = useCallback(async () => {
    const res = await fetch(`/api/boards/${boardId}/itinerary/reactions?widget_id=${id}`);
    if (!res.ok) return;
    const { reactions: rows } = await res.json();
    setReactions(rows);
  }, [boardId, id]);

  useEffect(() => { fetchReactions(); }, [fetchReactions]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`itinerary-reactions-${id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_reactions', filter: `widget_id=eq.${id}` },
        () => fetchReactions()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchReactions]);

  // Expand all days on first load
  useEffect(() => {
    setExpandedDays(new Set((data.days as Day[] ?? []).map((d: Day) => d.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistDays(newDays: Day[]) {
    setDays(newDays);
    onUpdate({ ...data, days: newDays });
  }

  function toggleDay(dayId: string) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId); else next.add(dayId);
      return next;
    });
  }

  function addDay() {
    const newDay: Day = { id: crypto.randomUUID(), label: `Day ${days.length + 1}`, cards: [] };
    const newDays = [...days, newDay];
    persistDays(newDays);
    setExpandedDays(prev => new Set([...prev, newDay.id]));
    setTimeout(() => { setEditingDayId(newDay.id); setEditingDayLabel(newDay.label); }, 50);
  }

  function saveDayLabel(dayId: string) {
    if (!editingDayLabel.trim()) { setEditingDayId(null); return; }
    persistDays(days.map(d => d.id === dayId ? { ...d, label: editingDayLabel.trim() } : d));
    setEditingDayId(null);
  }

  function deleteDay(dayId: string) {
    persistDays(days.filter(d => d.id !== dayId));
  }

  async function addCard(dayId: string, content?: string) {
    const input = (content ?? cardInput).trim();
    if (!input || !me) return;

    const isUrl = input.startsWith('http://') || input.startsWith('https://');

    if (isUrl) {
      setFetchingOg(true);
      try {
        const res = await fetch(`/api/og?url=${encodeURIComponent(input)}`);
        const og = res.ok ? await res.json() : {};
        const card: Card = {
          id: crypto.randomUUID(), type: 'link', url: input,
          og_title: og.title ?? null, og_description: og.description ?? null,
          og_image: og.image ?? null, og_site_name: og.siteName ?? null,
        };
        persistDays(days.map(d => d.id === dayId ? { ...d, cards: [...d.cards, card] } : d));
      } catch {
        persistDays(days.map(d => d.id === dayId ? { ...d, cards: [...d.cards, { id: crypto.randomUUID(), type: 'link' as CardType, url: input }] } : d));
      } finally {
        setFetchingOg(false);
      }
    } else {
      persistDays(days.map(d => d.id === dayId ? { ...d, cards: [...d.cards, { id: crypto.randomUUID(), type: 'activity' as CardType, content: input }] } : d));
    }

    setCardInput('');
    setAddingCardDayId(null);
  }

  function deleteCard(dayId: string, cardId: string) {
    persistDays(days.map(d => d.id === dayId ? { ...d, cards: d.cards.filter(c => c.id !== cardId) } : d));
  }

  function saveCardEdit(dayId: string, cardId: string) {
    if (!editingCardContent.trim()) return;
    persistDays(days.map(d => d.id === dayId
      ? { ...d, cards: d.cards.map(c => c.id === cardId ? { ...c, content: editingCardContent.trim() } : c) }
      : d
    ));
    setEditingCardId(null);
  }

  async function toggleReaction(cardId: string, emoji: string) {
    if (!me) return;
    const existing = reactions.find(r => r.card_id === cardId && r.member_id === me.id && r.emoji === emoji);
    setReactions(prev =>
      existing
        ? prev.filter(r => !(r.card_id === cardId && r.member_id === me.id && r.emoji === emoji))
        : [...prev, { card_id: cardId, member_id: me.id, emoji }]
    );
    setEmojiPickerCardId(null);
    await fetch(`/api/boards/${boardId}/itinerary/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widget_id: id, card_id: cardId, emoji, participant_token: me.participant_token }),
    });
  }

  function getCardReactions(cardId: string) {
    const grouped: Record<string, { count: number; hasMe: boolean; memberNames: string[] }> = {};
    for (const r of reactions.filter(r => r.card_id === cardId)) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, hasMe: false, memberNames: [] };
      grouped[r.emoji].count++;
      if (r.member_id === me?.id) grouped[r.emoji].hasMe = true;
      const m = members.find(m => m.id === r.member_id);
      if (m) grouped[r.emoji].memberNames.push(m.name.split(' ')[0]);
    }
    return grouped;
  }

  function renderContent(text: string) {
    return text.split('\n').map((line, li) => {
      if (!line) return <br key={li} />;
      let content = line;
      let isHeading = false;
      let isBullet = false;
      if (line.startsWith('# ')) { isHeading = true; content = line.slice(2); }
      else if (line.startsWith('## ')) { content = line.slice(3); isHeading = true; }
      else if (line.match(/^[-*] /)) { isBullet = true; content = line.slice(2); }

      const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
      const nodes = parts.map((part, pi) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={pi}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={pi}>{part.slice(1, -1)}</em>;
        return part;
      });

      if (isHeading) return <p key={li} className="font-bold text-sm mb-0.5" style={{ color: 'var(--color-ink)' }}>{nodes}</p>;
      if (isBullet) return (
        <p key={li} className="text-sm flex items-start gap-1.5" style={{ color: 'var(--color-ink)', lineHeight: 1.5 }}>
          <span style={{ color: 'var(--color-coral)', flexShrink: 0, marginTop: '0.1em' }}>·</span>{nodes}
        </p>
      );
      return <p key={li} className="text-sm" style={{ color: 'var(--color-ink)', lineHeight: 1.5 }}>{nodes}</p>;
    });
  }

  return (
    <div className="w-full space-y-2">
      {days.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--color-muted)' }}>
            {canEdit ? 'Add your first day to get started.' : 'The itinerary is empty.'}
          </p>
        </div>
      )}

      {days.map(day => {
        const isExpanded = expandedDays.has(day.id);
        return (
          <div key={day.id} className="rounded-xl overflow-visible" style={{ border: '1.5px solid var(--color-border)' }}>
            {/* Day header */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: isExpanded ? 'var(--color-surface)' : 'var(--color-bg)', borderRadius: isExpanded ? '10px 10px 0 0' : '10px' }}>
              <button onClick={() => toggleDay(day.id)}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center transition-transform duration-200"
                style={{ color: 'var(--color-muted)', fontSize: '1rem', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</button>

              {editingDayId === day.id ? (
                <input
                  autoFocus
                  value={editingDayLabel}
                  onChange={e => setEditingDayLabel(e.target.value)}
                  onBlur={() => saveDayLabel(day.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveDayLabel(day.id);
                    if (e.key === 'Escape') setEditingDayId(null);
                  }}
                  className="flex-1 text-sm font-semibold bg-transparent outline-none border-b"
                  style={{ color: 'var(--color-ink)', borderColor: 'var(--color-coral)' }}
                />
              ) : (
                <span
                  className={`flex-1 text-sm font-semibold ${canEdit ? 'cursor-text' : ''}`}
                  style={{ color: 'var(--color-ink)' }}
                  onClick={() => canEdit && (setEditingDayId(day.id), setEditingDayLabel(day.label))}
                >{day.label}</span>
              )}

              <span className="label-tag flex-shrink-0" style={{ color: 'var(--color-faint)', fontSize: '0.6rem' }}>
                {day.cards.length} {day.cards.length === 1 ? 'item' : 'items'}
              </span>
              {canEdit && (
                <button onClick={() => deleteDay(day.id)}
                  className="flex-shrink-0 text-xs transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-cantdo)' }}>✕</button>
              )}
            </div>

            {/* Day cards */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-2 space-y-2">
                {day.cards.map(card => {
                  const cardReactions = getCardReactions(card.id);
                  const isEditingCard = editingCardId === card.id;
                  return (
                    <div key={card.id} className="rounded-xl overflow-visible"
                      style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)' }}>
                      {/* Card body */}
                      <div className="px-3 pt-3 pb-2">
                        {card.type === 'link' ? (
                          <a href={card.url} target="_blank" rel="noopener noreferrer" className="block group" style={{ textDecoration: 'none' }}>
                            {card.og_image && (
                              <div className="w-full rounded-lg overflow-hidden mb-2" style={{ aspectRatio: '16/9', background: 'var(--color-bg)' }}>
                                <img src={card.og_image} alt="" className="w-full h-full object-cover transition-opacity group-hover:opacity-90" />
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                {card.og_site_name && (
                                  <p className="label-tag mb-0.5" style={{ color: 'var(--color-coral)', fontSize: '0.6rem' }}>{card.og_site_name}</p>
                                )}
                                {card.og_title
                                  ? <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{card.og_title}</p>
                                  : <p className="text-xs truncate" style={{ color: 'var(--color-faint)' }}>{card.url}</p>
                                }
                                {card.og_description && (
                                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-muted)', lineHeight: 1.5 }}>{card.og_description}</p>
                                )}
                              </div>
                              <span style={{ color: 'var(--color-coral)', fontSize: '1rem', flexShrink: 0 }}>›</span>
                            </div>
                          </a>
                        ) : isEditingCard ? (
                          <div className="space-y-2">
                            <textarea
                              autoFocus
                              value={editingCardContent}
                              onChange={e => setEditingCardContent(e.target.value)}
                              rows={3}
                              className="field-input resize-none w-full"
                              style={{ fontSize: '0.85rem' }}
                              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveCardEdit(day.id, card.id); }}
                            />
                            <p className="text-xs" style={{ color: 'var(--color-faint)' }}>Supports **bold**, *italic*, # heading, - bullet</p>
                            <div className="flex gap-2">
                              <button onClick={() => saveCardEdit(day.id, card.id)}
                                className="flex-1 py-1.5 rounded-lg label-tag font-semibold"
                                style={{ background: 'var(--color-ink)', color: '#fff' }}>Save</button>
                              <button onClick={() => setEditingCardId(null)}
                                className="px-3 py-1.5 rounded-lg label-tag"
                                style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div>{renderContent(card.content ?? '')}</div>
                        )}
                      </div>

                      {/* Reaction bar */}
                      <div className="px-3 pb-2.5 pt-1.5 flex items-center gap-1.5 flex-wrap relative"
                        style={{ borderTop: '1px solid var(--color-border)' }}>
                        {Object.entries(cardReactions).map(([emoji, { count, hasMe, memberNames }]) => (
                          <button key={emoji} onClick={() => me && toggleReaction(card.id, emoji)}
                            title={memberNames.join(', ')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all"
                            style={{
                              background: hasMe ? 'var(--color-coral-light)' : 'var(--color-bg)',
                              border: `1.5px solid ${hasMe ? 'rgba(244,98,31,0.3)' : 'var(--color-border)'}`,
                              color: hasMe ? 'var(--color-coral)' : 'var(--color-muted)',
                            }}>{emoji} {count}</button>
                        ))}

                        <div className="relative">
                          <button
                            onClick={() => setEmojiPickerCardId(emojiPickerCardId === card.id ? null : card.id)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all hover:opacity-70"
                            style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)' }}>+</button>

                          {emojiPickerCardId === card.id && (
                            <div className="absolute bottom-full left-0 mb-1.5 p-2 rounded-xl flex flex-wrap gap-1"
                              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 4px 20px rgba(44,31,20,0.15)', zIndex: 100, width: '11rem' }}>
                              {EMOJI_OPTIONS.map(emoji => (
                                <button key={emoji} onClick={() => toggleReaction(card.id, emoji)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all hover:scale-110"
                                  style={{ background: 'var(--color-bg)' }}>{emoji}</button>
                              ))}
                            </div>
                          )}
                        </div>

                        {canEdit && !isEditingCard && (
                          <div className="ml-auto flex gap-2">
                            {card.type === 'activity' && (
                              <button onClick={() => { setEditingCardId(card.id); setEditingCardContent(card.content ?? ''); }}
                                className="label-tag transition-opacity hover:opacity-70"
                                style={{ color: 'var(--color-faint)' }}>Edit</button>
                            )}
                            <button onClick={() => deleteCard(day.id, card.id)}
                              className="label-tag transition-opacity hover:opacity-70"
                              style={{ color: 'var(--color-cantdo)' }}>Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add card input */}
                {canEdit && me && (
                  addingCardDayId === day.id ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={cardInput}
                        onChange={e => setCardInput(e.target.value)}
                        placeholder="Type an activity or paste a link…"
                        rows={2}
                        className="field-input resize-none w-full"
                        style={{ fontSize: '0.85rem' }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(day.id); }
                          if (e.key === 'Escape') { setAddingCardDayId(null); setCardInput(''); }
                        }}
                        onPaste={e => {
                          const pasted = e.clipboardData.getData('text');
                          if (pasted.startsWith('http')) {
                            e.preventDefault();
                            addCard(day.id, pasted);
                          }
                        }}
                      />
                      {fetchingOg && <p className="text-xs" style={{ color: 'var(--color-faint)' }}>Fetching preview…</p>}
                      <div className="flex gap-2">
                        <button onClick={() => addCard(day.id)} disabled={!cardInput.trim() || fetchingOg}
                          className="flex-1 py-1.5 rounded-lg label-tag font-semibold transition-all disabled:opacity-40"
                          style={{ background: 'var(--color-ink)', color: '#fff' }}>Add</button>
                        <button onClick={() => { setAddingCardDayId(null); setCardInput(''); }}
                          className="px-3 py-1.5 rounded-lg label-tag"
                          style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingCardDayId(day.id); setCardInput(''); }}
                      className="w-full py-2 rounded-xl label-tag text-center transition-all hover:opacity-70"
                      style={{ background: 'var(--color-bg)', border: '1.5px dashed var(--color-border)', color: 'var(--color-faint)' }}>
                      + Add activity or link
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add day */}
      {canEdit && (
        <button onClick={addDay}
          className="w-full py-2.5 rounded-xl label-tag font-semibold text-center transition-all hover:opacity-80"
          style={{ background: 'var(--color-coral-light)', border: '1.5px dashed rgba(244,98,31,0.3)', color: 'var(--color-coral)' }}>
          + Add day
        </button>
      )}

      {/* Remove widget */}
      {canEdit && (
        <div className="flex justify-end pt-1">
          <button onClick={onDelete} className="label-tag transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-cantdo)' }}>Remove widget</button>
        </div>
      )}
    </div>
  );
}
