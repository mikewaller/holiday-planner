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
  const [showHowItWorks, setShowHowItWorks] = useState(false);

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

  const steps = [
    {
      emoji: '🗓️',
      title: 'Create a plan',
      body: 'Give your plan a name, set a window of dates, and choose how long you want to go for.',
    },
    {
      emoji: '🔗',
      title: 'Share the link',
      body: 'Send a link to your group. Everyone can join and add their availability; no need to sign up. Your plan will always be available on this link.',
    },
    {
      emoji: '📅',
      title: 'Mark your dates',
      body: 'Everyone taps the dates they\'re available. Three options: Preferred (when you really want to go), Free (works for me), or Can\'t do (not available).',
    },
    {
      emoji: '✨',
      title: 'See what works',
      body: 'Hatchd finds the windows that work best for the whole group — ranked by who can make it and when everyone\'s most keen.',
    },
    {
      emoji: '✈️',
      title: 'Book it',
      body: 'Once you\'ve agreed on dates, search flights and accommodation directly from the app. Job done.',
    },
  ];

  return (
    <main style={{ background: '#FEFDFE' }}>

      {/* ── Hero section ── */}
      <section className="relative min-h-screen flex items-center justify-center p-4 py-12 overflow-hidden">
        {/* Background egg art */}
        <img src="/bg-egg.png" alt="" aria-hidden="true"
          className="hidden md:block"
          style={{ position: 'absolute', left: 'calc(-2% - 30px)', top: '50%', transform: 'translateY(-50%)', width: '136%', height: 'auto', pointerEvents: 'none', userSelect: 'none', opacity: 0.65 }} />
        <Nav />
        <div className="relative z-10 w-full max-w-md">

        {/* Hero text */}
        <div className="fade-up fade-up-1 text-center mb-8">
          <h1
            className="font-display"
            style={{ fontSize: '3rem', lineHeight: 1.1, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}
          >
            Let&apos;s hatch a<br />
            <div style={{ overflow: 'hidden', padding: '0.1em 0.2em 0.2em 0.1em', margin: '-0.1em -0.2em -0.2em -0.1em', display: 'inline-block' }}>
              <span
                key={wordIndex}
                className={`word-${wordPhase}`}
                style={{ color: 'var(--color-coral)', display: 'inline-block', fontStyle: 'italic' }}
              >
                {CYCLING_WORDS[wordIndex]}
              </span>
            </div>
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
            Find dates that work for everyone. Share a link. No sign-up, no fuss.
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
                placeholder="e.g. Summer holiday, ski trip 2027, Team away day…"
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

        {/* Secondary CTAs */}
        <div className="fade-up fade-up-3 mt-6 text-center">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              className="text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-coral)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              How does Hatchd work?
            </button>
            <span style={{ color: 'var(--color-border-mid)' }}>·</span>
            <a
              href="/explore"
              className="text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-muted)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Just browsing? Explore flights ✈️
            </a>
          </div>
        </div>

        </div>
      </section>

      {/* ── How hatchd works modal ── */}
      {showHowItWorks && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(44,31,20,0.55)', zIndex: 2000, backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowHowItWorks(false); }}
        >
          <div className="card w-full max-w-md fade-up fade-up-1" style={{ boxShadow: '0 16px 48px rgba(44,31,20,0.22)', maxHeight: '90dvh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: '1.5px solid var(--color-border)' }}>
              <h2 className="font-display font-bold text-xl" style={{ color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
                How Hatchd works
              </h2>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0"
                style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}
              >✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'var(--color-coral-light)' }}>
                    {step.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="label-tag" style={{ color: 'var(--color-coral)' }}>0{i + 1}</span>
                      <p className="font-display font-bold text-base" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>{step.title}</p>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-muted)', lineHeight: 1.5 }}>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-full py-3 rounded-xl font-display font-semibold text-base transition-all duration-150"
                style={{ background: 'var(--color-coral)', color: '#fff', boxShadow: '0 4px 14px rgba(244,98,31,0.3)' }}
              >
                Got it — let&apos;s go →
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
