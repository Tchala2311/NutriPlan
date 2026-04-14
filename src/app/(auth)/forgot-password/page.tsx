import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-semibold text-bark-300 mb-2">
        Reset your password
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-amber-300 hover:text-amber-400 underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
