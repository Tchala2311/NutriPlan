import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Вход — NutriPlan" };

export default function LoginPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-semibold text-bark-300 mb-6">
        С возвращением
      </h2>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Нет аккаунта?{" "}
        <Link
          href="/register"
          className="font-medium text-amber-300 hover:text-amber-400 underline-offset-4 hover:underline"
        >
          Создать
        </Link>
      </p>
    </>
  );
}
