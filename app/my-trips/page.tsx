'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO } from 'date-fns';

interface Plan {
  id: string;
  name: string;
  window_start: string;
  window_end: string;
  min_duration: number;
  max_duration: number;
  creator_token: string;
  is_locked: number;
  created_at: string;
}

export default function MyTripsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUserEmail(user.email ?? '');
    });

    fetch('/api/my-trips').then(r => r.json()).then(data => {
      setPlans(data.plans ?? []);
      setLoading(false);
    });
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <main className="dot-bg min-h-screen p-4 pb-16">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="fade-up fade-up-1 pt-8 pb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <a href="/" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4"
              style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)' }}>
              <span style={{ fontSize: '0.7rem' }}>✈️</span>
              <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>Holiday Planner</span>
            </a>
            <h1 className="font-display font-bold" style={{ fontSize: '2.2rem', lineHeight: 1.1, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
              My trips
            </h1>
            {userEmail && (
              <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>{userEmail}</p>
            )}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <a href="/"
              className="label-tag px-4 py-2.5 rounded-xl transition-all duration-150 inline-flex items-center gap-1.5"
              style={{ background: 'var(--color-coral)', color: '#fff', boxShadow: '0 4px 14px rgba(244,98,31,0.35)', textDecoration: 'none' }}
            >
              + New trip
            </a>
            <button onClick={signOut}
              className="label-tag px-4 py-2.5 rounded-xl transition-all duration-150"
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)' }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Plans list */}
        {loading ? (
          <div className="fade-up fade-up-2 card p-8 text-center">
            <p className="font-display text-xl" style={{ color: 'var(--color-muted)' }}>Loading your trips…</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="fade-up fade-up-2 card p-10 text-center">
            <p className="text-4xl mb-4">🌍</p>
            <h2 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--color-ink)' }}>No trips yet</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>Plans you create while signed in will appear here.</p>
            <a href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-display font-semibold transition-all duration-150"
              style={{ background: 'var(--color-coral)', color: '#fff', boxShadow: '0 4px 14px rgba(244,98,31,0.35)', textDecoration: 'none', fontSize: '1rem' }}
            >
              Plan your first trip ✈
            </a>
          </div>
        ) : (
          <div className="fade-up fade-up-2 space-y-3">
            {plans.map((plan, i) => (
              <a
                key={plan.id}
                href={`/plan/${plan.id}?creator=${plan.creator_token}`}
                className={`block card px-5 py-4 transition-all duration-150 fade-up fade-up-${Math.min(i + 2, 6)}`}
                style={{ textDecoration: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(44,31,20,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = ''; }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="font-display font-bold text-lg" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
                        {plan.name}
                      </h2>
                      {plan.is_locked
                        ? <span className="label-tag px-2 py-0.5 rounded-full" style={{ background: '#FEF9C3', color: '#854D0E', fontSize: '0.58rem' }}>🔒 Locked</span>
                        : <span className="label-tag px-2 py-0.5 rounded-full" style={{ background: 'var(--color-preferred-bg)', color: '#065F46', fontSize: '0.58rem' }}>● Open</span>
                      }
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                      {format(parseISO(plan.window_start), 'd MMM')} – {format(parseISO(plan.window_end), 'd MMM yyyy')}
                      <span className="mx-1.5" style={{ color: 'var(--color-faint)' }}>·</span>
                      {plan.min_duration}–{plan.max_duration} nights
                    </p>
                  </div>
                  <span style={{ color: 'var(--color-faint)', fontSize: '1.2rem', marginTop: '0.1rem' }}>›</span>
                </div>
              </a>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
