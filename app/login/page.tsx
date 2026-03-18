'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Nav from '@/components/Nav';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/my-trips';
  const errorParam = searchParams.get('error');

  const supabase = createClient();

  const [tab, setTab] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (errorParam) {
      setIsError(true);
      setMessage('Something went wrong — please try again.');
    }
  }, [errorParam]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage(''); setIsError(false);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) { setIsError(true); setMessage(error.message); }
    else { setIsError(false); setMessage('Check your email — a magic link is on its way ✉️'); }
  }

  async function sendPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage(''); setIsError(false);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`,
    });
    setLoading(false);
    if (error) { setIsError(true); setMessage(error.message); }
    else { setIsError(false); setMessage('Check your email — a password reset link is on its way ✉️'); setShowForgot(false); }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage(''); setIsError(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setIsError(true);
      setMessage(error.message.toLowerCase().includes('invalid login')
        ? 'Incorrect email or password. Try a magic link if you\'ve forgotten it.'
        : error.message);
    } else {
      router.push(next);
    }
  }

  return (
    <div className="fade-up fade-up-2 card p-6 shadow-lg" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.10)' }}>
      {/* Tab switcher */}
      <div className="flex rounded-xl p-1 mb-5" style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)' }}>
        {(['magic', 'password'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setMessage(''); }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
            style={{
              background: tab === t ? 'var(--color-surface)' : 'transparent',
              color: tab === t ? 'var(--color-ink)' : 'var(--color-faint)',
              boxShadow: tab === t ? '0 1px 4px rgba(44,31,20,0.08)' : 'none',
              fontFamily: 'var(--font-nunito)',
              letterSpacing: '0.03em',
            }}
          >
            {t === 'magic' ? '✉️ Magic link' : '🔒 Password'}
          </button>
        ))}
      </div>

      {tab === 'magic' ? (
        <form onSubmit={sendMagicLink} className="space-y-4">
          <div>
            <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>Email</label>
            <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="field-input" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-display font-semibold text-lg transition-all duration-200 disabled:opacity-50"
            style={{ background: 'var(--color-coral)', color: '#fff', letterSpacing: '-0.01em', boxShadow: '0 4px 14px rgba(244,98,31,0.35)' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral-dim)'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral)'; }}
          >
            {loading ? 'Sending…' : 'Send magic link ✈'}
          </button>
        </form>
      ) : showForgot ? (
        <form onSubmit={sendPasswordReset} className="space-y-4">
          <div>
            <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>Email</label>
            <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="field-input" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-display font-semibold text-lg transition-all duration-200 disabled:opacity-50"
            style={{ background: 'var(--color-coral)', color: '#fff', letterSpacing: '-0.01em', boxShadow: '0 4px 14px rgba(244,98,31,0.35)' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral-dim)'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral)'; }}
          >
            {loading ? 'Sending…' : 'Send reset link ✉️'}
          </button>
          <p className="text-xs text-center" style={{ color: 'var(--color-faint)' }}>
            <button type="button" onClick={() => { setShowForgot(false); setMessage(''); }} style={{ color: 'var(--color-coral)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}>
              Back to sign in
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={signInWithPassword} className="space-y-4">
          <div>
            <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>Email</label>
            <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>Password</label>
            <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="field-input" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-display font-semibold text-lg transition-all duration-200 disabled:opacity-50"
            style={{ background: 'var(--color-coral)', color: '#fff', letterSpacing: '-0.01em', boxShadow: '0 4px 14px rgba(244,98,31,0.35)' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral-dim)'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral)'; }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-xs text-center" style={{ color: 'var(--color-faint)' }}>
            <button type="button" onClick={() => { setShowForgot(true); setMessage(''); }} style={{ color: 'var(--color-coral)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}>
              Forgot your password?
            </button>
          </p>
        </form>
      )}

      {message && (
        <p className="mt-4 text-sm font-medium text-center" style={{ color: isError ? 'var(--color-cantdo)' : 'var(--color-preferred)' }}>
          {message}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="dot-bg min-h-screen flex items-center justify-center p-4 py-12">
      <Nav />
      <div className="w-full max-w-sm">

        <div className="fade-up fade-up-1 text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.2)' }}>
            <span style={{ fontSize: '0.75rem' }}>✈️</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', letterSpacing: '0.06em' }}>Hatch a Plan</span>
          </a>
          <h1 className="font-display" style={{ fontSize: '2.5rem', lineHeight: 1.1, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Save your trips
          </h1>
          <p className="mt-3 text-base" style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
            Sign in to access all your plans in one place.
          </p>
        </div>

        <Suspense fallback={<div className="card p-6" style={{ minHeight: '200px' }} />}>
          <LoginForm />
        </Suspense>

        <div className="fade-up fade-up-3 mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--color-faint)' }}>
            No account needed to join a trip — sign in only to manage your own plans.
          </p>
        </div>

      </div>
    </main>
  );
}
