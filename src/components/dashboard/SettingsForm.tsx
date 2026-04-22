"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveSettings, deleteAccount } from "@/app/dashboard/settings/actions";
import type { UserSettings } from "@/app/dashboard/settings/actions";

interface SettingsFormProps {
  initial: UserSettings;
  userEmail: string;
  isPremium: boolean;
  periodEnd: string | null;
}

const CATALOG_DAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function SettingsForm({ initial, userEmail, isPremium, periodEnd }: SettingsFormProps) {
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [trainingDays, setTrainingDays] = useState<Set<number>>(
    new Set(initial.training_days ?? [0, 2, 4, 5])
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setSaveError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await saveSettings(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Ошибка сохранения");
      }
    });
  }

  async function handleDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      try {
        await deleteAccount();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Ошибка удаления");
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Notifications ── */}
        <Section title="Уведомления">
          <Field label="Напоминание о приёме пищи">
            <input
              type="time"
              name="meal_reminder_time"
              defaultValue={initial.notification_prefs.meal_reminder_time ?? ""}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-muted-foreground">Оставьте пустым, чтобы отключить</p>
          </Field>

          <Field label="Напоминание о воде (интервал, мин)">
            <select
              name="water_reminder_interval_min"
              defaultValue={String(initial.notification_prefs.water_reminder_interval_min ?? "")}
              className={inputClass}
            >
              <option value="">Отключено</option>
              <option value="30">Каждые 30 мин</option>
              <option value="60">Каждый час</option>
              <option value="90">Каждые 1.5 часа</option>
              <option value="120">Каждые 2 часа</option>
            </select>
          </Field>

          <Field label="ИИ-советы">
            <select
              name="ai_suggestion_timing"
              defaultValue={initial.notification_prefs.ai_suggestion_timing}
              className={inputClass}
            >
              <option value="off">Отключено</option>
              <option value="after_logging">После каждой записи</option>
              <option value="daily_digest">Ежедневный дайджест</option>
            </select>
          </Field>
        </Section>

        {/* ── Units ── */}
        <Section title="Единицы измерения">
          <div className="flex gap-4">
            <RadioCard
              name="units"
              value="metric"
              defaultChecked={initial.units === "metric"}
              label="Метрическая"
              description="кг, см, мл"
            />
            <RadioCard
              name="units"
              value="imperial"
              defaultChecked={initial.units === "imperial"}
              label="Имперская"
              description="фунты, дюймы, унции"
            />
          </div>
        </Section>

        {/* ── Language ── */}
        <Section title="Язык / Language">
          <div className="flex gap-4">
            <RadioCard
              name="language"
              value="ru"
              defaultChecked={initial.language === "ru"}
              label="Русский"
              description="Интерфейс на русском"
            />
            <RadioCard
              name="language"
              value="en"
              defaultChecked={initial.language === "en"}
              label="English"
              description="Interface in English"
            />
          </div>
        </Section>

        {/* ── Training days ── */}
        <TrainingDaysSection trainingDays={trainingDays} onChange={setTrainingDays} />

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              "rounded-lg bg-bark-300 px-5 py-2 text-sm font-medium text-white",
              "hover:bg-bark-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isPending ? "Сохранение…" : "Сохранить настройки"}
          </button>
          {saved && (
            <span className="text-sm text-sage-500 font-medium">✓ Сохранено</span>
          )}
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
        </div>
      </form>

      {/* ── Account ── */}
      <Section title="Аккаунт">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-parchment-200">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-bark-300">{userEmail}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Для смены email или пароля воспользуйтесь письмом для сброса пароля через форму входа.
          </p>
        </div>
      </Section>

      {/* ── Subscription ── */}
      <Section title="Подписка">
        <div className="flex items-start justify-between gap-4">
          <div>
            {isPremium ? (
              <>
                <span className="inline-flex items-center rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-semibold text-sage-700">
                  Premium
                </span>
                {periodEnd && (
                  <p className="mt-1 text-sm text-muted-foreground">Действует до {periodEnd}</p>
                )}
              </>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full bg-parchment-200 px-2.5 py-0.5 text-xs font-semibold text-bark-200">
                  Free
                </span>
                <p className="mt-1 text-sm text-muted-foreground">
                  Перейдите на Premium, чтобы разблокировать все функции.
                </p>
              </>
            )}
          </div>
          <a
            href="/pricing"
            className="shrink-0 rounded-lg border border-bark-200 px-4 py-1.5 text-sm font-medium text-bark-300 hover:bg-parchment-200 transition-colors"
          >
            Тарифы
          </a>
        </div>
      </Section>

      {/* ── Data ── */}
      <Section title="Данные">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Скачайте все ваши данные о питании и воде в формате CSV.
            </p>
            <a
              href="/api/export-data"
              download
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-sage-300 px-4 py-2",
                "text-sm font-medium text-sage-600 hover:bg-sage-50 transition-colors"
              )}
            >
              <DownloadIcon className="h-4 w-4" />
              Скачать мои данные (CSV)
            </a>
          </div>

          <div className="pt-4 border-t border-parchment-200">
            <p className="text-sm font-medium text-red-700 mb-1">Удалить аккаунт</p>
            <p className="text-xs text-muted-foreground mb-3">
              Все данные будут безвозвратно удалены. Это действие нельзя отменить.
            </p>
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Удалить аккаунт
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Удаление…" : "Подтвердить удаление"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="text-sm text-muted-foreground hover:text-bark-300 transition-colors"
                >
                  Отмена
                </button>
                {deleteError && (
                  <span className="text-sm text-red-600">{deleteError}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6">
      <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-bark-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function RadioCard({
  name,
  value,
  defaultChecked,
  label,
  description,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
  label: string;
  description: string;
}) {
  return (
    <label className="flex-1 cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only peer"
      />
      <div
        className={cn(
          "rounded-lg border border-parchment-200 px-4 py-3 text-sm transition-colors",
          "peer-checked:border-bark-300 peer-checked:bg-bark-50/30",
          "hover:bg-parchment-200"
        )}
      >
        <p className="font-medium text-bark-300">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </label>
  );
}

function TrainingDaysSection({
  trainingDays,
  onChange,
}: {
  trainingDays: Set<number>;
  onChange: (days: Set<number>) => void;
}) {
  function toggle(day: number) {
    const next = new Set(trainingDays);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    onChange(next);
  }

  return (
    <Section title="Дни тренировок">
      <p className="text-xs text-muted-foreground mb-3">
        Выберите дни, в которые вы тренируетесь. Планировщик питания использует эти дни для расчёта калорий.
      </p>
      <div className="flex gap-2 flex-wrap">
        {CATALOG_DAYS_RU.map((label, idx) => {
          const active = trainingDays.has(idx);
          return (
            <label key={idx} className="cursor-pointer select-none">
              <input
                type="checkbox"
                name="training_days"
                value={String(idx)}
                checked={active}
                onChange={() => toggle(idx)}
                className="sr-only"
              />
              <span
                className={cn(
                  "inline-flex items-center justify-center w-10 h-10 rounded-full border text-sm font-semibold transition-colors",
                  active
                    ? "bg-bark-300 border-bark-300 text-white"
                    : "border-parchment-200 bg-white text-bark-200 hover:border-bark-200"
                )}
              >
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </Section>
  );
}

const inputClass =
  "w-full rounded-lg border border-parchment-200 bg-white px-3 py-2 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-ring";

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
