'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function ConfirmHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/my-trips';

  useEffect(() => {
    const supabase = createClient();

    // Implicit flow — Supabase client detects the token hash and fires SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push(next);
      }
    });

    // In case the session is already established
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push(next);
      } else if (typeof window !== 'undefined' && window.location.hash.includes('error')) {
        router.push('/login?error=auth_callback_failed');
      }
    });

    return () => subscription.unsubscribe();
  }, [next, router]);

  return (
    <main className="dot-bg min-h-screen flex items-center justify-center">
      <p className="font-display text-2xl font-semibold" style={{ color: 'var(--color-muted)' }}>
        Signing you in…
      </p>
    </main>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<main className="dot-bg min-h-screen" />}>
      <ConfirmHandler />
    </Suspense>
  );
}
