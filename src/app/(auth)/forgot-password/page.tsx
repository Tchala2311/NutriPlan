import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Сброс пароля — NutriPlan" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-semibold text-bark-300 mb-2">
        Сброс пароля
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Введите email — отправим ссылку для сброса пароля.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Вспомнили пароль?{" "}
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
