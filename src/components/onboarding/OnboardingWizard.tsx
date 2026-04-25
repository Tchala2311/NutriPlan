"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { saveOnboarding, type OnboardingFormData } from "@/app/onboarding/actions";

export const ONBOARDING_STORAGE_KEY = "nutriplan_onboarding";

/* ── Option lists ── */

const HEALTH_GOAL_OPTIONS = [
  { value: "weight_loss", label: "Похудеть" },
  { value: "muscle_gain", label: "Набрать мышцы" },
  { value: "maintenance", label: "Поддержать вес" },
  { value: "disease_management", label: "Управление здоровьем" },
  { value: "general_wellness", label: "Здоровый образ жизни" },
  { value: "improve_energy", label: "Больше энергии" },
  { value: "better_sleep", label: "Лучший сон" },
  { value: "reduce_stress", label: "Снизить стресс" },
];

const PRIMARY_GOAL_OPTIONS = [
  { value: "weight_loss", label: "Похудение" },
  { value: "muscle_gain", label: "Набор мышц" },
  { value: "maintenance", label: "Поддержание веса" },
  { value: "disease_management", label: "Управление здоровьем" },
  { value: "general_wellness", label: "Здоровый образ жизни" },
];

const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Вегетарианство" },
  { value: "vegan", label: "Веганство" },
  { value: "gluten_free", label: "Без глютена" },
  { value: "dairy_free", label: "Без лактозы" },
  { value: "halal", label: "Халяль" },
  { value: "kosher", label: "Кошерное" },
  { value: "low_carb", label: "Низкоуглеводное" },
  { value: "keto", label: "Кето" },
  { value: "paleo", label: "Палео" },
];

const ALLERGEN_OPTIONS = [
  { value: "peanuts", label: "Арахис" },
  { value: "tree_nuts", label: "Орехи" },
  { value: "milk", label: "Молоко / Лактоза" },
  { value: "eggs", label: "Яйца" },
  { value: "wheat", label: "Пшеница / Глютен" },
  { value: "soy", label: "Соя" },
  { value: "fish", label: "Рыба" },
  { value: "shellfish", label: "Морепродукты" },
  { value: "sesame", label: "Кунжут" },
];

const MEDICAL_OPTIONS = [
  { value: "diabetes", label: "Диабет (1 или 2 тип)" },
  { value: "hypertension", label: "Гипертония / Высокое давление" },
  { value: "high_cholesterol", label: "Высокий холестерин" },
  { value: "kidney_disease", label: "Болезни почек" },
  { value: "celiac", label: "Целиакия" },
  { value: "ibs", label: "СРК / Расстройства пищеварения" },
  { value: "eating_disorder", label: "Расстройство пищевого поведения" },
  { value: "heart_disease", label: "Болезни сердца" },
];

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Сидячий", sub: "Минимум движения" },
  { value: "light", label: "Лёгкий", sub: "1–3 дня в неделю" },
  { value: "moderate", label: "Умеренный", sub: "3–5 дней в неделю" },
  { value: "active", label: "Активный", sub: "6–7 дней в неделю" },
  { value: "very_active", label: "Очень активный", sub: "Интенсивные тренировки ежедневно" },
];

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/* ── TDEE helpers ── */

interface TdeeInputs {
  age: string;
  weight_kg: string;
  height_cm: string;
  sex: "male" | "female" | "";
  activity_level: string;
}

interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

function computeTdee(inputs: TdeeInputs): number | null {
  const age = parseInt(inputs.age, 10);
  const weight = parseFloat(inputs.weight_kg);
  const height = parseFloat(inputs.height_cm);
  if (!inputs.sex || isNaN(age) || isNaN(weight) || isNaN(height)) return null;
  const bmr =
    inputs.sex === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  const multiplier = ACTIVITY_MULTIPLIERS[inputs.activity_level] ?? 1.55;
  return Math.round(bmr * multiplier);
}

