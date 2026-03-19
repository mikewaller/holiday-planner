'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';

const CYCLING_WORDS = ['plan', 'ski trip', 'summer holiday', 'long weekend', 'city break', 'stag do', 'reunion', 'day out', 'weekend trip', 'spa day', 'hen do'];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [minDuration, setMinDuration] = useState(3);
  const [maxDuration, setMaxDuration] = useState(7);
  const [singleDay, setSingleDay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [wordPhase, setWordPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const interval = setInterval(() => {
      setWordPhase('out');
      setTimeout(() => {
        setWordIndex(i => (i + 1) % CYCLING_WORDS.length);
        setWordPhase('in');
      }, 400);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!singleDay && minDuration > maxDuration) { setError('Minimum nights can\'t exceed maximum.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          window_start: windowStart,
          window_end: windowEnd,
          min_duration: singleDay ? 1 : minDuration,
          max_duration: singleDay ? 1 : maxDuration,
        }),
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
    <main className="relative min-h-screen flex items-center justify-center p-4 py-12 overflow-hidden" style={{ background: '#FEFDFE' }}>
      {/* Background egg art */}
      <img src="/bg-egg.png" alt="" aria-hidden="true"
        style={{ position: 'absolute', left: 'calc(-2% - 30px)', top: '50%', transform: 'translateY(-50%)', width: '136%', height: 'auto', pointerEvents: 'none', userSelect: 'none' }} />
      <Nav />
      <div className="relative z-10 w-full max-w-md">

        {/* Hero text */}
        <div className="fade-up fade-up-1 text-center mb-8">
          <h1
            className="font-display"
            style={{ fontSize: '3rem', lineHeight: 1.1, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}
          >
            Let&apos;s hatch a<br />
            <div style={{ overflow: 'hidden', paddingBottom: '0.2em', marginBottom: '-0.2em', display: 'inline-block' }}>
              <span
                key={wordIndex}
                className={`word-${wordPhase}`}
                style={{ color: 'var(--color-coral)', display: 'inline-block' }}
              >
                {CYCLING_WORDS[wordIndex]}
              </span>
            </div>
          </h1>
          <p className="mt-3 text-base" style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
            Find dates that work for everyone. Share a link. No fuss.
          </p>
        </div>

        {/* Form card */}
        <div className="fade-up fade-up-2 card p-6 shadow-lg" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.10)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                Plan name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Summer holiday, Mike's birthday, Team away day…"
                value={name}
                onChange={e => setName(e.target.value)}
                className="field-input"
              />
            </div>

            {/* Single day toggle */}
            <button
              type="button"
              onClick={() => setSingleDay(v => !v)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div
                className="flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 relative"
                style={{ background: singleDay ? 'var(--color-coral)' : 'var(--color-border-mid)' }}
              >
                <div
                  className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                  style={{ left: singleDay ? '1.25rem' : '0.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-nunito)' }}>
                  Single day event
                </p>
                <p className="text-xs" style={{ color: 'var(--color-faint)' }}>
                  Just picking one day, not an overnight trip
                </p>
              </div>
            </button>

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

            {!singleDay && (
              <div>
                <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                  Length (nights)
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
            )}

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
              {loading ? 'Creating…' : 'Start planning →'}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <div className="fade-up fade-up-3 mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--color-faint)' }}>
            Your link works for everyone — no sign-up needed 🥚
          </p>
        </div>

      </div>
    </main>
  );
}
