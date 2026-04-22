import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Регистрация — NutriPlan" };

export default function RegisterPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-semibold text-bark-300 mb-6">
        Создайте аккаунт
      </h2>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="font-medium text-amber-300 hover:text-amber-400 underline-offset-4 hover:underline"
        >
          Войти
        </Link>
      </p>
    </>
  );
}
