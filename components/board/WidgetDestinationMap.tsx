'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { MapPin } from './MapInner';

const MapInner = dynamic(() => import('./MapInner'), { ssr: false });

// Colors indexed by member join order
const MEMBER_COLORS = [
  '#F4621F', '#3B82F6', '#10B981', '#8B5CF6',
  '#F59E0B', '#EC4899', '#06B6D4', '#84CC16',
];

const REACTION_EMOJIS = ['😍', '👍', '👎', '🤔', '🎉', '❤️', '🔥', '💯'];

interface Member { id: string; name: string; participant_token: string; }

interface Props {
  id: string;
  data: Record<string, unknown>;
  me: Member | null;
  members: Member[];
  canEdit: boolean;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function WidgetDestinationMap({ id, data, me, members, canEdit, onUpdate, onDelete }: Props) {
  const pins: MapPin[] = Array.isArray(data.pins) ? (data.pins as MapPin[]) : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const memberColors: Record<string, string> = {};
  members.forEach((m, i) => { memberColors[m.id] = MEMBER_COLORS[i % MEMBER_COLORS.length]; });

  const selectedPin = pins.find(p => p.id === selectedPinId) ?? null;

  // Debounced Nominatim search
  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const results: NominatimResult[] = await res.json();
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  function addPin(result: NominatimResult) {
    if (!me) return;
    const shortName = result.display_name.split(',').slice(0, 2).join(',').trim();
    const newPin: MapPin = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      label: shortName,
      added_by: me.id,
      added_by_name: me.name,
      reactions: [],
    };
    const updatedPins = [...pins, newPin];
    onUpdate({ ...data, pins: updatedPins });
    setFlyTo({ lat: newPin.lat, lng: newPin.lng });
    setSelectedPinId(newPin.id);
    setSearchQuery('');
    setSearchResults([]);
  }

  function removePin(pinId: string) {
    const updatedPins = pins.filter(p => p.id !== pinId);
    onUpdate({ ...data, pins: updatedPins });
    setSelectedPinId(null);
  }

  function toggleReaction(pinId: string, emoji: string) {
    if (!me) return;
    const updatedPins = pins.map(p => {
      if (p.id !== pinId) return p;
      const existingIdx = p.reactions.findIndex(r => r.member_id === me.id && r.emoji === emoji);
      if (existingIdx >= 0) {
        return { ...p, reactions: p.reactions.filter((_, i) => i !== existingIdx) };
      }
      return { ...p, reactions: [...p.reactions, { member_id: me.id, emoji }] };
    });
    onUpdate({ ...data, pins: updatedPins });
    setShowReactionPicker(false);
  }

  function handleSelectPin(pinId: string) {
    setSelectedPinId(pinId === selectedPinId ? null : pinId);
    const pin = pins.find(p => p.id === pinId);
    if (pin) setFlyTo({ lat: pin.lat, lng: pin.lng });
  }

