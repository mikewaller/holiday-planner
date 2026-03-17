'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
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

  useEffect(() => {
    if (errorParam) {
      setIsError(true);
      setMessage('Something went wrong — please try again.');
    }
  }, [errorParam]);

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) { setIsError(true); setMessage(error.message); setLoading(false); }
  }

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

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage(''); setIsError(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Try sign up if user not found
      if (error.message.toLowerCase().includes('invalid login')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (signUpError) { setIsError(true); setMessage(signUpError.message); }
        else { setIsError(false); setMessage('Account created! Check your email to confirm, then sign in.'); }
      } else {
        setIsError(true); setMessage(error.message);
      }
    } else {
      router.push(next);
    }
  }

  return (
    <main className="dot-bg min-h-screen flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-sm">

        {/* Hero */}
        <div className="fade-up fade-up-1 text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.2)' }}>
            <span style={{ fontSize: '0.75rem' }}>✈️</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', letterSpacing: '0.06em' }}>Holiday Planner</span>
          </a>
          <h1 className="font-display" style={{ fontSize: '2.5rem', lineHeight: 1.1, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Save your trips
          </h1>
          <p className="mt-3 text-base" style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
            Sign in to access all your plans in one place.
          </p>
        </div>

        <div className="fade-up fade-up-2 card p-6 shadow-lg" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.10)' }}>

          {/* Google */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 mb-5"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-ink)', boxShadow: '0 2px 8px rgba(44,31,20,0.06)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-mid)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1" style={{ height: '1px', background: 'var(--color-border)' }} />
            <span className="label-tag" style={{ color: 'var(--color-faint)' }}>or</span>
            <div className="flex-1" style={{ height: '1px', background: 'var(--color-border)' }} />
          </div>

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
                {loading ? 'Signing in…' : 'Sign in / Sign up'}
              </button>
              <p className="text-xs text-center" style={{ color: 'var(--color-faint)' }}>New here? We&apos;ll create an account automatically.</p>
            </form>
          )}

          {message && (
            <p className="mt-4 text-sm font-medium text-center" style={{ color: isError ? 'var(--color-cantdo)' : 'var(--color-preferred)' }}>
              {message}
            </p>
          )}
        </div>

        <div className="fade-up fade-up-3 mt-6 text-center">
          <p className="text-sm" style={{ color: 'var(--color-faint)' }}>
            No account needed to join a trip — sign in only to manage your own plans.
          </p>
        </div>

      </div>
    </main>
  );
}
