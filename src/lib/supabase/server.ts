import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// cache() deduplicates calls within a single React render pass (one HTTP request).
// All server components that call createClient() in the same request share one instance.
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cookieStore.set(name, value, options as any)
            );
          } catch {
            // setAll called from a Server Component — middleware handles refresh
          }
        },
      },
    }
  );
});

// Cached getUser — one network call to Supabase auth per request, regardless of
// how many server components call this.
export const getUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});
