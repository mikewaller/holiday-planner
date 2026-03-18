'use client';

import { Suspense, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { format, parseISO, addDays } from 'date-fns';
import dynamic from 'next/dynamic';
import Nav from '@/components/Nav';
import type { FlightDestination } from '@/components/FlightMap';

const FlightMap = dynamic(() => import('@/components/FlightMap'), { ssr: false });

// ─── Climate helpers ──────────────────────────────────────────────────────────

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

// ─── Known mode ──────────────────────────────────────────────────────────────

function KnownDestination({
  planId, bookParams, startDate, endDate, nights, checkin, checkout,
}: {
  planId: string; bookParams: string; startDate: Date | null; endDate: Date | null;
  nights: number; checkin: string; checkout: string;
}) {
  const [destination, setDestination] = useState('');
  const bookingUrl = destination.trim()
    ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination.trim())}&checkin=${checkin}&checkout=${checkout}&group_adults=2&no_rooms=1`
    : null;

  return (
    <main className="dot-bg min-h-screen p-4 py-12">
      <Nav />
      <div className="w-full max-w-lg mx-auto">
        <div className="fade-up fade-up-1 text-center mb-8">
          <a href={`/plan/${planId}/book?${bookParams}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
            <span style={{ fontSize: '0.7rem' }}>✈️</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>← Back</span>
          </a>
          <div className="text-5xl mb-4">🗺️</div>
          <h1 className="font-display font-bold" style={{ fontSize: '2.2rem', lineHeight: 1.1, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Where are you headed?
          </h1>
          {startDate && endDate && (
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-coral)' }}>
              {format(startDate, 'd MMM')} – {format(endDate, 'd MMM yyyy')} · {nights} night{nights !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="fade-up fade-up-2 card p-6" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.08)' }}>
          <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>Destination</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Barcelona, Lisbon, Tokyo…"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && bookingUrl) window.open(bookingUrl, '_blank'); }}
              className="field-input flex-1"
            />
            <a
              href={bookingUrl ?? '#'}
              onClick={e => { if (!bookingUrl) e.preventDefault(); }}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 rounded-xl font-display font-semibold text-white transition-all duration-150 flex items-center flex-shrink-0"
              style={{
                background: bookingUrl ? 'var(--color-coral)' : 'var(--color-border)',
                boxShadow: bookingUrl ? '0 3px 10px rgba(244,98,31,0.3)' : 'none',
                textDecoration: 'none',
                opacity: bookingUrl ? 1 : 0.5,
              }}
            >
              Search →
            </a>
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--color-faint)' }}>
            Your dates ({checkin} → {checkout}) will be pre-filled on Booking.com.
          </p>
        </div>
      </div>
    </main>
  );
}

