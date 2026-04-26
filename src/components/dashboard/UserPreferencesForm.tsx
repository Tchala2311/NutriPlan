'use client';

import { useState, useTransition, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { saveUserPreferences } from '@/app/dashboard/profile/actions';

const DIETARY_RESTRICTION_OPTIONS = [
  'vegan',
  'vegetarian',
  'keto',
  'gluten-free',
  'dairy-free',
  'nut-free',
];
const ALLERGEN_OPTIONS = [
  'peanuts',
  'treenuts',
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'soy',
  'sesame',
];

const DIETARY_LABELS: Record<string, string> = {
  vegan: 'Веган',
  vegetarian: 'Вегетарианец',
  keto: 'Кетогенная диета',
  'gluten-free': 'Без глютена',
  'dairy-free': 'Без молочных продуктов',
  'nut-free': 'Без орехов',
};

const ALLERGEN_LABELS: Record<string, string> = {
  peanuts: 'Арахис',
  treenuts: 'Древесные орехи',
  milk: 'Молоко',
  eggs: 'Яйца',
  fish: 'Рыба',
  shellfish: 'Морепродукты',
  soy: 'Соя',
  sesame: 'Кунжут',
};

interface UserPreferencesFormProps {
  initialTrainingDays: number[];
  initialDietaryRestrictions: string[];
  initialAllergens: string[];
}

export function UserPreferencesForm({
  initialTrainingDays,
  initialDietaryRestrictions,
  initialAllergens,
}: UserPreferencesFormProps) {
  const [trainingDays, setTrainingDays] = useState<Set<number>>(new Set(initialTrainingDays));
  const [dietaryRestrictions, setDietaryRestrictions] = useState<Set<string>>(
    new Set(initialDietaryRestrictions)
  );
  const [allergens, setAllergens] = useState<Set<string>>(new Set(initialAllergens));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTrainingDays(new Set(initialTrainingDays));
    setDietaryRestrictions(new Set(initialDietaryRestrictions));
    setAllergens(new Set(initialAllergens));
  }, [initialTrainingDays, initialDietaryRestrictions, initialAllergens]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setSaveError(null);

    const formData = new FormData();
    trainingDays.forEach((day) => formData.append(`training_day_${day}`, String(day)));
    dietaryRestrictions.forEach((dr) => formData.append(`dietary_restriction_${dr}`, dr));
    allergens.forEach((allergen) => formData.append(`allergen_${allergen}`, allergen));

    startTransition(async () => {
      const result = await saveUserPreferences(formData);
      if (result?.error) {
        setSaveError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Training Days */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6">
        <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide mb-5">
          Тренировочные дни
        </h2>
        <div>
          <label className="block text-sm font-medium text-bark-300 mb-1.5">
            Дни тренировок в спортзале
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { day: 0, label: 'Пн' },
              { day: 1, label: 'Вт' },
              { day: 2, label: 'Ср' },
              { day: 3, label: 'Чт' },
              { day: 4, label: 'Пт' },
              { day: 5, label: 'Сб' },
              { day: 6, label: 'Вс' },
            ].map(({ day, label }) => (
              <label key={day} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  value={String(day)}
                  checked={trainingDays.has(day)}
                  onChange={(e) => {
                    const newDays = new Set(trainingDays);
                    if (e.target.checked) newDays.add(day);
                    else newDays.delete(day);
                    setTrainingDays(newDays);
                  }}
                  className="hidden peer"
                />
                <div
                  className={cn(
                    'flex-1 text-center py-2.5 rounded-lg border transition-colors font-medium text-sm',
                    'peer-checked:border-bark-300 peer-checked:bg-bark-50 peer-checked:text-bark-300',
                    'peer-unchecked:border-parchment-200 peer-unchecked:text-stone-400 hover:bg-parchment-200'
                  )}
                >
                  {label}
                </div>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Выберите дни, когда вы тренируетесь в спортзале
          </p>
        </div>
      </div>

      {/* Food Preferences */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-100 p-6">
        <h2 className="text-sm font-semibold text-bark-300 uppercase tracking-wide mb-5">
          Пищевые предпочтения
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bark-300 mb-1.5">
              Диетические ограничения
            </label>
            <div className="space-y-3">
              {DIETARY_RESTRICTION_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dietaryRestrictions.has(option)}
                    onChange={(e) => {
                      const newRestrictions = new Set(dietaryRestrictions);
                      if (e.target.checked) newRestrictions.add(option);
                      else newRestrictions.delete(option);
                      setDietaryRestrictions(newRestrictions);
                    }}
                    className="rounded border-parchment-300"
                  />
                  <span className="text-sm text-bark-300">{DIETARY_LABELS[option]}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-bark-300 mb-1.5">Аллергии</label>
            <div className="space-y-3">
              {ALLERGEN_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allergens.has(option)}
                    onChange={(e) => {
                      const newAllergens = new Set(allergens);
                      if (e.target.checked) newAllergens.add(option);
                      else newAllergens.delete(option);
                      setAllergens(newAllergens);
                    }}
                    className="rounded border-parchment-300"
                  />
                  <span className="text-sm text-bark-300">{ALLERGEN_LABELS[option]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'rounded-lg bg-bark-300 px-5 py-2 text-sm font-medium text-white',
            'hover:bg-bark-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isPending ? 'Сохранение…' : 'Сохранить'}
        </button>
        {saved && <span className="text-sm text-sage-500 font-medium">✓ Сохранено</span>}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>
    </form>
  );
}
