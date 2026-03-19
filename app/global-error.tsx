'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>An unexpected error occurred. It has been reported automatically.</p>
          <button onClick={reset} style={{ padding: '0.6rem 1.4rem', background: '#F4621F', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
