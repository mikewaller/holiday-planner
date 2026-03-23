'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, addDays, parseISO } from 'date-fns';
import dynamic from 'next/dynamic';
import Nav from '@/components/Nav';
import AirportAutocomplete from '@/components/AirportAutocomplete';
import type { FlightDestination } from '@/components/FlightMap';

const FlightMap = dynamic(() => import('@/components/FlightMap'), { ssr: false });

// ─── Climate helpers (duplicated from destination page) ────────────────────────

function climateEmoji(avgHigh: number, rainyDays: number): string {
  if (avgHigh >= 30 && rainyDays <= 5) return '☀️';
  if (avgHigh >= 25 && rainyDays <= 8) return '🌤️';
  if (avgHigh >= 20) return '⛅';
  if (avgHigh < 10) return '❄️';
  if (rainyDays > 12) return '🌧️';
  return '🌦️';
}

function climateLabel(avgHigh: number, rainyDays: number): string {
  if (avgHigh >= 35) return 'Very hot';
  if (avgHigh >= 30 && rainyDays <= 5) return 'Hot & dry';
  if (avgHigh >= 25 && rainyDays <= 8) return 'Warm & sunny';
  if (avgHigh >= 25) return 'Warm';
  if (avgHigh >= 20) return 'Mild';
  if (avgHigh >= 15) return 'Cool';
  if (avgHigh >= 10) return 'Cold';
  return 'Very cold';
}

type SortKey = 'price_asc' | 'price_desc' | 'temp_asc' | 'temp_desc';

// ─── Flight list ───────────────────────────────────────────────────────────────

