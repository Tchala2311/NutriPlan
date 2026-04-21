"use client";

import { useTransition, useState, useEffect } from "react";
import { saveUserGoals, type UserGoals } from "@/app/dashboard/profile/actions";

const GOAL_OPTIONS = [
  { value: "weight_loss",  label: "Weight loss" },
  { value: "muscle_gain",  label: "Muscle gain" },
  { value: "maintenance",  label: "Maintenance" },
];

const GOAL_DEFAULTS: Record<string, Omit<UserGoals, "primary_goal">> = {
  weight_loss: { daily_calorie_target: 1800, protein_target_g: 150, carbs_target_g: 160, fat_target_g: 60 },
  muscle_gain: { daily_calorie_target: 2800, protein_target_g: 200, carbs_target_g: 300, fat_target_g: 80 },
  maintenance: { daily_calorie_target: 2200, protein_target_g: 160, carbs_target_g: 240, fat_target_g: 70 },
};

type Props = { initial: UserGoals };

export function GoalSettingsForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [goal, setGoal] = useState(initial.primary_goal ?? "");
  const [calories, setCalories] = useState(initial.daily_calorie_target);
  const [protein, setProtein] = useState(initial.protein_target_g);
  const [carbs, setCarbs] = useState(initial.carbs_target_g);
  const [fat, setFat] = useState(initial.fat_target_g);

  // Auto-fill defaults when goal type changes (only if they haven't been manually set yet)
  const [userEdited, setUserEdited] = useState(false);
  useEffect(() => {
    if (!userEdited && goal && GOAL_DEFAULTS[goal]) {
      const d = GOAL_DEFAULTS[goal];
      setCalories(d.daily_calorie_target);
      setProtein(d.protein_target_g);
      setCarbs(d.carbs_target_g);
      setFat(d.fat_target_g);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal]);

  function handleNumericChange(setter: (v: number) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setUserEdited(true);
      setter(Number(e.target.value));
    };
  }

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
        <label className="block text-sm font-medium text-bark-300 mb-2">Primary goal</label>
        <div className="grid grid-cols-3 gap-2">
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
                onChange={() => { setUserEdited(false); setGoal(opt.value); }}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Daily calorie target */}
      <div>
        <label htmlFor="daily_calorie_target" className="block text-sm font-medium text-bark-300 mb-1">
          Daily calorie target
        </label>
        <div className="flex items-center gap-2">
          <input
            id="daily_calorie_target"
            name="daily_calorie_target"
            type="number"
            min={500}
            max={10000}
            step={50}
            value={calories}
            onChange={handleNumericChange(setCalories)}
            className="w-32 rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-bark-200"
            required
          />
          <span className="text-sm text-muted-foreground">kcal / day</span>
        </div>
      </div>

      {/* Macros */}
      <div>
        <p className="text-sm font-medium text-bark-300 mb-3">Daily macro targets</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: "protein_target_g", name: "protein_target_g", label: "Protein", value: protein, setter: setProtein },
            { id: "carbs_target_g",   name: "carbs_target_g",   label: "Carbs",   value: carbs,   setter: setCarbs },
            { id: "fat_target_g",     name: "fat_target_g",     label: "Fat",     value: fat,     setter: setFat },
          ].map((macro) => (
            <div key={macro.id}>
              <label htmlFor={macro.id} className="block text-xs font-medium text-muted-foreground mb-1">
                {macro.label}
              </label>
              <div className="flex items-center gap-1">
                <input
                  id={macro.id}
                  name={macro.name}
                  type="number"
                  min={10}
                  max={1000}
                  step={5}
                  value={macro.value}
                  onChange={handleNumericChange(macro.setter)}
                  className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2 text-sm text-bark-300 focus:outline-none focus:ring-2 focus:ring-bark-200"
                  required
                />
                <span className="text-xs text-muted-foreground shrink-0">g</span>
              </div>
            </div>
          ))}
        </div>

        {/* Calorie estimate from macros */}
        <p className="mt-2 text-xs text-muted-foreground">
          Estimated from macros:{" "}
          <span className="font-medium text-bark-200">
            {Math.round(protein * 4 + carbs * 4 + fat * 9)} kcal
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-bark-300 px-5 py-2 text-sm font-semibold text-white hover:bg-bark-200 disabled:opacity-60 transition-colors"
        >
          {isPending ? "Saving…" : "Save goals"}
        </button>
        {saved && (
          <span className="text-sm text-sage-300 font-medium">Saved</span>
        )}
      </div>
    </form>
  );
}
