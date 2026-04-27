'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface RecipeMetadata {
  title?: string;
  image?: string;
  description?: string;
  cookTime?: number | null;
  domain?: string;
}

interface RecipePreviewCardProps {
  url: string;
  className?: string;
}

export function RecipePreviewCard({ url, className }: RecipePreviewCardProps) {
  const [metadata, setMetadata] = useState<RecipeMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await fetch('/api/metadata/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          setError(true);
          return;
        }

        const { metadata: data } = await res.json();
        setMetadata(data);
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [url]);

  if (loading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-32 bg-parchment-100 rounded-lg" />
      </div>
    );
  }

  if (error || !metadata) {
    // Fallback: show plain URL
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-2 text-sage-400 hover:text-sage-500 underline break-all text-sm',
          className
        )}
      >
        <LinkIcon className="h-3.5 w-3.5 shrink-0" />
        {url}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex gap-3 rounded-lg border border-parchment-200 bg-white p-3 hover:border-sage-200 hover:shadow-md transition-all overflow-hidden',
        className
      )}
    >
      {/* Image */}
      {metadata.image && (
        <div className="h-24 w-24 shrink-0 rounded-lg overflow-hidden bg-parchment-100">
          <img
            src={metadata.image}
            alt={metadata.title || 'Recipe'}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {metadata.title && (
          <p className="text-sm font-semibold text-bark-300 line-clamp-2 group-hover:text-bark-400 transition-colors">
            {metadata.title}
          </p>
        )}

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {metadata.cookTime && (
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <ClockIcon className="h-3 w-3" />
              {metadata.cookTime} мин
            </span>
          )}
          {metadata.domain && <span className="text-xs text-stone-400">{metadata.domain}</span>}
        </div>

        {/* Description */}
        {metadata.description && (
          <p className="text-xs text-stone-400 line-clamp-2 mt-1.5">{metadata.description}</p>
        )}
      </div>
    </a>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