function computeMacros(tdee: number | null, primaryGoal: string): MacroTargets | null {
  if (!tdee) return null;
  let calories = tdee;
  let proteinPct = 0.25;
  let carbsPct = 0.5;
  let fatPct = 0.25;

  switch (primaryGoal) {
    case "weight_loss":
      calories = Math.max(1200, tdee - 400);
      proteinPct = 0.3;
      carbsPct = 0.4;
      fatPct = 0.3;
      break;
    case "muscle_gain":
      calories = tdee + 300;
      proteinPct = 0.35;
      carbsPct = 0.45;
      fatPct = 0.2;
      break;
    case "maintenance":
      proteinPct = 0.25;
      carbsPct = 0.5;
      fatPct = 0.25;
      break;
    case "disease_management":
      proteinPct = 0.25;
      carbsPct = 0.45;
      fatPct = 0.3;
      break;
    case "general_wellness":
      proteinPct = 0.25;
      carbsPct = 0.5;
      fatPct = 0.25;
      break;
  }

  return {
    calories,
    protein_g: Math.round((calories * proteinPct) / 4),
    carbs_g: Math.round((calories * carbsPct) / 4),
    fat_g: Math.round((calories * fatPct) / 9),
  };
}

/* ── Subcomponents ── */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i < current
              ? "w-6 bg-sage-300"
              : i === current
              ? "w-8 bg-bark-300"
              : "w-6 bg-parchment-200"
          )}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        Шаг {current + 1} из {total}
      </span>
    </div>
  );
}

function MultiSelectChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? "border-bark-300 bg-bark-300 text-primary-foreground"
          : "border-parchment-200 bg-parchment-100 text-bark-200 hover:border-bark-100 hover:text-bark-300"
      )}
    >
      {label}
    </button>
  );
}

function MacroBar({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={cn("h-3 w-3 rounded-full", color)} />
        <span className="text-sm text-bark-200">{label}</span>
      </div>
      <span className="text-sm font-semibold text-bark-300">
        {value}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>
      </span>
    </div>
  );
}

/* ── Main wizard ── */

interface OnboardingWizardProps {
  /** true when user is already authenticated — submit saves directly to DB */
  isAuthenticated: boolean;
}

const TOTAL_STEPS = 4; // Goals, Dietary, Medical+Disclaimer, Results

const DRAFT_STORAGE_KEY = "nutriplan_onboarding_draft";