function FlightList({ sorted, selected, origin, currency, onSelect }: {
  sorted: FlightDestination[];
  selected: string | null;
  origin: string;
  currency: string;
  onSelect: (iata: string) => void;
}) {
  if (sorted.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>No results match your filter.</p>;
  }
  return (
    <div className="space-y-2">
      {sorted.map((dest, i) => {
        const isSelected = dest.destination === selected;
        const flightsUrl = `https://www.google.com/flights#flt=${origin}.${dest.destination}.${dest.departureDate}*${dest.destination}.${origin}.${dest.returnDate};tt:o`;
        return (
          <div
            key={dest.destination}
            data-iata={dest.destination}
            onClick={() => onSelect(dest.destination)}
            className="card px-4 py-3 cursor-pointer transition-all duration-150"
            style={{
              border: isSelected ? '1.5px solid var(--color-coral)' : '1.5px solid var(--color-border)',
              boxShadow: isSelected ? '0 4px 16px rgba(244,98,31,0.15)' : 'none',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="label-tag flex-shrink-0" style={{ color: 'var(--color-faint)', minWidth: '1.4rem' }}>#{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--color-ink)' }}>{dest.city}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{dest.country} · {dest.destination}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-display font-bold text-base" style={{ color: 'var(--color-coral)' }}>{currency}{dest.price.toFixed(0)}</p>
                {dest.climate ? (
                  <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                    {climateEmoji(dest.climate.avgHigh, dest.climate.rainyDays)} ~{dest.climate.avgHigh}°C
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--color-faint)' }}>per person</p>
                )}
              </div>
            </div>
            {isSelected && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                {dest.climate && (
                  <div className="mb-3 px-1 flex items-center gap-3">
                    <span style={{ fontSize: '1.3rem' }}>{climateEmoji(dest.climate.avgHigh, dest.climate.rainyDays)}</span>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>
                        {climateLabel(dest.climate.avgHigh, dest.climate.rainyDays)} · {dest.climate.avgLow}–{dest.climate.avgHigh}°C
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-faint)' }}>
                        ~{dest.climate.rainyDays} rainy day{dest.climate.rainyDays !== 1 ? 's' : ''} · 10-year avg
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <a href={flightsUrl} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-center py-2 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--color-coral)', color: '#fff', textDecoration: 'none' }}>
                    View flights →
                  </a>
                  <a href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest.city)}&checkin=${dest.departureDate}&checkout=${dest.returnDate}&group_adults=2`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-center py-2 rounded-lg text-xs font-semibold"
                    style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)', textDecoration: 'none' }}>
                    Accommodation
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main explore content ──────────────────────────────────────────────────────

function ExploreContent() {
  const searchParams = useSearchParams();

  // Pre-populate from plan flow if params are present
  const paramStart = searchParams.get('start') ?? '';
  const paramNights = searchParams.get('nights') ?? '';
  const today = new Date().toISOString().split('T')[0];

  const [departureDate, setDepartureDate] = useState(paramStart || today);
  const [nights, setNights] = useState(paramNights ? Number(paramNights) : 7);
  const [origin, setOrigin] = useState('');
  const [destinations, setDestinations] = useState<FlightDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('price_asc');
  const [maxPrice, setMaxPrice] = useState<number>(9999);
  const [maxPriceMax, setMaxPriceMax] = useState<number>(9999);
  const [minTempFilter, setMinTempFilter] = useState<number>(0);
  const [colorBy, setColorBy] = useState<'price' | 'temp'>('price');
  const [showPanel, setShowPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const returnDate = format(addDays(parseISO(departureDate), nights), 'yyyy-MM-dd');
  const prePopulated = !!(paramStart && paramNights);

  async function search(code?: string) {
    const searchOrigin = code ?? origin;
    if (!searchOrigin || !departureDate) return;
    setLoading(true); setError(''); setDestinations([]); setSelected(null);
    try {
      const res = await fetch(`/api/flight-destinations?origin=${searchOrigin}&departureDate=${departureDate}&duration=${nights}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to fetch');
      }
      const data: FlightDestination[] = await res.json();
      if (data.length === 0) { setError('No flights found from this airport. Try a different one.'); setLoading(false); return; }
      const highest = Math.max(...data.map(d => d.price));
      setMaxPriceMax(highest); setMaxPrice(highest); setMinTempFilter(0);
      setDestinations(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(iata: string) {
    setSelected(iata);
    setShowPanel(true);
    setTimeout(() => {
      const el = listRef.current?.querySelector(`[data-iata="${iata}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  const sorted = [...destinations]
    .filter(d => d.price <= maxPrice)
    .filter(d => !d.climate || d.climate.avgHigh >= minTempFilter)
    .sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      const aT = a.climate?.avgHigh ?? 0, bT = b.climate?.avgHigh ?? 0;
      return sort === 'temp_asc' ? aT - bT : bT - aT;
    });

  const currency = '£';

  return (
    <main className="dot-bg min-h-screen flex flex-col" style={{ height: '100dvh' }}>
      <Nav />

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-4 pt-6 pb-3">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <a href="/"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
            <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>← Hatch a Plan</span>
          </a>
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Explore flights
          </h1>
          {prePopulated && (
            <span className="label-tag px-2.5 py-1 rounded-full" style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)' }}>
              From your plan
            </span>
          )}
        </div>

        {/* Date + nights row */}
        <div className="flex gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2 card px-3 py-2 flex-shrink-0" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)' }}>
            <span className="label-tag" style={{ color: 'var(--color-faint)', fontSize: '0.65rem' }}>Departing</span>
            <input
              type="date"
              value={departureDate}
              min={today}
              onChange={e => { setDepartureDate(e.target.value); setDestinations([]); }}
              className="bg-transparent outline-none text-sm font-semibold"
              style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-nunito)', colorScheme: 'light' }}
            />
          </div>
          <div className="flex items-center gap-2 card px-3 py-2 flex-shrink-0" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)' }}>
            <span className="label-tag" style={{ color: 'var(--color-faint)', fontSize: '0.65rem' }}>Nights</span>
            <input
              type="number"
              min={1}
              max={30}
              value={nights}
              onChange={e => { setNights(Number(e.target.value)); setDestinations([]); }}
              className="bg-transparent outline-none text-sm font-semibold w-10 text-center"
              style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-nunito)' }}
            />
          </div>
          {departureDate && nights > 0 && (
            <span className="label-tag self-center px-2.5 py-1 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
              Returns {format(addDays(parseISO(departureDate), nights), 'd MMM yyyy')}
            </span>
          )}
        </div>

        {/* Airport + search */}
        <div className="flex gap-2 items-center flex-wrap">
          <AirportAutocomplete
            value={origin}
            onSelect={code => { setOrigin(code); if (code && departureDate) search(code); }}
          />
          <button
            onClick={() => search()}
            disabled={loading || !origin || !departureDate}
            className="px-5 py-2.5 rounded-xl font-display font-semibold text-white transition-all duration-150 disabled:opacity-40 flex-shrink-0"
            style={{ background: 'var(--color-coral)', boxShadow: '0 3px 10px rgba(244,98,31,0.3)' }}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>

          {/* Desktop filters */}
          {destinations.length > 0 && !isMobile && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
                className="card px-3 py-2.5 text-sm font-semibold outline-none cursor-pointer"
                style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-nunito)', boxShadow: 'none', border: '1.5px solid var(--color-border)' }}>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="temp_desc">Hottest first</option>
                <option value="temp_asc">Coolest first</option>
              </select>
              <div className="flex items-center gap-2 card px-3 py-2" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)' }}>
                <span className="label-tag" style={{ color: 'var(--color-faint)', whiteSpace: 'nowrap' }}>Max {currency}{maxPrice === maxPriceMax ? '∞' : maxPrice}</span>
                <input type="range" min={0} max={maxPriceMax} step={10} value={maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value))}
                  style={{ width: '80px', accentColor: 'var(--color-coral)' }} />
              </div>
              <div className="flex items-center gap-2 card px-3 py-2" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)' }}>
                <span className="label-tag" style={{ color: 'var(--color-faint)', whiteSpace: 'nowrap' }}>Min {minTempFilter}°C</span>
                <input type="range" min={0} max={40} step={5} value={minTempFilter}
                  onChange={e => setMinTempFilter(Number(e.target.value))}
                  style={{ width: '80px', accentColor: 'var(--color-coral)' }} />
              </div>
              <div className="flex items-center gap-1 card px-1 py-1" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)', borderRadius: '10px' }}>
                {(['price', 'temp'] as const).map(mode => (
                  <button key={mode} onClick={() => setColorBy(mode)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{ background: colorBy === mode ? 'var(--color-ink)' : 'transparent', color: colorBy === mode ? '#fff' : 'var(--color-muted)' }}>
                    {mode === 'price' ? '💰 Price' : '🌡️ Temp'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-2 text-sm font-medium" style={{ color: 'var(--color-cantdo)' }}>{error}</p>}
      </div>

      {/* ── Map + list ── */}
      {destinations.length === 0 && !loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl mb-4">🧭</div>
            <p className="font-display font-bold text-xl mb-2" style={{ color: 'var(--color-ink)' }}>Where do you want to go?</p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Pick your dates above, then enter a departure airport to see cheap flights.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-0 overflow-hidden relative">
          <div className="flex-1 p-3 md:pr-1.5" style={{ minWidth: 0 }}>
            <div style={{ height: '100%', borderRadius: '16px', overflow: 'hidden', border: '1.5px solid var(--color-border)' }}>
              <FlightMap destinations={sorted} selected={selected} onSelect={handleSelect} currency={currency} colorBy={colorBy} />
            </div>
          </div>

          {!isMobile && (
            <div className="flex-shrink-0 overflow-y-auto p-3 pl-1.5" style={{ width: '320px' }} ref={listRef}>
              <FlightList sorted={sorted} selected={selected} origin={origin} currency={currency} onSelect={handleSelect} />
            </div>
          )}

          {isMobile && sorted.length > 0 && (
            <button
              onClick={() => setShowPanel(true)}
              className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full font-display font-semibold text-white"
              style={{ background: 'var(--color-ink)', boxShadow: '0 4px 20px rgba(44,31,20,0.35)', zIndex: 999, bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
              <span>✈️</span>
              <span>{sorted.length} destination{sorted.length !== 1 ? 's' : ''}</span>
              <span style={{ opacity: 0.6 }}>↑</span>
            </button>
          )}

          {isMobile && (
            <div className="fixed inset-0 transition-opacity duration-300"
              style={{ background: 'rgba(0,0,0,0.4)', opacity: showPanel ? 1 : 0, pointerEvents: showPanel ? 'auto' : 'none', zIndex: 900 }}
              onClick={() => setShowPanel(false)} />
          )}
          {isMobile && (
            <div className="fixed left-0 right-0 bottom-0 flex flex-col"
              style={{
                height: '80dvh', background: 'var(--color-bg)', borderRadius: '20px 20px 0 0',
                boxShadow: '0 -8px 40px rgba(44,31,20,0.18)',
                transform: showPanel ? `translateY(${Math.max(0, dragY)}px)` : 'translateY(100%)',
                transition: dragStartY.current !== null ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                zIndex: 1000, paddingBottom: 'env(safe-area-inset-bottom)', overscrollBehavior: 'none',
              }}>
              <div className="flex-shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }}
                onTouchStart={e => { dragStartY.current = e.touches[0].clientY; setDragY(0); }}
                onTouchMove={e => { if (dragStartY.current === null) return; setDragY(e.touches[0].clientY - dragStartY.current); }}
                onTouchEnd={() => { if (dragY > 80) setShowPanel(false); dragStartY.current = null; setDragY(0); }}>
                <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--color-border)' }} />
              </div>
              <div className="flex-shrink-0 px-4 pt-2 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display font-bold text-base" style={{ color: 'var(--color-ink)' }}>{sorted.length} destination{sorted.length !== 1 ? 's' : ''}</p>
                  <button onClick={() => setShowPanel(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>✕</button>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
                      className="flex-1 card px-3 py-2 text-sm font-semibold outline-none cursor-pointer"
                      style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-nunito)', boxShadow: 'none', border: '1.5px solid var(--color-border)' }}>
                      <option value="price_asc">Price: Low → High</option>
                      <option value="price_desc">Price: High → Low</option>
                      <option value="temp_desc">Hottest first</option>
                      <option value="temp_asc">Coolest first</option>
                    </select>
                    <div className="flex items-center gap-1 card px-1 py-1 flex-shrink-0" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)', borderRadius: '10px' }}>
                      {(['price', 'temp'] as const).map(mode => (
                        <button key={mode} onClick={() => setColorBy(mode)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                          style={{ background: colorBy === mode ? 'var(--color-ink)' : 'transparent', color: colorBy === mode ? '#fff' : 'var(--color-muted)' }}>
                          {mode === 'price' ? '💰' : '🌡️'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 flex items-center gap-2 card px-3 py-2" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)', overflow: 'hidden', minWidth: 0 }}>
                      <span className="label-tag flex-shrink-0" style={{ color: 'var(--color-faint)' }}>Max {currency}{maxPrice === maxPriceMax ? '∞' : maxPrice}</span>
                      <input type="range" min={0} max={maxPriceMax} step={10} value={maxPrice}
                        onChange={e => setMaxPrice(Number(e.target.value))}
                        style={{ accentColor: 'var(--color-coral)', flex: 1, minWidth: 0, width: 0 }} />
                    </div>
                    <div className="flex-1 flex items-center gap-2 card px-3 py-2" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)', overflow: 'hidden', minWidth: 0 }}>
                      <span className="label-tag flex-shrink-0" style={{ color: 'var(--color-faint)' }}>Min {minTempFilter}°C</span>
                      <input type="range" min={0} max={40} step={5} value={minTempFilter}
                        onChange={e => setMinTempFilter(Number(e.target.value))}
                        style={{ accentColor: 'var(--color-coral)', flex: 1, minWidth: 0, width: 0 }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3" ref={listRef}>
                <FlightList sorted={sorted} selected={selected} origin={origin} currency={currency} onSelect={handleSelect} />
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <main className="dot-bg min-h-screen flex items-center justify-center">
        <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-muted)' }}>Loading…</p>
      </main>
    }>
      <ExploreContent />
    </Suspense>
  );
}