// ─── Flight list (shared between desktop panel and mobile sheet) ─────────────

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
                    className="flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{ background: 'var(--color-coral)', color: '#fff', textDecoration: 'none' }}>
                    View flights →
                  </a>
                  <a href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest.city)}&checkin=${dest.departureDate}&checkout=${dest.returnDate}&group_adults=2`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)', textDecoration: 'none' }}>
                    Hotels
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

// ─── Discover mode ────────────────────────────────────────────────────────────

type SortKey = 'price_asc' | 'price_desc' | 'temp_asc' | 'temp_desc';

function DiscoverDestination({
  planId, bookParams, startDate, endDate, nights,
}: {
  planId: string; bookParams: string; startDate: Date | null; endDate: Date | null; nights: number;
}) {
  const [origin, setOrigin] = useState('');
  const [originInput, setOriginInput] = useState('');
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
  const listRef = useRef<HTMLDivElement>(null);

  const departureDate = startDate ? format(startDate, 'yyyy-MM-dd') : '';
  const duration = nights.toString();

  async function search() {
    if (!origin || !departureDate) return;
    setLoading(true); setError(''); setDestinations([]); setSelected(null);
    try {
      const res = await fetch(`/api/flight-destinations?origin=${origin}&departureDate=${departureDate}&duration=${duration}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to fetch');
      }
      const data: FlightDestination[] = await res.json();
      if (data.length === 0) { setError('No flights found from this origin. Try a different airport code.'); setLoading(false); return; }
      const prices = data.map(d => d.price);
      const highest = Math.max(...prices);
      setMaxPriceMax(highest);
      setMaxPrice(highest);
      setMinTempFilter(0);
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
      const aTemp = a.climate?.avgHigh ?? 0;
      const bTemp = b.climate?.avgHigh ?? 0;
      if (sort === 'temp_asc') return aTemp - bTemp;
      return bTemp - aTemp; // temp_desc
    });

  const currency = '£'; // Could be made dynamic

  return (
    <main className="dot-bg min-h-screen flex flex-col" style={{ height: '100dvh' }}>
      <Nav />

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 px-4 pt-6 pb-3 max-w-none">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <a href={`/plan/${planId}/book?${bookParams}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
            <span style={{ fontSize: '0.7rem' }}>✈️</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>← Back</span>
          </a>
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Find your destination
          </h1>
          {startDate && endDate && (
            <span className="label-tag px-2.5 py-1 rounded-full" style={{ background: 'var(--color-coral-light)', color: 'var(--color-coral)' }}>
              {format(startDate, 'd MMM')} – {format(endDate, 'd MMM yyyy')} · {nights}n
            </span>
          )}
        </div>

        {/* Search bar */}
        <div className="flex gap-2 items-center overflow-x-auto pb-0.5">
          <div className="flex items-center gap-2 card px-3 py-2 flex-shrink-0" style={{ boxShadow: 'none', minWidth: '160px' }}>
            <span className="label-tag flex-shrink-0" style={{ color: 'var(--color-faint)' }}>Flying from</span>
            <input
              type="text"
              placeholder="LHR…"
              value={originInput}
              onChange={e => setOriginInput(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') { setOrigin(originInput); setTimeout(search, 0); } }}
              className="flex-1 bg-transparent outline-none text-sm font-semibold"
              style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-nunito)', minWidth: 0, width: '3rem' }}
              maxLength={3}
            />
          </div>
          <button
            onClick={() => { setOrigin(originInput); setTimeout(search, 0); }}
            disabled={loading || !originInput || !departureDate}
            className="px-5 py-2.5 rounded-xl font-display font-semibold text-white transition-all duration-150 disabled:opacity-40 flex-shrink-0"
            style={{ background: 'var(--color-coral)', boxShadow: '0 3px 10px rgba(244,98,31,0.3)' }}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>

          {/* Desktop-only filters inline */}
          {destinations.length > 0 && (
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                className="card px-3 py-2.5 text-sm font-semibold outline-none cursor-pointer"
                style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-nunito)', boxShadow: 'none', border: '1.5px solid var(--color-border)' }}
              >
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

      {/* ── Main split area ── */}
      {destinations.length === 0 && !loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl mb-4">🧭</div>
            <p className="font-display font-bold text-xl mb-2" style={{ color: 'var(--color-ink)' }}>Enter your departure airport</p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Use the IATA code — e.g. <span style={{ fontWeight: 600 }}>LHR</span> for London Heathrow,{' '}
              <span style={{ fontWeight: 600 }}>JFK</span> for New York.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-0 overflow-hidden relative">

          {/* Map — full width on mobile, flex-1 on desktop */}
          <div className="flex-1 p-3 md:pr-1.5" style={{ minWidth: 0 }}>
            <div style={{ height: '100%', borderRadius: '16px', overflow: 'hidden', border: '1.5px solid var(--color-border)' }}>
              <FlightMap
                destinations={sorted}
                selected={selected}
                onSelect={handleSelect}
                currency={currency}
                colorBy={colorBy}
              />
            </div>
          </div>

          {/* Desktop flight list — side panel */}
          <div className="hidden md:block flex-shrink-0 overflow-y-auto p-3 pl-1.5" style={{ width: '320px' }} ref={listRef}>
            <FlightList sorted={sorted} selected={selected} origin={origin} currency={currency} onSelect={handleSelect} />
          </div>

          {/* Mobile FAB — toggle panel */}
          {sorted.length > 0 && (
            <button
              onClick={() => setShowPanel(true)}
              className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full font-display font-semibold text-white shadow-lg"
              style={{ background: 'var(--color-ink)', boxShadow: '0 4px 20px rgba(44,31,20,0.35)', zIndex: 1000 }}
            >
              <span>✈️</span>
              <span>{sorted.length} destination{sorted.length !== 1 ? 's' : ''}</span>
              <span style={{ opacity: 0.6 }}>↑</span>
            </button>
          )}

          {/* Mobile bottom sheet */}
          <div
            className="md:hidden fixed inset-0 z-40 transition-opacity duration-300"
            style={{ background: 'rgba(0,0,0,0.4)', opacity: showPanel ? 1 : 0, pointerEvents: showPanel ? 'auto' : 'none' }}
            onClick={() => setShowPanel(false)}
          />
          <div
            className="md:hidden fixed left-0 right-0 bottom-0 z-50 flex flex-col"
            style={{
              height: '80dvh',
              background: 'var(--color-bg)',
              borderRadius: '20px 20px 0 0',
              boxShadow: '0 -8px 40px rgba(44,31,20,0.18)',
              transform: showPanel ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {/* Sheet header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-display font-bold text-base" style={{ color: 'var(--color-ink)' }}>
                  {sorted.length} destination{sorted.length !== 1 ? 's' : ''}
                </p>
                <button onClick={() => setShowPanel(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>✕</button>
              </div>
              {/* Filters inside sheet on mobile */}
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
                  <div className="flex-1 flex items-center gap-2 card px-3 py-2" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)' }}>
                    <span className="label-tag flex-shrink-0" style={{ color: 'var(--color-faint)' }}>Max {currency}{maxPrice === maxPriceMax ? '∞' : maxPrice}</span>
                    <input type="range" min={0} max={maxPriceMax} step={10} value={maxPrice}
                      onChange={e => setMaxPrice(Number(e.target.value))}
                      className="flex-1" style={{ accentColor: 'var(--color-coral)' }} />
                  </div>
                  <div className="flex-1 flex items-center gap-2 card px-3 py-2" style={{ boxShadow: 'none', border: '1.5px solid var(--color-border)' }}>
                    <span className="label-tag flex-shrink-0" style={{ color: 'var(--color-faint)' }}>Min {minTempFilter}°C</span>
                    <input type="range" min={0} max={40} step={5} value={minTempFilter}
                      onChange={e => setMinTempFilter(Number(e.target.value))}
                      className="flex-1" style={{ accentColor: 'var(--color-coral)' }} />
                  </div>
                </div>
              </div>
            </div>
            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-3" ref={listRef}>
              <FlightList sorted={sorted} selected={selected} origin={origin} currency={currency} onSelect={(iata) => { handleSelect(iata); setShowPanel(false); }} />
            </div>
          </div>

        </div>
      )}
    </main>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

function DestinationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const mode = searchParams.get('mode') ?? 'known';
  const start = searchParams.get('start') ?? '';
  const nights = Number(searchParams.get('nights') ?? 1);

  const bookParams = `start=${start}&nights=${nights}`;
  const startDate = start ? parseISO(start) : null;
  const endDate = startDate ? addDays(startDate, nights - 1) : null;
  const checkin = startDate ? format(startDate, 'yyyy-MM-dd') : '';
  const checkout = endDate ? format(addDays(endDate, 1), 'yyyy-MM-dd') : '';

  if (mode === 'known') {
    return (
      <KnownDestination
        planId={planId} bookParams={bookParams}
        startDate={startDate} endDate={endDate}
        nights={nights} checkin={checkin} checkout={checkout}
      />
    );
  }

  return (
    <DiscoverDestination
      planId={planId} bookParams={bookParams}
      startDate={startDate} endDate={endDate}
      nights={nights}
    />
  );
}

export default function DestinationPage() {
  return (
    <Suspense fallback={
      <main className="dot-bg min-h-screen flex items-center justify-center">
        <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-muted)' }}>Loading…</p>
      </main>
    }>
      <DestinationContent />
    </Suspense>
  );
}
