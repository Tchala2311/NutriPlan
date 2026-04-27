# TES-191: Recipe Link Previews

## Overview

Auto-generate preview cards for recipe URLs shared in group comments/chat. Telegram-inspired feature for the Social Factor ([TES-184](https://paperclip.ing/TES/issues/TES-184)).

## Architecture

```
User pastes URL in comment
    ↓
GroupCommentsSection extracts URLs
    ↓
isRecipeUrl() checks if URL is from known recipe site
    ↓
RecipePreviewCard renders → POST /api/metadata/fetch
    ↓
API checks url_metadata_cache → if cached, return
    ↓
If not cached: fetch HTML → parse OG tags → cache 30 days → return
    ↓
Card renders with image, title, cook time, domain
```

## Components

### API Endpoint
**Path:** `src/app/api/metadata/fetch/route.ts`
**Method:** POST
**Body:** `{ url: string }`
**Response:**
```json
{
  "cached": true|false,
  "metadata": {
    "title": "Recipe Title",
    "image": "https://...",
    "description": "...",
    "cookTime": 30,
    "domain": "allrecipes.com"
  }
}
```

### Frontend Components
- **`src/components/social/RecipePreviewCard.tsx`** — Renders preview card with async fetch
- **`src/components/social/GroupCommentsSection.tsx`** — Group discussion UI with URL detection
- **`src/lib/url-utils.ts`** — URL extraction + recipe site detection

### Database
**Table:** `url_metadata_cache`
```sql
- id            UUID PRIMARY KEY
- url           TEXT UNIQUE NOT NULL
- og_title      TEXT
- og_image      TEXT
- og_description TEXT
- cook_time_minutes INTEGER
- source_domain TEXT
- metadata_json JSONB
- created_at    TIMESTAMPTZ
- expires_at    TIMESTAMPTZ (created_at + 30 days)
```

**Indexes:**
- `url_metadata_cache_url_idx` on `(url)` for fast lookup
- `url_metadata_cache_expires_at_idx` on `(expires_at)` for cleanup

**RLS:** Public read (cached metadata is shareable)

## Deployment Steps

### 1. Apply Database Migration
```bash
# Via Supabase CLI
supabase migrations up

# OR via Supabase dashboard:
# SQL Editor → paste contents of:
# supabase/migrations/20260427100000_create_url_metadata_cache.sql
```

**Verify:**
```sql
SELECT * FROM url_metadata_cache LIMIT 1;  -- Should return empty result, no error
```

### 2. Deploy Code
- Commit `419dc5f` contains full implementation
- Deploy to staging first, then production

### 3. QA Testing

**Test Case 1: Basic preview**
1. Login → Social → My Group → Comments
2. Paste: `https://www.allrecipes.com/recipe/12345/pasta/`
3. Click send
4. **Expected:** Preview card with image, title, cook time, "allrecipes.com" domain

**Test Case 2: Cache hit**
1. After Test Case 1, paste same URL in another comment
2. **Expected:** Preview loads instantly (no network delay)
3. Verify: `SELECT created_at, expires_at FROM url_metadata_cache WHERE url = '...'`

**Test Case 3: Fallback**
1. Paste invalid URL: `https://example.com/notarecipe`
2. **Expected:** Plain link rendered (no preview card)

**Test Case 4: Non-recipe URL**
1. Paste: `https://google.com`
2. **Expected:** Plain link only (isRecipeUrl returns false)

### 4. Production Monitoring

**Cache metrics:**
```sql
-- Total cached entries
SELECT COUNT(*) FROM url_metadata_cache;

-- Top domains by cache count
SELECT source_domain, COUNT(*) FROM url_metadata_cache GROUP BY source_domain ORDER BY count DESC;

-- Recent cache hits (entries created today)
SELECT COUNT(*) FROM url_metadata_cache WHERE created_at > NOW() - INTERVAL '1 day';

-- Expired entries (should be auto-cleaned)
SELECT COUNT(*) FROM url_metadata_cache WHERE expires_at < NOW();
```

**Error monitoring:**
- Watch for 500 errors in `/api/metadata/fetch` logs
- Monitor failed metadata fetches (timeouts, blocked sites)

## Recipe Site Detection

Currently detects URLs from these domains (in `url-utils.ts`):
- allrecipes, foodnetwork, seriouseats, bon-appetit, tasty
- epicurious, food52, smittenkitchen, budgetbytes, copykat
- delish, recipetineats, skinnytaste, minimalist-baker
- pinch-of-yum, oh-she-glows, simplerecipes, saveur
- williams-sonoma, recipe, cook, food, culinar (generic)

To add more sites, edit `recipeHosts` array in `src/lib/url-utils.ts:24`.

## Known Limitations

1. **Site coverage:** Only ~25 known recipe sites detected; other sites show plain link
2. **Cook time extraction:** Regex-based; only works for `\d+\s*(min|minute|мин)` patterns in description
3. **Cache key:** URL-based; same recipe at different URLs = separate cache entries
4. **OG metadata dependency:** Only as good as the source site's meta tags

## Future Enhancements

- [ ] Add more recipe sites to detection list
- [ ] Schema.org Recipe parsing (more structured data)
- [ ] User preference: disable previews
- [ ] Batch fetch optimization for multiple URLs
- [ ] Image proxy for privacy/performance
- [ ] Rich preview for non-recipe URLs (general OG)

## Related Issues

- Parent: [TES-184](https://paperclip.ing/TES/issues/TES-184) — Social Factor
- Implementation commit: `419dc5f`
