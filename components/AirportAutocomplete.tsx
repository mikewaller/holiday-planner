'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { AIRPORTS, CITY_GROUPS } from '@/lib/airports';

interface Option {
  code: string;
  label: string;
  sub: string;
  isGroup: boolean;
}

// Build the full searchable list once at module level
const ALL_OPTIONS: Option[] = [
  // City groups first (e.g. "London (Any)")
  ...Object.entries(CITY_GROUPS).map(([code, g]) => ({
    code,
    label: `${g.city} (Any)`,
    sub: `${code} · ${g.country} · ${g.airports.join(', ')}`,
    isGroup: true,
  })),
  // Individual airports
  ...Object.entries(AIRPORTS).map(([code, a]) => ({
    code,
    label: a.city,
    sub: `${code} · ${a.country}`,
    isGroup: false,
  })),
];

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface Props {
  value: string;
  onSelect: (code: string) => void;
  placeholder?: string;
}

export default function AirportAutocomplete({ value, onSelect, placeholder = 'e.g. London, LHR…' }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive display label from selected code
  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const opt = ALL_OPTIONS.find(o => o.code === value);
    return opt ? opt.label : value;
  }, [value]);

  // Show query while typing, selected label when closed
  const inputValue = open ? query : selectedLabel;

  const results = useMemo(() => {
    if (!query.trim()) return ALL_OPTIONS.slice(0, 8);
    const q = normalize(query);
    return ALL_OPTIONS
      .filter(o =>
        normalize(o.label).includes(q) ||
        normalize(o.code).includes(q) ||
        normalize(o.sub).includes(q)
      )
      .slice(0, 8);
  }, [query]);

  // Reset highlight when results change
  useEffect(() => setHighlighted(0), [results]);

  // Click outside closes dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(opt: Option) {
    onSelect(opt.code);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); if (results[highlighted]) handleSelect(results[highlighted]); }
    if (e.key === 'Escape')    { setOpen(false); setQuery(''); inputRef.current?.blur(); }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0, width: '220px' }}>
      <div className="flex items-center gap-2 card px-3 py-2" style={{ boxShadow: 'none' }}>
        <span className="label-tag flex-shrink-0" style={{ color: 'var(--color-faint)', fontSize: '0.65rem' }}>Flying from</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          autoComplete="off"
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setQuery(''); setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-sm font-semibold"
          style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-nunito)', minWidth: 0 }}
        />
        {value && (
          <button onClick={() => { onSelect(''); setQuery(''); setOpen(false); }}
            className="flex-shrink-0 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
            style={{ color: 'var(--color-faint)', background: 'var(--color-border)' }}>✕</button>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute left-0 right-0 card overflow-hidden"
          style={{
            top: 'calc(100% + 6px)',
            zIndex: 1100,
            boxShadow: '0 8px 32px rgba(44,31,20,0.14)',
            border: '1.5px solid var(--color-border)',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {results.map((opt, i) => (
            <button
              key={opt.code}
              onMouseDown={e => { e.preventDefault(); handleSelect(opt); }}
              onMouseEnter={() => setHighlighted(i)}
              className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors duration-75"
              style={{
                background: i === highlighted ? 'var(--color-coral-light)' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{
                  background: opt.isGroup ? 'var(--color-coral-light)' : 'var(--color-border)',
                  color: opt.isGroup ? 'var(--color-coral)' : 'var(--color-muted)',
                }}>
                {opt.isGroup ? '🌐' : '✈️'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink)' }}>{opt.label}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-faint)' }}>{opt.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
