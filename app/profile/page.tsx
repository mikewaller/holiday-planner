'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Nav from '@/components/Nav';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [nameError, setNameError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setEmail(user.email ?? '');
      const name = user.user_metadata?.full_name ?? '';
      setDisplayName(name);
      setNameInput(name);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameSaving(true); setNameMsg(''); setNameError(false);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } });
    setNameSaving(false);
    if (error) { setNameError(true); setNameMsg(error.message); }
    else { setDisplayName(nameInput.trim()); setNameMsg('Name updated!'); }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwError(true); setPwMsg('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setPwError(true); setPwMsg('Password must be at least 8 characters.'); return; }
    setPwSaving(true); setPwMsg(''); setPwError(false);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) { setPwError(true); setPwMsg(error.message); }
    else { setPwMsg('Password updated!'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
  }

  return (
    <main className="dot-bg min-h-screen p-4 pb-16">
      <Nav />
      <div className="max-w-sm mx-auto">

        {/* Header */}
        <div className="fade-up fade-up-1 pt-8 pb-6">
          <a href="/my-trips" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4"
            style={{ background: 'var(--color-coral-light)', border: '1px solid rgba(244,98,31,0.18)', textDecoration: 'none' }}>
            <span style={{ fontSize: '0.7rem' }}>←</span>
            <span className="label-tag" style={{ color: 'var(--color-coral)', fontSize: '0.62rem' }}>My trips</span>
          </a>
          <h1 className="font-display font-bold" style={{ fontSize: '2.2rem', lineHeight: 1.1, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            Your profile
          </h1>
          {email && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>{email}</p>
          )}
        </div>

        {/* Display name */}
        <div className="fade-up fade-up-2 card p-5 mb-3">
          <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--color-ink)' }}>Display name</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            Used to pre-fill your name when joining a trip.
          </p>
          <form onSubmit={saveName} className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              className="field-input"
            />
            <button
              type="submit"
              disabled={nameSaving || !nameInput.trim()}
              className="w-full py-3 rounded-xl font-display font-semibold transition-all duration-200 disabled:opacity-50"
              style={{ background: 'var(--color-coral)', color: '#fff', boxShadow: '0 4px 14px rgba(244,98,31,0.35)' }}
              onMouseEnter={e => { if (!nameSaving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral-dim)'; }}
              onMouseLeave={e => { if (!nameSaving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral)'; }}
            >
              {nameSaving ? 'Saving…' : 'Save name'}
            </button>
            {nameMsg && (
              <p className="text-sm font-medium text-center" style={{ color: nameError ? 'var(--color-cantdo)' : 'var(--color-preferred)' }}>
                {nameMsg}
              </p>
            )}
          </form>
        </div>

        {/* Change password */}
        <div className="fade-up fade-up-3 card p-5">
          <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--color-ink)' }}>Change password</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            Leave blank if you only use magic links to sign in.
          </p>
          <form onSubmit={savePassword} className="space-y-3">
            <div>
              <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>New password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label className="label-tag block mb-1.5" style={{ color: 'var(--color-muted)' }}>Confirm new password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="field-input"
              />
            </div>
            <button
              type="submit"
              disabled={pwSaving || !newPassword || !confirmPassword}
              className="w-full py-3 rounded-xl font-display font-semibold transition-all duration-200 disabled:opacity-50"
              style={{ background: 'var(--color-coral)', color: '#fff', boxShadow: '0 4px 14px rgba(244,98,31,0.35)' }}
              onMouseEnter={e => { if (!pwSaving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral-dim)'; }}
              onMouseLeave={e => { if (!pwSaving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-coral)'; }}
            >
              {pwSaving ? 'Saving…' : 'Update password'}
            </button>
            {pwMsg && (
              <p className="text-sm font-medium text-center" style={{ color: pwError ? 'var(--color-cantdo)' : 'var(--color-preferred)' }}>
                {pwMsg}
              </p>
            )}
          </form>
        </div>

      </div>
    </main>
  );
}
