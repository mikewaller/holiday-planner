'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [minDuration, setMinDuration] = useState(3);
  const [maxDuration, setMaxDuration] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setAuthed(!!user));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (minDuration > maxDuration) { setError('Minimum nights can\'t exceed maximum.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, window_start: windowStart, window_end: windowEnd, min_duration: minDuration, max_duration: maxDuration }),
      });
      if (!res.ok) throw new Error();
      const { id, creator_token } = await res.json();
      localStorage.setItem(`creator_token_${id}`, creator_token);
      router.push(`/plan/${id}?creator=${creator_token}`);
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <main className="dot-bg min-h-screen flex items-center justify-center p-4 py-12">
      {/* Nav */}
      {authed !== null && (
        <div className="fixed top-4 right-4 z-50">
          {authed ? (
            <a href="/my-trips"
              className="label-tag px-4 py-2.5 rounded-xl transition-all duration-150 inline-flex items-center gap-1.5"
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)', textDecoration: 'none', boxShadow: '0 2px 8px rgba(44,31,20,0.08)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border-mid)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border)'; }}
            >
              My trips →
            </a>
          ) : (
            <a href="/login"
              className="label-tag px-4 py-2.5 rounded-xl transition-all duration-150 inline-flex items-center gap-1.5"
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)', textDecoration: 'none', boxShadow: '0 2px 8px rgba(44,31,20,0.08)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border-mid)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border)'; }}
            >
              Sign in
            </a>
          )}
        </div>
      )}
      <div className="w-full max-w-md">

        {/* Hero text */}
        <div className="fade-up fade-up-1 text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.2)' }}
          >
            <span style={{ fontSize: '0.75rem' }}>✈️</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', letterSpacing: '0.06em' }}>
              Holiday Planner
            </span>
          </div>
          <h1
            className="font-display"
            style={{ fontSize: '3rem', lineHeight: 1.1, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}
          >
            Let&apos;s find when<br />
            <span style={{ color: 'var(--color-coral)' }}>everyone</span> can go
          </h1>
          <p className="mt-3 text-base" style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
            Share a link. No accounts. No fuss.
          </p>
        </div>

        {/* Form card */}
        <div className="fade-up fade-up-2 card p-6 shadow-lg" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.10)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                Trip name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Amalfi Coast, Summer '25"
                value={name}
                onChange={e => setName(e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                Date window
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>Earliest</p>
                  <input type="date" required min={today} value={windowStart} onChange={e => setWindowStart(e.target.value)} className="field-input" />
                </div>
                <div>
                  <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>Latest</p>
                  <input type="date" required min={windowStart || today} value={windowEnd} onChange={e => setWindowEnd(e.target.value)} className="field-input" />
                </div>
              </div>
            </div>

            <div>
              <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                Trip length (nights)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>Minimum</p>
                  <input type="number" required min={1} max={30} value={minDuration} onChange={e => setMinDuration(Number(e.target.value))} className="field-input" />
                </div>
                <div>
                  <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>Maximum</p>
                  <input type="number" required min={1} max={30} value={maxDuration} onChange={e => setMaxDuration(Number(e.target.value))} className="field-input" />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium" style={{ color: 'var(--color-cantdo)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-display font-semibold text-lg transition-all duration-200 disabled:opacity-50"
              style={{
                background: loading ? 'var(--color-coral-dim)' : 'var(--color-coral)',
                color: '#FFFFFF',
                letterSpacing: '-0.01em',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(244,98,31,0.35)',
              }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral-dim)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(244,98,31,0.25)'; }}}
              onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(244,98,31,0.35)'; }}}
            >
              {loading ? 'Creating your plan…' : 'Plan this trip ✈'}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <div className="fade-up fade-up-3 mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--color-faint)' }}>
            Your link works for everyone — no sign-up needed
          </p>
        </div>

      </div>
    </main>
  );
}
