'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface UpgradeButtonProps {
  className?: string;
  variant?: 'dark' | 'light';
}

export function UpgradeButton({ className, variant = 'dark' }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/subscribe', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Что-то пошло не так. Попробуйте снова.');
        return;
      }
      window.location.href = data.confirmationUrl;
    } catch {
      setError('Не удалось подключиться к платёжной системе.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className={cn(
          'w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          variant === 'dark'
            ? 'bg-parchment-100 text-bark-300 hover:bg-parchment-200'
            : 'bg-bark-300 text-white hover:bg-bark-400',
          className
        )}
      >
        {loading ? 'Перенаправление…' : 'Перейти на Premium'}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
