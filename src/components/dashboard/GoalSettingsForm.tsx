"use client";

import { useTransition, useState, useEffect } from "react";
import { saveUserGoals, type UserGoals } from "@/app/dashboard/profile/actions";

const GOAL_OPTIONS = [
  { value: "weight_loss",        label: "Похудение" },
  { value: "muscle_gain",        label: "Набор мышц" },
  { value: "maintenance",        label: "Поддержание" },
  { value: "disease_management", label: "Управление здоровьем" },
  { value: "general_wellness",   label: "Общее здоровье" },
];

const ACTIVITY_OPTIONS = [
  { value: "sedentary",   label: "Сидячий" },
  { value: "light",       label: "Лёгкий" },
  { value: "moderate",    label: "Умеренный" },
  { value: "active",      label: "Активный" },
  { value: "very_active", label: "Очень активный" },
];

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

function computeTDEE(weight: number, height: number, age: number, sex: string, activity: string): number | null {
  if (!weight || !height || !age || !sex) return null;
  const bmr = sex === "male"
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activity] ?? 1.55));
}

function computeMacros(tdee: number, goal: string) {
  let calories = tdee;
  let proteinPct = 0.25, carbsPct = 0.5, fatPct = 0.25;
  switch (goal) {
    case "weight_loss":        calories = Math.max(1200, tdee - 400); proteinPct = 0.3; carbsPct = 0.4; fatPct = 0.3; break;
    case "muscle_gain":        calories = tdee + 300; proteinPct = 0.35; carbsPct = 0.45; fatPct = 0.2; break;
    case "disease_management": proteinPct = 0.25; carbsPct = 0.45; fatPct = 0.3; break;
  }
  return {
    calories,
    protein: Math.round((calories * proteinPct) / 4),
    carbs:   Math.round((calories * carbsPct) / 4),
    fat:     Math.round((calories * fatPct) / 9),
  };
}

type Props = { initial: UserGoals };

export function GoalSettingsForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [goal, setGoal] = useState(initial.primary_goal ?? "");

  // Biometrics
  const [weight,   setWeight]   = useState(String(initial.weight_kg   ?? ""));
  const [height,   setHeight]   = useState(String(initial.height_cm   ?? ""));
  const [age,      setAge]      = useState(String(initial.age         ?? ""));
  const [sex,      setSex]      = useState<string>(initial.sex        ?? "");
  const [activity, setActivity] = useState(initial.activity_level     ?? "moderate");

  // Displayed macro values (auto-computed or manual)
  const [calories, setCalories] = useState(initial.daily_calorie_target);
  const [protein,  setProtein]  = useState(initial.protein_target_g);
  const [carbs,    setCarbs]    = useState(initial.carbs_target_g);
  const [fat,      setFat]      = useState(initial.fat_target_g);

  // Derived TDEE from current biometrics
  const tdeeValue = computeTDEE(
    parseFloat(weight), parseFloat(height), parseInt(age, 10), sex, activity
  );
  const hasBiometrics = !!tdeeValue;

  // Auto-fill macros when biometrics or goal change
  useEffect(() => {
    if (tdeeValue && goal) {
      const m = computeMacros(tdeeValue, goal);
      setCalories(m.calories);
      setProtein(m.protein);
      setCarbs(m.carbs);
      setFat(m.fat);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tdeeValue, goal]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await saveUserGoals(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Primary goal */}
      <div>
        <label className="block text-sm font-medium text-bark-300 mb-2">Основная цель</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {GOAL_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                goal === opt.value
                  ? "border-bark-300 bg-bark-300 text-white"
                  : "border-parchment-300 bg-parchment-50 text-bark-200 hover:border-bark-100"
              }`}
            >
              <input
                type="radio"
                name="primary_goal"
                value={opt.value}
                checked={goal === opt.value}
                onChange={() => setGoal(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Biometrics */}
      <div>
        <p className="text-sm font-medium text-bark-300 mb-1">
          Параметры тела
          <span className="ml-1 font-normal text-muted-foreground text-xs">
            — для автоматического расчёта калорий
          </span>
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Вес (кг)</label>
            <input
              type="number" name="weight_kg" min={20} max={500} step={0.1}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Напр. 75"
              className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-bark-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Рост (см)</label>
            <input
              type="number" name="height_cm" min={50} max={300}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="Напр. 175"
              className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-bark-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Возраст</label>
            <input
              type="number" name="age" min={10} max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Напр. 30"
              className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-bark-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Пол</label>
            <select
              name="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-bark-200"
            >
              <option value="">Не указан</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Уровень активности</label>
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activity === opt.value
                    ? "border-sage-300 bg-sage-300 text-white"
                    : "border-parchment-300 bg-parchment-50 text-bark-200 hover:border-sage-200"
                }`}
              >
                <input
                  type="radio"
                  name="activity_level"
                  value={opt.value}
                  checked={activity === opt.value}
                  onChange={() => setActivity(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        {tdeeValue && (
          <p className="mt-2 text-xs text-sage-400 font-medium">
            Ваш TDEE: {tdeeValue} ккал/день
          </p>
        )}
      </div>

      {/* Calorie + macro targets */}
      <div>
        <p className="text-sm font-medium text-bark-300 mb-1">Дневные цели по КБЖУ</p>
        {hasBiometrics && (
          <p className="text-xs text-muted-foreground mb-3">
            Рассчитаны по параметрам тела. Можно изменить вручную.
          </p>
        )}

        <div className="mb-3">
          <label htmlFor="daily_calorie_target" className="block text-xs font-medium text-muted-foreground mb-1">
            Калории
          </label>
          <div className="flex items-center gap-2">
            <input
              id="daily_calorie_target"
              name="daily_calorie_target"
              type="number" min={500} max={10000} step={50}
              value={calories}
              onChange={(e) => setCalories(Number(e.target.value))}
              className="w-32 rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-bark-200"
              required
            />
            <span className="text-sm text-muted-foreground">ккал / день</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { id: "protein_target_g", name: "protein_target_g", label: "Белки",    value: protein, setter: setProtein },
            { id: "carbs_target_g",   name: "carbs_target_g",   label: "Углеводы", value: carbs,   setter: setCarbs },
            { id: "fat_target_g",     name: "fat_target_g",     label: "Жиры",     value: fat,     setter: setFat },
          ].map((macro) => (
            <div key={macro.id}>
              <label htmlFor={macro.id} className="block text-xs font-medium text-muted-foreground mb-1">
                {macro.label}
              </label>
              <div className="flex items-center gap-1">
                <input
                  id={macro.id}
                  name={macro.name}
                  type="number" min={10} max={1000} step={5}
                  value={macro.value}
                  onChange={(e) => macro.setter(Number(e.target.value))}
                  className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-bark-200"
                  required
                />
                <span className="text-xs text-muted-foreground shrink-0">г</span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Расчёт из макросов:{" "}
          <span className="font-medium text-bark-200">
            {Math.round(protein * 4 + carbs * 4 + fat * 9)} ккал
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-bark-300 px-5 py-2 text-sm font-semibold text-white hover:bg-bark-200 disabled:opacity-60 transition-colors"
        >
          {isPending ? "Сохраняем…" : "Сохранить цели"}
        </button>
        {saved && (
          <span className="text-sm text-sage-300 font-medium">Сохранено</span>
        )}
      </div>
    </form>
  );
}
