import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface OGMetadata {
  title?: string;
  image?: string;
  description?: string;
  [key: string]: string | undefined;
}

function parseMetaTags(html: string): OGMetadata {
  const metadata: OGMetadata = {};
  const ogRegex = /<meta\s+(?:property|name)=["']og:([^"']+)["']\s+content=["']([^"']*)["']/gi;
  let match;

  while ((match = ogRegex.exec(html)) !== null) {
    const [, property, content] = match;
    if (property === 'title') metadata.title = content;
    if (property === 'image') metadata.image = content;
    if (property === 'description') metadata.description = content;
  }

  return metadata;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return new URL(url, 'http://example.com').hostname;
  }
}

async function fetchMetadata(url: string): Promise<OGMetadata | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NutriPlan/1.0; +https://nutriplan.app)',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) return null;

    const html = await response.text();
    const metadata = parseMetaTags(html);

    // Extract cook time from description if present
    const desc = metadata.description || '';
    const cookTimeMatch = desc.match(/(\d+)\s*(?:min|minute|мин)/i);
    const cookTime = cookTimeMatch ? parseInt(cookTimeMatch[1]) : null;

    return {
      ...metadata,
      cookTime: cookTime?.toString(),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check cache first
    const { data: cached } = await supabase
      .from('url_metadata_cache')
      .select('*')
      .eq('url', url)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return NextResponse.json({
        cached: true,
        metadata: {
          title: cached.og_title,
          image: cached.og_image,
          description: cached.og_description,
          cookTime: cached.cook_time_minutes,
          domain: cached.source_domain,
        },
      });
    }

    // Fetch fresh metadata
    const metadata = await fetchMetadata(url);

    if (!metadata) {
      return NextResponse.json({
        cached: false,
        metadata: {
          domain: extractDomain(url),
        },
      });
    }

    // Extract cook time from metadata
    let cookTime: number | null = null;
    if (metadata.cookTime) {
      cookTime = parseInt(metadata.cookTime);
    }

    const domain = extractDomain(url);

    // Cache the metadata
    await supabase.from('url_metadata_cache').upsert(
      {
        url,
        og_title: metadata.title,
        og_image: metadata.image,
        og_description: metadata.description,
        cook_time_minutes: cookTime,
        source_domain: domain,
        metadata_json: metadata,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      },
      { onConflict: 'url' }
    );

    return NextResponse.json({
      cached: false,
      metadata: {
        title: metadata.title,
        image: metadata.image,
        description: metadata.description,
        cookTime,
        domain,
      },
    });
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}
