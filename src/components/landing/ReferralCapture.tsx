"use client";

import { useEffect } from "react";

/**
 * Mounts on the landing page (server component) to capture ?ref= and ?promo=
 * from the URL and persist them to localStorage/sessionStorage so they survive
 * navigation to /onboarding and eventually /register.
 */
export function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const promo = params.get("promo");

    if (ref) {
      localStorage.setItem("nutriplan_ref", ref);
      sessionStorage.setItem("nutriplan_ref", ref);
    }
    if (promo) {
      localStorage.setItem("nutriplan_promo", promo);
      sessionStorage.setItem("nutriplan_promo", promo);
    }
  }, []);

  return null;
}
