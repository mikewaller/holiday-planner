'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [minDuration, setMinDuration] = useState(3);
  const [maxDuration, setMaxDuration] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (minDuration > maxDuration) {
      setError('Minimum duration cannot exceed maximum duration.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          window_start: windowStart,
          window_end: windowEnd,
          min_duration: minDuration,
          max_duration: maxDuration,
        }),
      });

      if (!res.ok) throw new Error('Failed to create plan');
      const { id, creator_token } = await res.json();

      localStorage.setItem(`creator_token_${id}`, creator_token);
      router.push(`/plan/${id}?creator=${creator_token}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1A1610 0%, #0D0C0A 65%)' }}
    >
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="fade-up fade-up-1 text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-8">
            <span style={{ color: 'var(--color-border-light)' }} className="text-xs tracking-[0.3em] uppercase">✦</span>
            <span className="label-caps" style={{ color: 'var(--color-accent)' }}>Holiday Planner</span>
            <span style={{ color: 'var(--color-border-light)' }} className="text-xs tracking-[0.3em] uppercase">✦</span>
          </div>
          <h1
            className="font-display italic"
            style={{ fontSize: '3.2rem', lineHeight: 1.05, fontWeight: 300, color: 'var(--color-cream)', letterSpacing: '-0.01em' }}
          >
            When are<br />you free?
          </h1>
          <p className="mt-4 text-sm" style={{ color: 'var(--color-muted)', letterSpacing: '0.02em' }}>
            Find the perfect window for everyone.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">

          <div className="fade-up fade-up-2">
            <label className="label-caps block mb-2">Trip name</label>
            <input
              type="text"
              required
              placeholder="e.g. Amalfi Coast, Summer '25"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-line"
            />
          </div>

          <div className="fade-up fade-up-3">
            <label className="label-caps block mb-3">Date window</label>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="label-caps mb-2" style={{ fontSize: '0.6rem', opacity: 0.7 }}>From</p>
                <input
                  type="date"
                  required
                  min={today}
                  value={windowStart}
                  onChange={e => setWindowStart(e.target.value)}
                  className="input-line"
                />
              </div>
              <div>
                <p className="label-caps mb-2" style={{ fontSize: '0.6rem', opacity: 0.7 }}>Until</p>
                <input
                  type="date"
                  required
                  min={windowStart || today}
                  value={windowEnd}
                  onChange={e => setWindowEnd(e.target.value)}
                  className="input-line"
                />
              </div>
            </div>
          </div>

          <div className="fade-up fade-up-4">
            <label className="label-caps block mb-3">Duration (nights)</label>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="label-caps mb-2" style={{ fontSize: '0.6rem', opacity: 0.7 }}>Minimum</p>
                <input
                  type="number"
                  required
                  min={1}
                  max={30}
                  value={minDuration}
                  onChange={e => setMinDuration(Number(e.target.value))}
                  className="input-line"
                />
              </div>
              <div>
                <p className="label-caps mb-2" style={{ fontSize: '0.6rem', opacity: 0.7 }}>Maximum</p>
                <input
                  type="number"
                  required
                  min={1}
                  max={30}
                  value={maxDuration}
                  onChange={e => setMaxDuration(Number(e.target.value))}
                  className="input-line"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="fade-up text-xs" style={{ color: '#C47878' }}>{error}</p>
          )}

          <div className="fade-up fade-up-5 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-sm font-medium tracking-widest uppercase transition-all duration-200 disabled:opacity-40"
              style={{
                background: loading ? 'var(--color-accent-dim)' : 'var(--color-accent)',
                color: 'var(--color-ink)',
                letterSpacing: '0.15em',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#B5804F'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent)'; }}
            >
              {loading ? 'Creating…' : 'Plan this trip →'}
            </button>
          </div>

        </form>

        {/* Footer ornament */}
        <div className="fade-up fade-up-6 mt-16 text-center">
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
            <span className="label-caps" style={{ color: 'var(--color-faint)' }}>
              Share a link · No account needed
            </span>
          </div>
        </div>

      </div>
    </main>
  );
}
