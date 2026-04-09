'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';

export default function NewBoard() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          destination: destination || null,
          window_start: windowStart || null,
          window_end: windowEnd || null,
          creator_name: creatorName || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { id, creator_token } = await res.json();
      localStorage.setItem(`creator_token_board_${id}`, creator_token);
      if (creatorName) {
        localStorage.setItem(`board_member_${id}`, JSON.stringify({ id: null, name: creatorName, participant_token: creator_token }));
        localStorage.setItem(`board_token_${id}_${creatorName}`, creator_token);
      }
      router.push(`/board/${id}?creator=${creator_token}`);
    } catch {
      setError('Something went wrong — please try again.');
      setLoading(false);
    }
  }

  return (
    <main style={{ background: '#FEFDFE' }}>
      <section className="relative min-h-screen flex items-center justify-center p-4 py-12">
        <Nav />
        <div className="relative z-10 w-full max-w-md">

          <div className="text-center mb-8 fade-up fade-up-1">
            <h1 className="font-display" style={{ fontSize: 'clamp(1.8rem, 8vw, 2.8rem)', lineHeight: 1.1, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
              Start a new board
            </h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
              Plan together. Add ideas, links, and polls in one shared space.
            </p>
          </div>

          <div className="fade-up fade-up-2 card p-6" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.10)' }}>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>Board name</label>
                <input type="text" required placeholder="e.g. Barcelona trip, Summer 2026…"
                  value={title} onChange={e => setTitle(e.target.value)} className="field-input" />
              </div>

              <div>
                <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                  Destination <span style={{ color: 'var(--color-faint)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="text" placeholder="e.g. Barcelona, Anywhere warm…"
                  value={destination} onChange={e => setDestination(e.target.value)} className="field-input" />
              </div>

              <div>
                <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                  Rough dates <span style={{ color: 'var(--color-faint)', fontWeight: 400 }}>(optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>From</p>
                    <input type="date" min={today} value={windowStart} onChange={e => setWindowStart(e.target.value)} className="field-input" />
                  </div>
                  <div>
                    <p className="label-tag mb-1" style={{ color: 'var(--color-faint)', fontSize: '0.62rem' }}>To</p>
                    <input type="date" min={windowStart || today} value={windowEnd} onChange={e => setWindowEnd(e.target.value)} className="field-input" />
                  </div>
                </div>
              </div>

              <div>
                <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>Your name</label>
                <input type="text" required placeholder="e.g. Mike"
                  value={creatorName} onChange={e => setCreatorName(e.target.value)} className="field-input" />
              </div>

              {error && <p className="text-sm font-medium" style={{ color: 'var(--color-cantdo)' }}>{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-display font-semibold text-lg transition-all duration-200 disabled:opacity-50"
                style={{ background: 'var(--color-coral)', color: '#fff', letterSpacing: '-0.01em', boxShadow: '0 4px 14px rgba(244,98,31,0.35)' }}>
                {loading ? 'Creating…' : 'Create board →'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
