/**
 * Server-side TDEE and macro calculation utilities.
 *
 * Formula: Mifflin-St Jeor BMR × activity multiplier.
 * Macro distribution mirrors the percentages used in OnboardingWizard (client-side).
 *
 * Board requirement (TES-69): calories must be auto-calculated from stored biometrics
 * (weight_kg, height_cm, age, sex, activity_level). Only fall back to stored/average
 * targets when biometric data is absent.
 */

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface Biometrics {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: 'male' | 'female';
  activity_level?: string;
  is_pregnant?: boolean;
  pregnancy_trimester?: 1 | 2 | 3;
  is_breastfeeding?: boolean;
}

/**
 * Returns TDEE (kcal/day) via Mifflin-St Jeor.
 * Returns null when any required biometric is missing / invalid.
 */
export function calculateTDEE(bio: Partial<Biometrics>): number | null {
  const { weight_kg, height_cm, age, sex } = bio;
  if (!weight_kg || !height_cm || !age || !sex) return null;
  if (weight_kg <= 0 || height_cm <= 0 || age <= 0) return null;

  const bmr =
    sex === 'male'
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;

  const multiplier = ACTIVITY_MULTIPLIERS[bio.activity_level ?? 'moderate'] ?? 1.55;
  const base = Math.round(bmr * multiplier);

  // Pregnancy / breastfeeding TDEE uplift (TES-167)
  let pregnancyUplift = 0;
  if (bio.is_pregnant) {
    if (bio.pregnancy_trimester === 2) pregnancyUplift = 340;
    else if (bio.pregnancy_trimester === 3) pregnancyUplift = 452;
    // Trimester 1: +0 kcal per clinical guidelines
  }
  if (bio.is_breastfeeding) pregnancyUplift = 500;

  return base + pregnancyUplift;
}

export interface MacroTargets {
  daily_calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
}

/**
 * Derives macro targets from TDEE and primary goal.
 * Uses the same percentage splits as the onboarding wizard.
 *
 * sex is used to apply the correct clinical calorie floor:
 *   female → 1 200 kcal (standard recommendation)
 *   male   → 1 500 kcal (NIH / BDA guideline)
 */
export function calculateMacros(
  tdee: number,
  primaryGoal: string,
  sex?: 'male' | 'female'
): MacroTargets {
  let calories = tdee;
  let proteinPct = 0.25;
  let carbsPct = 0.5;
  let fatPct = 0.25;

  const calorieFloor = sex === 'male' ? 1500 : 1200;

  switch (primaryGoal) {
    case 'weight_loss':
      calories = Math.max(calorieFloor, tdee - 400);
      proteinPct = 0.3;
      carbsPct = 0.4;
      fatPct = 0.3;
      break;
    case 'muscle_gain':
      calories = tdee + 300;
      proteinPct = 0.35;
      carbsPct = 0.45;
      fatPct = 0.2;
      break;
    case 'disease_management':
      proteinPct = 0.25;
      carbsPct = 0.45;
      fatPct = 0.3;
      break;
    // maintenance / general_wellness / default: 25/50/25
  }

  return {
    daily_calorie_target: calories,
    protein_target_g: Math.round((calories * proteinPct) / 4),
    carbs_target_g: Math.round((calories * carbsPct) / 4),
    fat_target_g: Math.round((calories * fatPct) / 9),
  };
}

/**
 * Convenience: compute TDEE from biometrics then derive macros.
 * Returns null when biometrics are incomplete.
 */
export function calculateFromBiometrics(
  bio: Partial<Biometrics>,
  primaryGoal: string
): MacroTargets | null {
  const tdee = calculateTDEE(bio);
  if (!tdee) return null;
  return calculateMacros(tdee, primaryGoal, bio.sex);
}
