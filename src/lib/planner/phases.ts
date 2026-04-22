/**
 * Multi-phase meal plan constants.
 * Architecture per TES-81 (NutritionistAI plan).
 *
 * 4 phases × 2 weeks = 8 weeks total.
 * Catalog weeks 1–8 map directly to this structure.
 */

export interface MacroSet {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

export interface PhaseCalorieTarget {
  training: number;
  rest: number;
}

export interface PhaseMacros {
  training: MacroSet;
  rest: MacroSet;
}

export interface Phase {
  number: 1 | 2 | 3 | 4;
  nameEn: string;
  nameRu: string;
  goal: string;
  weeks: [number, number]; // [firstWeek, lastWeek] — global week numbers 1–8
  calorie_target: PhaseCalorieTarget;
  macros: PhaseMacros;
}

export const PHASES: Phase[] = [
  {
    number: 1,
    nameEn: "Foundation",
    nameRu: "Основа",
    goal: "Базовые привычки, адаптация пищеварения",
    weeks: [1, 2],
    calorie_target: { training: 2200, rest: 2050 },
    macros: {
      training: { protein_g: 165, carbs_g: 248, fat_g: 61, calories: 2200 },
      rest:     { protein_g: 165, carbs_g: 231, fat_g: 57, calories: 2050 },
    },
  },
  {
    number: 2,
    nameEn: "Cut",
    nameRu: "Сушка",
    goal: "Снижение жира, дефицит калорий",
    weeks: [3, 4],
    calorie_target: { training: 2000, rest: 1800 },
    macros: {
      training: { protein_g: 175, carbs_g: 175, fat_g: 60, calories: 2000 },
      rest:     { protein_g: 175, carbs_g: 158, fat_g: 53, calories: 1800 },
    },
  },
  {
    number: 3,
    nameEn: "Performance",
    nameRu: "Прогресс",
    goal: "Сохранение мышц, углеводная загрузка",
    weeks: [5, 6],
    calorie_target: { training: 2200, rest: 2000 },
    macros: {
      training: { protein_g: 165, carbs_g: 275, fat_g: 49, calories: 2200 },
      rest:     { protein_g: 165, carbs_g: 250, fat_g: 44, calories: 2000 },
    },
  },
  {
    number: 4,
    nameEn: "Maintenance",
    nameRu: "Поддержание",
    goal: "Устойчивый долгосрочный рацион",
    weeks: [7, 8],
    calorie_target: { training: 2100, rest: 1950 },
    macros: {
      training: { protein_g: 158, carbs_g: 210, fat_g: 70, calories: 2100 },
      rest:     { protein_g: 158, carbs_g: 195, fat_g: 65, calories: 1950 },
    },
  },
];

/** Convert (phaseNumber, weekInPhase) → global week (1–8). */
export function toGlobalWeek(phaseNumber: number, weekInPhase: 1 | 2): number {
  return (phaseNumber - 1) * 2 + weekInPhase;
}

/** Convert global week (1–8) → { phase, weekInPhase }. */
export function fromGlobalWeek(week: number): { phase: Phase; weekInPhase: 1 | 2 } {
  const phaseIndex = Math.floor((week - 1) / 2);
  const weekInPhase = ((week - 1) % 2 + 1) as 1 | 2;
  return { phase: PHASES[phaseIndex] ?? PHASES[0], weekInPhase };
}

/**
 * Hard nutrition guards per TES-81.
 * Apply before rendering calorie targets for any user TDEE.
 */
export const NUTRITION_GUARDS = {
  CALORIE_FLOOR_KCAL: 1600,
  MAX_DEFICIT_KCAL_PER_DAY: 500,
  MIN_PROTEIN_G_PER_KG: 1.6,
} as const;

/**
 * Scale a phase calorie target to a user's TDEE.
 * renderCalories = template × (userTdee / referenceTdee)
 * Clamped to CALORIE_FLOOR.
 */
export function scaleCalories(
  templateKcal: number,
  userTdee: number,
  referenceTdee: number
): number {
  const scaled = Math.round(templateKcal * (userTdee / referenceTdee));
  return Math.max(scaled, NUTRITION_GUARDS.CALORIE_FLOOR_KCAL);
}

/**
 * Default training schedule for display.
 * 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 * Catalog day field: 0=Mon...6=Sun
 */
export const DEFAULT_TRAINING_DAYS = new Set([0, 2, 4, 5]); // Mon, Wed, Fri, Sat

/** Catalog day index (0=Mon) → is training day.
 *  Pass a user-specific set to override the default schedule.
 */
export function isCatalogTrainingDay(day: number, userDays?: Set<number>): boolean {
  return (userDays ?? DEFAULT_TRAINING_DAYS).has(day);
}

export type DayType = "training" | "rest";

export const DAY_NAMES_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABEL_RU: Record<MealType, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  snack: "Перекус",
  dinner: "Ужин",
};
