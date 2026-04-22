"use client";
import dynamic from "next/dynamic";

export const LandingDemoClient = dynamic(
  () => import("@/components/landing/LandingDemo").then((m) => ({ default: m.LandingDemo })),
  { ssr: false }
);
