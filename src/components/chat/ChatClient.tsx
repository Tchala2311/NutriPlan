"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  error?: boolean;
}

export function ChatClient() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLong, setLoadingLong] = useState(false);

  // Init session on mount
  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch("/api/ai/chat/sessions");
        if (!res.ok) return;

        const { sessions } = (await res.json()) as { sessions: { id: string }[] };

        if (sessions.length > 0) {
          // Load last session
          const lastSessionId = sessions[0].id;
          const sessionRes = await fetch(`/api/ai/chat/sessions/${lastSessionId}`);
          if (sessionRes.ok) {
            const { messages: loadedMessages } = (await sessionRes.json()) as {
              messages: Array<{ id: string; role: "user" | "assistant"; text: string }>;
            };
            setSessionId(lastSessionId);
            setMessages(loadedMessages.map((m) => ({ ...m, error: false })));
            return;
          }
        }

        // No sessions — create new one
        const createRes = await fetch("/api/ai/chat/sessions", { method: "POST" });
        if (createRes.ok) {
          const { session } = (await createRes.json()) as { session: { id: string } };
          setSessionId(session.id);
        }
      } catch {
        // Silent fail
      }
    }

    initSession();
  }, []);

  // Long-loading indicator
  useEffect(() => {
    if (!loading) { setLoadingLong(false); return; }
    const t = setTimeout(() => setLoadingLong(true), 10000);
    return () => clearTimeout(t);
  }, [loading]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !sessionId) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Save user message to DB
    try {
      await fetch("/api/ai/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, role: "user", text }),
      });
    } catch {
      // Fail silently — continue even if persistence fails
    }

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json() as { answer?: string; error?: string };

      if (!res.ok || data.error) {
        const errorText = data.error ?? "Не удалось получить ответ. Попробуйте ещё раз.";
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: errorText,
            error: true,
          },
        ]);
      } else {
        const answerText = data.answer!;
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", text: answerText },
        ]);
        // Save assistant response to DB
        try {
          await fetch("/api/ai/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, role: "assistant", text: answerText }),
          });
        } catch {
          // Fail silently
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Ошибка соединения. Проверьте интернет и попробуйте снова.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center px-6">
            <SparklesIcon className="h-10 w-10 text-sage-300 mb-3" />
            <p className="font-display text-lg font-semibold text-bark-300">
              Спросите ИИ о питании
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Задайте любой вопрос о питании, ингредиентах, рецептах или ваших целях — ответ будет с учётом вашего профиля.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-left rounded-lg border border-parchment-200 bg-parchment-100 px-3 py-2.5 text-xs text-bark-200 hover:border-bark-100 hover:text-bark-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 max-w-2xl",
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div
              className={cn(
                "h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold",
                msg.role === "user"
                  ? "bg-bark-300 text-primary-foreground"
                  : "bg-sage-100 text-sage-600"
              )}
            >
              {msg.role === "user" ? "Я" : <SparklesIcon className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                "rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-bark-300 text-primary-foreground"
                  : msg.error
                  ? "bg-destructive/10 border border-destructive/20 text-destructive"
                  : "bg-parchment-100 border border-parchment-200 text-bark-300"
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-2xl">
            <div className="h-8 w-8 rounded-full shrink-0 bg-sage-100 flex items-center justify-center">
              <SparklesIcon className="h-4 w-4 text-sage-600" />
            </div>
            <div className="rounded-xl border border-parchment-200 bg-parchment-100 px-4 py-3">
              <ThinkingDots />
              {loadingLong && (
                <p className="mt-1.5 text-xs text-muted-foreground animate-pulse">Ещё немного…</p>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-parchment-200 pt-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Спросите о питании, рецептах или ваших целях…"
            disabled={loading}
            className={cn(
              "flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-40 overflow-y-auto"
            )}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={cn(
              "h-10 w-10 shrink-0 rounded-xl bg-primary flex items-center justify-center",
              "hover:bg-primary/90 transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            aria-label="Отправить"
          >
            <SendIcon className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Enter — отправить · Shift+Enter — новая строка
        </p>
      </div>
    </div>
  );
}

const EXAMPLE_QUESTIONS = [
  "Сколько белка мне нужно в день?",
  "Что съесть перед тренировкой?",
  "Как уменьшить тягу к сладкому?",
  "Замена куриной грудке для веганов?",
];

function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center h-4" aria-label="Печатает…">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6.343 17.657l-2.829 2.829M5.172 14.172l-2.829 2.829M19 3v4M17 5h4M17.657 17.657l2.829 2.829M18.828 14.172l2.829 2.829M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
