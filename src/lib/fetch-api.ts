/**
 * Thin `fetch` wrapper for client-side API calls.
 *
 * ES-7: Detects 401 Unauthorized responses (session expired or revoked)
 * and redirects the user to the login page with an `expired=1` param
 * so they see a friendly "session expired" message instead of a broken UI.
 */

const REDIRECT_IN_PROGRESS_KEY = 'nutriplan_session_expired_redirect';

export async function fetchApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status === 401) {
    // Prevent redirect loops: only redirect once per session
    if (typeof window !== 'undefined' && !sessionStorage.getItem(REDIRECT_IN_PROGRESS_KEY)) {
      sessionStorage.setItem(REDIRECT_IN_PROGRESS_KEY, '1');
      window.location.replace('/login?expired=1');
    }
    // Return the response so callers don't crash before the redirect fires
    return res;
  }

  // Clear the sentinel once we get a successful response (session refreshed)
  if (res.ok && typeof window !== 'undefined') {
    sessionStorage.removeItem(REDIRECT_IN_PROGRESS_KEY);
  }

  return res;
}
