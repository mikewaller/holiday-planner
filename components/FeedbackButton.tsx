'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

type State = 'idle' | 'open' | 'sending' | 'sent';

export default function FeedbackButton() {
  const pathname = usePathname();
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  async function submit() {
    if (!message.trim()) return;
    setState('sending');
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, name, email, page: pathname }),
    });
    if (res.ok) {
      setState('sent');
      setTimeout(() => { setState('idle'); setMessage(''); setName(''); setEmail(''); }, 3000);
    } else {
      setState('open');
    }
  }

  return (
    <>
      {/* Backdrop */}
      {state === 'open' && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 1000, background: 'rgba(44,31,20,0.35)', backdropFilter: 'blur(1px)' }}
          onClick={() => setState('idle')}
        />
      )}

      {/* Panel */}
      {(state === 'open' || state === 'sending' || state === 'sent') && (
        <div
          className="fixed card"
          style={{
            bottom: '5rem',
            right: '1.25rem',
            width: '17rem',
            zIndex: 1001,
            boxShadow: '0 8px 32px rgba(44,31,20,0.18)',
          }}
        >
          {state === 'sent' ? (
            <div className="px-5 py-6 text-center">
              <div className="text-3xl mb-2">🙏</div>
              <p className="font-display font-bold" style={{ color: 'var(--color-ink)' }}>Thanks!</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Your feedback has been sent.</p>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-base" style={{ color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
                  Share feedback
                </p>
                <button
                  onClick={() => setState('idle')}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}
                >✕</button>
              </div>
              <textarea
                placeholder="What's on your mind? Bugs, ideas, anything…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                className="field-input resize-none"
                style={{ fontSize: '0.85rem' }}
                autoFocus
              />
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="field-input"
                style={{ fontSize: '0.85rem' }}
              />
              <input
                type="email"
                placeholder="Email if you'd like a reply (optional)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field-input"
                style={{ fontSize: '0.85rem' }}
              />
              <button
                onClick={submit}
                disabled={!message.trim() || state === 'sending'}
                className="w-full py-2.5 rounded-xl font-display font-semibold text-sm transition-all duration-150 disabled:opacity-40"
                style={{ background: 'var(--color-coral)', color: '#fff', boxShadow: '0 3px 10px rgba(244,98,31,0.3)' }}
              >
                {state === 'sending' ? 'Sending…' : 'Send feedback →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setState(s => s === 'idle' || s === 'sent' ? 'open' : 'idle')}
        className="fixed flex items-center gap-2 px-4 py-2.5 rounded-full font-display font-semibold text-sm transition-all duration-200"
        style={{
          bottom: '1.25rem',
          right: '1.25rem',
          zIndex: 1002,
          background: 'var(--color-ink)',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(44,31,20,0.25)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Feedback
      </button>
    </>
  );
}
