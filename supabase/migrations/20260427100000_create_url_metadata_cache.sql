-- Create url_metadata_cache table for caching OG metadata
-- TES-191: Recipe link previews - cache fetched metadata to avoid repeated scraping

CREATE TABLE IF NOT EXISTS public.url_metadata_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  og_title TEXT,
  og_image TEXT,
  og_description TEXT,
  cook_time_minutes INTEGER,
  source_domain TEXT,
  metadata_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  CONSTRAINT url_metadata_cache_url_key UNIQUE (url)
);

-- Index for fast URL lookup and cache expiration cleanup
CREATE INDEX IF NOT EXISTS url_metadata_cache_url_idx ON public.url_metadata_cache (url);
CREATE INDEX IF NOT EXISTS url_metadata_cache_expires_at_idx ON public.url_metadata_cache (expires_at);

-- Enable RLS
ALTER TABLE public.url_metadata_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cached metadata
CREATE POLICY "Allow public read of cached metadata"
  ON public.url_metadata_cache
  FOR SELECT
  USING (true);
