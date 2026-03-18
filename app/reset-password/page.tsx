'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Nav from '@/components/Nav';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setIsError(true);
      setMessage('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setIsError(true);
      setMessage('Password must be at least 8 characters.');
      return;
    }
    setLoading(true); setMessage(''); setIsError(false);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setIsError(true);
      setMessage(error.message);
    } else {
      setIsError(false);
      setMessage('Password updated! Redirecting…');
      setTimeout(() => router.push('/my-trips'), 1500);
    }
  }

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
            New password
          </h1>
          <p className="mt-3 text-base" style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
            Choose a new password for your account.
          </p>
        </div>

        <div className="fade-up fade-up-2 card p-6 shadow-lg" style={{ boxShadow: '0 8px 32px rgba(44,31,20,0.10)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>New password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>Confirm password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="field-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-display font-semibold text-lg transition-all duration-200 disabled:opacity-50"
              style={{ background: 'var(--color-coral)', color: '#fff', letterSpacing: '-0.01em', boxShadow: '0 4px 14px rgba(244,98,31,0.35)' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral-dim)'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral)'; }}
            >
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>

          {message && (
            <p className="mt-4 text-sm font-medium text-center" style={{ color: isError ? 'var(--color-cantdo)' : 'var(--color-preferred)' }}>
              {message}
            </p>
          )}
        </div>

      </div>
    </main>
  );
}