function loadDraft(): { form: OnboardingFormData; tdee: TdeeInputs; step: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function OnboardingWizard({ isAuthenticated }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<OnboardingFormData>({
    health_goals: [],
    primary_goal: "",
    dietary_restrictions: [],
    allergens: [],
    avoided_ingredients: "",
    medical_conditions: [],
    medications: "",
    disclaimer_accepted: false,
  });

  const [tdee, setTdee] = useState<TdeeInputs>({
    age: "",
    weight_kg: "",
    height_cm: "",
    sex: "",
    activity_level: "moderate",
  });

  // Restore draft on first render (step-by-step persistence for UF-1)
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setForm(draft.form);
      setTdee(draft.tdee);
      // Only restore step if not yet at results page (step 3 = results)
      if (draft.step > 0 && draft.step < 3) setStep(draft.step);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft to localStorage on every change (UF-1)
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ form, tdee, step }));
    } catch {
      // localStorage unavailable
    }
  }, [form, tdee, step]);

  function toggleArray(field: keyof OnboardingFormData, value: string) {
    setForm((prev) => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  }

  const tdeeValue = computeTdee(tdee);
  const macros = computeMacros(tdeeValue, form.primary_goal);

  /** Persist to localStorage and advance to results (step 3) */
  function persistAndShowResults() {
    try {
      localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({ ...form, tdee: tdeeValue, macros })
      );
    } catch {
      // localStorage unavailable — proceed anyway
    }
  }

  /** For authenticated users: save directly to DB */
  function handleAuthenticatedSave() {
    setError(null);
    startTransition(async () => {
      try {
        await saveOnboarding({
          ...form,
          weight_kg:      tdee.weight_kg ? parseFloat(tdee.weight_kg) : null,
          height_cm:      tdee.height_cm ? parseInt(tdee.height_cm, 10) : null,
          age:            tdee.age ? parseInt(tdee.age, 10) : null,
          sex:            tdee.sex || null,
          activity_level: tdee.activity_level || "moderate",
        });
        // Clear draft on success — saveOnboarding redirects to /dashboard (replace)
        try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ok */ }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Что-то пошло не так. Попробуйте снова.");
      }
    });
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {step < TOTAL_STEPS - 1 && <StepIndicator current={step} total={TOTAL_STEPS - 1} />}

      {/* ── Step 0: Health Goals + TDEE ── */}
      {step === 0 && (
        <div>
          <h2 className="font-display text-xl font-bold text-bark-300 mb-1">
            Каковы ваши цели?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Выберите всё подходящее.
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {HEALTH_GOAL_OPTIONS.map((opt) => (
              <MultiSelectChip
                key={opt.value}
                label={opt.label}
                selected={form.health_goals.includes(opt.value)}
                onToggle={() => toggleArray("health_goals", opt.value)}
              />
            ))}
          </div>

          <div className="mb-5">
            <p className="text-sm font-medium text-foreground mb-3">Основной приоритет</p>
            <div className="space-y-2">
              {PRIMARY_GOAL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                    form.primary_goal === opt.value
                      ? "border-bark-300 bg-parchment-200"
                      : "border-parchment-200 bg-parchment-100 hover:border-bark-100"
                  )}
                >
                  <input
                    type="radio"
                    name="primary_goal"
                    value={opt.value}
                    checked={form.primary_goal === opt.value}
                    onChange={() => setForm((p) => ({ ...p, primary_goal: opt.value }))}
                    className="accent-bark-300"
                  />
                  <span className="text-sm text-bark-300">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional TDEE inputs */}
          <details className="mb-8">
            <summary className="text-sm font-medium text-bark-200 cursor-pointer hover:text-bark-300 transition-colors mb-3">
              + Добавить параметры тела для расчёта калорий (необязательно)
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Возраст
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={tdee.age}
                  onChange={(e) => setTdee((t) => ({ ...t, age: e.target.value }))}
                  placeholder="Напр. 30"
                  className={cn(
                    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  )}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Вес (кг)
                </label>
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={tdee.weight_kg}
                  onChange={(e) => setTdee((t) => ({ ...t, weight_kg: e.target.value }))}
                  placeholder="Напр. 75"
                  className={cn(
                    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  )}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Рост (см)
                </label>
                <input
                  type="number"
                  min={100}
                  max={250}
                  value={tdee.height_cm}
                  onChange={(e) => setTdee((t) => ({ ...t, height_cm: e.target.value }))}
                  placeholder="Напр. 175"
                  className={cn(
                    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  )}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Пол
                </label>
                <select
                  value={tdee.sex}
                  onChange={(e) =>
                    setTdee((t) => ({ ...t, sex: e.target.value as "male" | "female" | "" }))
                  }
                  className={cn(
                    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  )}
                >
                  <option value="">Выбрать</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Уровень активности
                </label>
                <div className="flex gap-1 flex-wrap">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setTdee((t) => ({ ...t, activity_level: opt.value }))
                      }
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        tdee.activity_level === opt.value
                          ? "border-sage-300 bg-sage-300 text-primary-foreground"
                          : "border-parchment-200 bg-parchment-100 text-bark-200 hover:border-sage-200"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>

          <button
            type="button"
            disabled={form.health_goals.length === 0 || form.primary_goal === ""}
            onClick={() => setStep(1)}
            className={cn(
              "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
              "hover:bg-primary/90 transition-colors disabled:opacity-40"
            )}
          >
            Продолжить
          </button>
        </div>
      )}

      {/* ── Step 1: Food Preferences ── */}
      {step === 1 && (
        <div>
          <h2 className="font-display text-xl font-bold text-bark-300 mb-1">
            Предпочтения в питании?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Необязательно — пропустите, если нет ограничений.
          </p>

          <div className="mb-5">
            <p className="text-sm font-medium text-foreground mb-3">Тип питания</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((opt) => (
                <MultiSelectChip
                  key={opt.value}
                  label={opt.label}
                  selected={form.dietary_restrictions.includes(opt.value)}
                  onToggle={() => toggleArray("dietary_restrictions", opt.value)}
                />
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-sm font-medium text-foreground mb-3">Аллергены</p>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((opt) => (
                <MultiSelectChip
                  key={opt.value}
                  label={opt.label}
                  selected={form.allergens.includes(opt.value)}
                  onToggle={() => toggleArray("allergens", opt.value)}
                />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Другие нежелательные ингредиенты{" "}
              <span className="font-normal text-muted-foreground">(необязательно)</span>
            </label>
            <input
              type="text"
              value={form.avoided_ingredients}
              onChange={(e) =>
                setForm((p) => ({ ...p, avoided_ingredients: e.target.value }))
              }
              placeholder="Напр. кинза, грибы"
              className={cn(
                "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              )}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={cn(
                "flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              Продолжить
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Medical + Disclaimer ── */}
      {step === 2 && (
        <div>
          <h2 className="font-display text-xl font-bold text-bark-300 mb-1">
            Здоровье
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Помогает давать более безопасные рекомендации. Данные конфиденциальны.
          </p>

          <div className="mb-5">
            <p className="text-sm font-medium text-foreground mb-3">
              Заболевания{" "}
              <span className="font-normal text-muted-foreground">(выберите все подходящие)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {MEDICAL_OPTIONS.map((opt) => (
                <MultiSelectChip
                  key={opt.value}
                  label={opt.label}
                  selected={form.medical_conditions.includes(opt.value)}
                  onToggle={() => toggleArray("medical_conditions", opt.value)}
                />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Принимаемые препараты{" "}
              <span className="font-normal text-muted-foreground">(необязательно)</span>
            </label>
            <textarea
              value={form.medications}
              onChange={(e) => setForm((p) => ({ ...p, medications: e.target.value }))}
              rows={2}
              placeholder="Напр. Метформин, Лизиноприл"
              className={cn(
                "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              )}
            />
          </div>

          <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-4 mb-8">
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              NutriPlan предоставляет информацию о питании и инструменты для планирования меню
              исключительно в целях общего оздоровления. Это <strong>не заменяет</strong> консультацию
              врача, диагностику или лечение. Перед значительными изменениями в питании, особенно при
              наличии заболеваний, проконсультируйтесь со специалистом.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.disclaimer_accepted}
                onChange={(e) =>
                  setForm((p) => ({ ...p, disclaimer_accepted: e.target.checked }))
                }
                className="mt-0.5 accent-bark-300"
              />
              <span className="text-sm text-bark-300 font-medium">
                Я понимаю и согласен, что NutriPlan не является медицинской рекомендацией.
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={!form.disclaimer_accepted}
              onClick={() => {
                persistAndShowResults();
                setStep(3);
              }}
              className={cn(
                "flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                "hover:bg-primary/90 transition-colors disabled:opacity-40"
              )}
            >
              Показать план
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Results screen ── */}
      {step === 3 && (
        <div>
          {/* Success header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-sage-300/20 mb-3">
              <CheckIcon className="h-6 w-6 text-sage-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-bark-300 mb-1">
              Ваш персональный план готов
            </h2>
            <p className="text-sm text-muted-foreground">
              На основе вашей цели:{" "}
              <strong>{PRIMARY_GOAL_OPTIONS.find((o) => o.value === form.primary_goal)?.label ?? "общее здоровье"}</strong>.
            </p>
          </div>

          {/* Macro targets */}
          <div className="rounded-xl border border-parchment-200 bg-white/60 p-5 mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Дневные цели
            </p>
            {macros ? (
              <div className="space-y-3">
                <MacroBar
                  label="Калории"
                  value={macros.calories}
                  unit="ккал"
                  color="bg-bark-300"
                />
                <MacroBar
                  label="Белки"
                  value={macros.protein_g}
                  unit="г"
                  color="bg-sage-300"
                />
                <MacroBar
                  label="Углеводы"
                  value={macros.carbs_g}
                  unit="г"
                  color="bg-amber-400"
                />
                <MacroBar
                  label="Жиры"
                  value={macros.fat_g}
                  unit="г"
                  color="bg-rose-400"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Укажите параметры тела на первом шаге для расчёта калорий, или создайте аккаунт
                для ручной настройки.
              </p>
            )}
          </div>

          {/* What's included teaser */}
          <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Что вы получите с аккаунтом
            </p>
            <ul className="space-y-2">
              {[
                "ИИ-планировщик недельного меню под ваши цели",
                "Дневник питания с трекингом макросов",
                "Распознавание блюд по фото",
                "Графики прогресса и аналитика",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-bark-200">
                  <CheckIcon className="h-4 w-4 text-sage-300 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          {isAuthenticated ? (
            /* Authenticated: save directly to DB */
            <button
              type="button"
              disabled={isPending}
              onClick={handleAuthenticatedSave}
              className={cn(
                "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                "hover:bg-primary/90 transition-colors disabled:opacity-40 mb-3"
              )}
            >
              {isPending ? "Сохраняем…" : "Сохранить план и перейти в кабинет"}
            </button>
          ) : (
            /* Unauthenticated: CTA to register */
            <Link
              href="/register?from=onboarding"
              className={cn(
                "block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground text-center",
                "hover:bg-primary/90 transition-colors mb-3"
              )}
            >
              Создать бесплатный аккаунт для сохранения плана
            </Link>
          )}

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Назад
          </button>
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
