'use client';

import { useState } from 'react';

interface Props {
  id: string;
  data: { content: string };
  canEdit: boolean;
  onUpdate: (data: { content: string }) => void;
  onDelete: () => void;
}

export default function WidgetNote({ data, canEdit, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(!data.content);
  const [draft, setDraft] = useState(data.content);

  function save() {
    if (!draft.trim()) { onDelete(); return; }
    onUpdate({ content: draft.trim() });
    setEditing(false);
  }

  return (
    <div className="w-full">
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Write a note…"
            rows={4}
            autoFocus
            className="field-input resize-none w-full"
            style={{ fontSize: '0.9rem', lineHeight: 1.6 }}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) save(); }}
          />
          <div className="flex gap-2">
            <button onClick={save}
              className="flex-1 py-2 rounded-xl label-tag font-semibold transition-all"
              style={{ background: 'var(--color-ink)', color: '#fff' }}>
              Save
            </button>
            {data.content && (
              <button onClick={() => { setDraft(data.content); setEditing(false); }}
                className="px-4 py-2 rounded-xl label-tag transition-all"
                style={{ background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', color: 'var(--color-muted)' }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="group relative">
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-ink)' }}>
            {data.content}
          </p>
          {canEdit && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => setEditing(true)}
                className="label-tag transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-faint)' }}>
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
