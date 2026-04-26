'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect, useRef } from 'react';
import { AddFoodDialog } from './AddFoodDialog';
import { AISuggestionCard } from './AISuggestionCard';
import { deleteFoodEntry, getLogEntriesPage } from '@/app/dashboard/log/actions';
import { LOG_PAGE_SIZE } from '@/app/dashboard/log/constants';
import { cn } from '@/lib/utils';
import type { UserGoals } from '@/app/dashboard/profile/actions';

export interface NutritionEntry {
  id: string;
  meal_type: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

interface UserProfileMin {
  primary_goal?: string | null;
  dietary_restrictions?: string[];
  eating_disorder_flag?: boolean;
  // TES-154: Granular eating disorder flags
  eating_disorder_anorexia_restrictive?: boolean;
  eating_disorder_binge?: boolean;
  eating_disorder_orthorexia?: boolean;
}

interface NutritionLogClientProps {
  date: string;
  entries: NutritionEntry[];
  goals: UserGoals;
  userProfile: UserProfileMin;
  hasMore?: boolean;
}

const MEALS = [
  { key: 'breakfast', label: 'Завтрак' },
  { key: 'lunch', label: 'Обед' },
  { key: 'dinner', label: 'Ужин' },
  { key: 'snacks', label: 'Перекусы' },
] as const;

export function NutritionLogClient({
  date,
  entries,
  goals,
  userProfile,
  hasMore: initialHasMore = false,
}: NutritionLogClientProps) {
  const router = useRouter();
  // triggerKey bumps every time an entry is added, causing AISuggestionCard to re-fetch
  const [suggestionTrigger, setSuggestionTrigger] = useState(entries.length > 0 ? 1 : 0);

  // Pagination: server sends first page; extra pages are appended client-side.
  // When the server re-renders (add/delete revalidates), reset extras so the
  // list stays in sync with fresh server data.
  const [extraEntries, setExtraEntries] = useState<NutritionEntry[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const prevEntriesRef = useRef(entries);
  useEffect(() => {
    if (prevEntriesRef.current !== entries) {
      prevEntriesRef.current = entries;
      setExtraEntries([]);
      setHasMore(initialHasMore);
    }
  }, [entries, initialHasMore]);

  const allEntries = [...entries, ...extraEntries];

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const { entries: more, hasMore: moreRemaining } = await getLogEntriesPage(
        date,
        entries.length + extraEntries.length
      );
      setExtraEntries((prev) => [...prev, ...more]);
      setHasMore(moreRemaining);
    } finally {
      setLoadingMore(false);
    }
  }

  const totals = allEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein_g: acc.protein_g + Number(e.protein_g),
      carbs_g: acc.carbs_g + Number(e.carbs_g),
      fat_g: acc.fat_g + Number(e.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const dayTotals = {
    current_kcal: Math.round(totals.calories),
    target_kcal: goals.daily_calorie_target,
    current_protein_g: Math.round(totals.protein_g),
    target_protein_g: goals.protein_target_g,
    current_carbs_g: Math.round(totals.carbs_g),
    target_carbs_g: goals.carbs_target_g,
    current_fat_g: Math.round(totals.fat_g),
    target_fat_g: goals.fat_target_g,
  };

  function navigateDate(offset: number) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    router.push(`/dashboard/log?date=${d.toISOString().split('T')[0]}`);
  }

