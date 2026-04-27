'use client';

import { useState, useTransition } from 'react';
import { updateUsername } from '@/app/dashboard/profile/actions';

interface UsernameFormProps {
  initialUsername?: string | null;
}

export function UsernameForm({ initialUsername }: UsernameFormProps) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(initialUsername ?? '');
  const [saved, setSaved] = useState(initialUsername ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateUsername(username);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(username.trim().toLowerCase());
        setEditing(false);
      }
    });
  }

  function handleCancel() {
    setUsername(saved);
    setEditing(false);
    setError(null);
  }

  if (!editing) {
    return (
      <div className="flex justify-between items-center text-sm">
        <dt className="text-muted-foreground">@username</dt>
        <dd className="flex items-center gap-2">
          <span className="font-medium text-bark-300">
            {saved ? (
              <>
                @<span className="font-mono">{saved}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">не указан</span>
            )}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-sage-500 hover:text-sage-600 transition-colors underline underline-offset-2"
          >
            Изменить
          </button>
        </dd>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <label htmlFor="username" className="block text-muted-foreground mb-1.5">
        @username
      </label>
      <p className="text-xs text-muted-foreground mb-2">
        3-32 символа: буквы (a-z), цифры, подчеркивание
      </p>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
          <input
            id="username"
            type="text"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
            placeholder="username"
            className="w-full rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2 pl-7 text-bark-300 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-bark-200 text-sm font-mono"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-bark-300 text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-bark-400 transition-colors disabled:opacity-50"
        >
          {isPending ? '…' : 'Сохранить'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-lg border border-parchment-200 px-3 py-2 text-sm font-medium text-bark-200 hover:bg-parchment-200 transition-colors disabled:opacity-50"
        >
          Отмена
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
