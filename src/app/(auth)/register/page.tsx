import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-semibold text-bark-300 mb-6">
        Create your account
      </h2>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-amber-300 hover:text-amber-400 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