  function handleDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) router.push(`/dashboard/log?date=${e.target.value}`);
  }

  function handleEntryAdded() {
    setSuggestionTrigger((k) => k + 1);
  }

  const today = new Date().toISOString().split('T')[0];
  const isToday = date === today;
  const displayLabel = isToday ? 'Сегодня' : formatDisplayDate(date);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header + date nav */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-bark-300">Дневник питания</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{displayLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate(-1)}
            className={navBtnCls}
            aria-label="Предыдущий день"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          <input
            type="date"
            value={date}
            onChange={handleDateInput}
            className="rounded-lg border border-parchment-200 bg-white px-3 py-1.5 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <button
            onClick={() => navigateDate(1)}
            className={navBtnCls}
            aria-label="Следующий день"
            disabled={isToday}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Daily macro summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MacroCard label="Калории" value={totals.calories} unit="ккал" accent />
        <MacroCard label="Белки" value={totals.protein_g} unit="г" />
        <MacroCard label="Углеводы" value={totals.carbs_g} unit="г" />
        <MacroCard label="Жиры" value={totals.fat_g} unit="г" />
      </div>

      {/* AI suggestion card — shown when today and has entries */}
      {isToday && (
        <AISuggestionCard
          dayTotals={dayTotals}
          userProfile={userProfile}
          triggerKey={suggestionTrigger}
        />
      )}

      {/* Meal sections */}
      <div className="space-y-4">
        {MEALS.map(({ key, label }) => {
          const mealEntries = allEntries.filter((e) => e.meal_type === key);
          const mealCals = mealEntries.reduce((s, e) => s + e.calories, 0);
          return (
            <MealSection
              key={key}
              mealKey={key}
              label={label}
              calories={mealCals}
              entries={mealEntries}
              date={date}
              onEntryAdded={handleEntryAdded}
            />
          );
        })}
      </div>

      {/* Load more button — shown when there are more entries on the server */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-lg border border-parchment-200 bg-white px-5 py-2 text-sm font-medium text-bark-200 hover:bg-parchment-100 hover:text-bark-300 disabled:opacity-50 transition-colors"
          >
            {loadingMore ? 'Загрузка…' : `Показать ещё ${LOG_PAGE_SIZE}`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Meal Section ── */

function MealSection({
  mealKey,
  label,
  calories,
  entries,
  date,
  onEntryAdded,
}: {
  mealKey: string;
  label: string;
  calories: number;
  entries: NutritionEntry[];
  date: string;
  onEntryAdded: () => void;
}) {
  return (
    <div className="rounded-xl border border-parchment-200 bg-parchment-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-parchment-200 bg-parchment-50">
        <div className="flex items-center gap-2">
          <span className="font-medium text-bark-300 text-sm">{label}</span>
          {calories > 0 && <span className="text-xs text-muted-foreground">{calories} ккал</span>}
        </div>

        <AddFoodDialog date={date} defaultMeal={mealKey} onAdded={onEntryAdded}>
          <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-bark-200 hover:bg-parchment-200 hover:text-bark-300 transition-colors">
            <PlusIcon className="h-3.5 w-3.5" />
            Добавить
          </button>
        </AddFoodDialog>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">Записей пока нет.</p>
      ) : (
        <ul className="divide-y divide-parchment-200">
          {entries.map((entry) => (
            <FoodEntryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Food Entry Row ── */

function FoodEntryRow({ entry }: { entry: NutritionEntry }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteFoodEntry(entry.id);
    });
  }

  return (
    <li
      className={cn('flex items-center justify-between px-4 py-3 gap-4', isPending && 'opacity-50')}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-bark-300 truncate">{entry.food_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Б {Number(entry.protein_g).toFixed(1)}г · У {Number(entry.carbs_g).toFixed(1)}г · Ж{' '}
          {Number(entry.fat_g).toFixed(1)}г
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold text-bark-300">{entry.calories} ккал</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
          aria-label="Удалить запись"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ── Macro Card ── */

function MacroCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        accent
          ? 'border-bark-100 bg-bark-300 text-primary-foreground'
          : 'border-parchment-200 bg-parchment-100'
      )}
    >
      <p
        className={cn(
          'text-xs font-medium uppercase tracking-wide',
          accent ? 'text-parchment-200' : 'text-muted-foreground'
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-1.5 text-2xl font-semibold',
          accent ? 'text-primary-foreground' : 'text-bark-300'
        )}
      >
        {Number.isInteger(value) ? value : value.toFixed(1)}
        <span
          className={cn(
            'ml-1 text-sm font-normal',
            accent ? 'text-parchment-200' : 'text-muted-foreground'
          )}
        >
          {unit}
        </span>
      </p>
    </div>
  );
}

/* ── Helpers ── */

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ── Icons ── */

const navBtnCls =
  'rounded-lg border border-parchment-200 p-2 text-bark-200 hover:bg-parchment-200 hover:text-bark-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
