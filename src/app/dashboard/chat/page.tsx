import type { Metadata } from "next";
import { ChatClient } from "@/components/chat/ChatClient";

export const metadata: Metadata = { title: "Чат с ИИ — NutriPlan" };

export default function ChatPage() {
  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="font-display text-2xl font-bold text-bark-300">Чат с ИИ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Персональный ассистент по питанию — ответы с учётом вашего профиля и целей.
        </p>
      </div>
      <ChatClient />
    </div>
  );
}
