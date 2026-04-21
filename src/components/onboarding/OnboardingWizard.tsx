"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveOnboarding, type OnboardingFormData } from "@/app/onboarding/actions";

/* ── Option lists ── */

const HEALTH_GOAL_OPTIONS = [
  { value: "weight_loss", label: "Lose weight" },
  { value: "muscle_gain", label: "Build muscle" },
  { value: "maintenance", label: "Maintain weight" },
  { value: "disease_management", label: "Manage a health condition" },
  { value: "general_wellness", label: "Improve general wellness" },
  { value: "improve_energy", label: "More energy" },
  { value: "better_sleep", label: "Better sleep" },
  { value: "reduce_stress", label: "Reduce stress" },
];

const PRIMARY_GOAL_OPTIONS = [
  { value: "weight_loss", label: "Weight loss" },
  { value: "muscle_gain", label: "Muscle gain" },
  { value: "maintenance", label: "Maintenance" },
  { value: "disease_management", label: "Disease management" },
  { value: "general_wellness", label: "General wellness" },
];

const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "dairy_free", label: "Dairy-free" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "low_carb", label: "Low-carb" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
];

const ALLERGEN_OPTIONS = [
  { value: "peanuts", label: "Peanuts" },
  { value: "tree_nuts", label: "Tree nuts" },
  { value: "milk", label: "Milk / Dairy" },
  { value: "eggs", label: "Eggs" },
  { value: "wheat", label: "Wheat / Gluten" },
  { value: "soy", label: "Soy" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
  { value: "sesame", label: "Sesame" },
];

const MEDICAL_OPTIONS = [
  { value: "diabetes", label: "Diabetes (Type 1 or 2)" },
  { value: "hypertension", label: "Hypertension / High blood pressure" },
  { value: "high_cholesterol", label: "High cholesterol" },
  { value: "kidney_disease", label: "Kidney disease" },
  { value: "celiac", label: "Celiac disease" },
  { value: "ibs", label: "IBS / Digestive disorders" },
  { value: "eating_disorder", label: "Eating disorder (past or present)" },
  { value: "heart_disease", label: "Heart disease" },
];

/* ── Subcomponents ── */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i < current
                ? "w-6 bg-sage-300"
                : i === current
                ? "w-8 bg-bark-300"
                : "w-6 bg-parchment-200"
            )}
          />
        </div>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        Step {current + 1} of {total}
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

/* ── Main wizard ── */

export function OnboardingWizard() {
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

  function toggleArray(field: keyof OnboardingFormData, value: string) {
    setForm((prev) => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  }

  function canAdvanceStep0() {
    return form.health_goals.length > 0 && form.primary_goal !== "";
  }

  function canAdvanceStep1() {
    return true; // dietary is optional
  }

  function canSubmit() {
    return form.disclaimer_accepted;
  }

  function handleSubmit() {
    if (!canSubmit()) return;
    setError(null);
    startTransition(async () => {
      try {
        await saveOnboarding(form);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <StepIndicator current={step} total={3} />

      {/* Step 0 — Health Goals */}
      {step === 0 && (
        <div>
          <h2 className="font-display text-xl font-bold text-bark-300 mb-1">
            What are your health goals?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Select everything that applies. We&apos;ll tailor your plan accordingly.
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

          <div className="mb-8">
            <p className="text-sm font-medium text-foreground mb-3">
              Which is your primary focus?
            </p>
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

          <button
            type="button"
            disabled={!canAdvanceStep0()}
            onClick={() => setStep(1)}
            className={cn(
              "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
              "hover:bg-primary/90 transition-colors disabled:opacity-40"
            )}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 1 — Food Preferences */}
      {step === 1 && (
        <div>
          <h2 className="font-display text-xl font-bold text-bark-300 mb-1">
            Any dietary preferences?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Optional — skip if nothing applies.
          </p>

          <div className="mb-5">
            <p className="text-sm font-medium text-foreground mb-3">Dietary style</p>
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
            <p className="text-sm font-medium text-foreground mb-3">Allergens</p>
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
              Other ingredients to avoid{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              type="text"
              value={form.avoided_ingredients}
              onChange={(e) =>
                setForm((p) => ({ ...p, avoided_ingredients: e.target.value }))
              }
              placeholder="e.g. cilantro, mushrooms"
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
              Back
            </button>
            <button
              type="button"
              disabled={!canAdvanceStep1()}
              onClick={() => setStep(2)}
              className={cn(
                "flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                "hover:bg-primary/90 transition-colors disabled:opacity-40"
              )}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Medical & Disclaimer */}
      {step === 2 && (
        <div>
          <h2 className="font-display text-xl font-bold text-bark-300 mb-1">
            Health background
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Helps us make safer recommendations. All information is private.
          </p>

          <div className="mb-5">
            <p className="text-sm font-medium text-foreground mb-3">
              Medical conditions{" "}
              <span className="font-normal text-muted-foreground">(select all that apply)</span>
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

          <div className="mb-8">
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Current medications{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={form.medications}
              onChange={(e) => setForm((p) => ({ ...p, medications: e.target.value }))}
              rows={2}
              placeholder="e.g. Metformin, Lisinopril"
              className={cn(
                "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              )}
            />
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-4 mb-6">
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              NutriPlan provides nutritional information and meal planning tools for general
              wellness purposes only. It is <strong>not a substitute</strong> for professional
              medical advice, diagnosis, or treatment. Always consult a qualified healthcare
              provider before making significant dietary changes, especially if you have a
              medical condition.
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
                I understand and agree that NutriPlan is not medical advice.
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isPending}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canSubmit() || isPending}
              onClick={handleSubmit}
              className={cn(
                "flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                "hover:bg-primary/90 transition-colors disabled:opacity-40"
              )}
            >
              {isPending ? "Saving…" : "Finish setup"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