  // Close reaction picker on outside click
  useEffect(() => {
    if (!showReactionPicker) return;
    const handler = () => setShowReactionPicker(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showReactionPicker]);

  const canDeletePin = selectedPin
    ? !!(me && (me.id === selectedPin.added_by || canEdit))
    : false;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '1.1rem' }}>🗺️</span>
          <span className="font-display font-bold text-sm" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
            Destination Inspiration Map
          </span>
          {pins.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)' }}>
              {pins.length}
            </span>
          )}
        </div>
        {canEdit && (
          <button onClick={onDelete}
            className="text-xs px-2.5 py-1 rounded-lg font-medium opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-cantdo)', background: 'var(--color-bg)' }}>
            Remove
          </button>
        )}
      </div>

      {/* Search bar */}
      {me && (
        <div className="relative mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search for a destination…"
              className="field-input flex-1"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ width: 14, height: 14, border: '2px solid var(--color-coral)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 8px 24px rgba(44,31,20,0.12)' }}>
              {searchResults.map(r => (
                <button key={r.place_id}
                  onClick={() => addPin(r)}
                  className="w-full text-left px-3 py-2.5 text-xs hover:opacity-80 transition-opacity"
                  style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-ink)', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600 }}>{r.display_name.split(',')[0]}</span>
                  <span style={{ color: 'var(--color-muted)' }}>{r.display_name.split(',').slice(1, 3).join(',')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div style={{ height: 340, borderRadius: '0.875rem', overflow: 'hidden', border: '1.5px solid var(--color-border)' }}>
        <MapInner
          pins={pins}
          selectedPinId={selectedPinId}
          memberColors={memberColors}
          flyTo={flyTo}
          onSelect={handleSelectPin}
        />
      </div>

      {/* Pin list (compact) */}
      {pins.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pins.map(pin => {
            const color = memberColors[pin.added_by] ?? '#F4621F';
            const isSelected = selectedPinId === pin.id;
            return (
              <button key={pin.id}
                onClick={() => handleSelectPin(pin.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150"
                style={{
                  background: isSelected ? color : 'var(--color-bg)',
                  color: isSelected ? '#fff' : 'var(--color-ink)',
                  border: `1.5px solid ${isSelected ? color : 'var(--color-border)'}`,
                }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                {pin.label.split(',')[0]}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected pin detail panel */}
      {selectedPin && (
        <div className="mt-3 rounded-xl p-3"
          style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>{selectedPin.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                Added by <span style={{ color: memberColors[selectedPin.added_by] ?? 'var(--color-coral)', fontWeight: 600 }}>{selectedPin.added_by_name}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {canDeletePin && (
                <>
                  {showDeleteConfirm ? (
                    <div className="flex gap-1">
                      <button onClick={() => removePin(selectedPin.id)}
                        className="text-xs px-2 py-0.5 rounded-lg font-medium"
                        style={{ background: 'var(--color-cantdo)', color: '#fff' }}>Remove</button>
                      <button onClick={() => setShowDeleteConfirm(false)}
                        className="text-xs px-2 py-0.5 rounded-lg font-medium"
                        style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="text-xs opacity-40 hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--color-cantdo)' }}>✕</button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Reactions row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Grouped reaction counts */}
            {(() => {
              const grouped: Record<string, string[]> = {};
              for (const r of selectedPin.reactions) {
                if (!grouped[r.emoji]) grouped[r.emoji] = [];
                grouped[r.emoji].push(r.member_id);
              }
              return Object.entries(grouped).map(([emoji, memberIds]) => {
                const myReaction = me && memberIds.includes(me.id);
                return (
                  <button key={emoji}
                    onClick={() => me && toggleReaction(selectedPin.id, emoji)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-100"
                    style={{
                      background: myReaction ? 'var(--color-coral-light)' : 'var(--color-surface)',
                      border: `1.5px solid ${myReaction ? 'rgba(244,98,31,0.25)' : 'var(--color-border)'}`,
                      color: 'var(--color-ink)',
                    }}>
                    {emoji} <span style={{ color: 'var(--color-muted)' }}>{memberIds.length}</span>
                  </button>
                );
              });
            })()}

            {/* Add reaction */}
            {me && (
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShowReactionPicker(p => !p); }}
                  className="flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  + React
                </button>
                {showReactionPicker && (
                  <div className="absolute bottom-full mb-1 left-0 z-50 flex gap-1 p-2 rounded-xl"
                    style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 8px 24px rgba(44,31,20,0.12)' }}
                    onMouseDown={e => e.stopPropagation()}>
                    {REACTION_EMOJIS.map(emoji => (
                      <button key={emoji}
                        onClick={() => toggleReaction(selectedPin.id, emoji)}
                        className="text-base hover:scale-125 transition-transform duration-100"
                        style={{ lineHeight: 1 }}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {pins.length === 0 && !me && (
        <p className="mt-3 text-xs text-center" style={{ color: 'var(--color-muted)' }}>
          Join the board to suggest destinations
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
