'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Nav() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setAuthed(!!user));
  }, []);

  if (authed === null) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <a
        href={authed ? '/my-trips' : '/login'}
        className="label-tag px-4 py-2.5 rounded-xl transition-all duration-150 inline-flex items-center gap-1.5"
        style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)', textDecoration: 'none', boxShadow: '0 2px 8px rgba(44,31,20,0.08)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border-mid)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border)'; }}
      >
        {authed ? 'My trips →' : 'Sign in'}
      </a>
    </div>
  );
}
