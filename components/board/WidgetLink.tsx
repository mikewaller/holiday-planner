'use client';

import { useState } from 'react';

interface LinkData extends Record<string, unknown> {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

interface Props {
  id: string;
  data: Partial<LinkData>;
  canEdit: boolean;
  onUpdate: (data: LinkData) => void;
  onDelete: () => void;
}

export default function WidgetLink({ data, canEdit, onUpdate, onDelete }: Props) {
  const [inputUrl, setInputUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  async function fetchPreview(url: string) {
    setFetching(true); setError('');
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error();
      const og = await res.json();
      onUpdate({ url, title: og.title, description: og.description, image: og.image, siteName: og.siteName });
    } catch {
      setError('Could not fetch a preview — check the URL and try again.');
    } finally {
      setFetching(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text');
    if (pasted.startsWith('http')) {
      setInputUrl(pasted);
      setTimeout(() => fetchPreview(pasted), 0);
    }
  }

  // Empty state — URL input
  if (!data.url) {
    return (
      <div className="space-y-2">
        <input
          type="url"
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={e => e.key === 'Enter' && inputUrl && fetchPreview(inputUrl)}
          placeholder="Paste a link…"
          className="field-input w-full"
          style={{ fontSize: '0.9rem' }}
          autoFocus
        />
        {error && <p className="text-xs font-medium" style={{ color: 'var(--color-cantdo)' }}>{error}</p>}
        {fetching && <p className="text-xs" style={{ color: 'var(--color-faint)' }}>Fetching preview…</p>}
        {!fetching && inputUrl && (
          <button onClick={() => fetchPreview(inputUrl)}
            className="w-full py-2 rounded-xl label-tag font-semibold"
            style={{ background: 'var(--color-ink)', color: '#fff' }}>
            Add link
          </button>
        )}
      </div>
    );
  }

  // Preview card
  return (
    <div>
      <a href={data.url} target="_blank" rel="noopener noreferrer" className="block group" style={{ textDecoration: 'none' }}>
        {data.image && (
          <div className="w-full rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '16/9', background: 'var(--color-bg)' }}>
            <img src={data.image} alt="" className="w-full h-full object-cover transition-opacity group-hover:opacity-90" />
          </div>
        )}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {data.siteName && (
              <p className="label-tag mb-0.5" style={{ color: 'var(--color-coral)', fontSize: '0.6rem' }}>
                {data.siteName}
              </p>
            )}
            {data.title && (
              <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                {data.title}
              </p>
            )}
            {data.description && (
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-muted)', lineHeight: 1.5 }}>
                {data.description}
              </p>
            )}
            {!data.title && (
              <p className="text-xs truncate" style={{ color: 'var(--color-faint)' }}>{data.url}</p>
            )}
          </div>
          <span style={{ color: 'var(--color-coral)', fontSize: '1rem', flexShrink: 0 }}>›</span>
        </div>
      </a>
    </div>
  );
}
