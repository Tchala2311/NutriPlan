import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-semibold text-bark-300 mb-6">
        Welcome back
      </h2>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-amber-300 hover:text-amber-400 underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </>
  );
}
