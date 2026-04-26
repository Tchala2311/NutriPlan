'use client';

import { useState, useTransition } from 'react';
import { updateDisplayName } from '@/app/dashboard/profile/actions';

interface DisplayNameFormProps {
  initialName?: string | null;
}

export function DisplayNameForm({ initialName }: DisplayNameFormProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName ?? '');
  const [saved, setSaved] = useState(initialName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(name.trim());
        setEditing(false);
      }
    });
  }

  function handleCancel() {
    setName(saved);
    setEditing(false);
    setError(null);
  }

  if (!editing) {
    return (
      <div className="flex justify-between items-center text-sm">
        <dt className="text-muted-foreground">Имя</dt>
        <dd className="flex items-center gap-2">
          <span className="font-medium text-bark-300">
            {saved || <span className="text-muted-foreground italic">не указано</span>}
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
      <label htmlFor="display-name" className="block text-muted-foreground mb-1.5">
        Имя
      </label>
      <div className="flex gap-2">
        <input
          id="display-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          placeholder="Ваше имя"
          className="flex-1 rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2 text-bark-300 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-bark-200 text-sm"
        />
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
