/**
 * Nutrition analysis & detection functions for safety alerts, trends, and plateau detection.
 * These functions analyze nutrition logs and weight data to identify risks and patterns.
 */

export interface DailyNutrition {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface SafetyAlertResult {
  detected: boolean;
  deficiencies: Array<{
    nutrient_name_ru: string;
    actual_avg: number;
    unit: string;
    clinical_min: number;
    pct_of_minimum: number;
    days_below: number;
    window_days: number;
  }>;
  window_days: number;
}

export interface TrendWarningResult {
  detected: boolean;
  trend_metric_name_ru: string;
  trend_category_ru: string;
  trend_direction_ru: string;
  trend_magnitude_pct: number;
  contributing_factors_ru: string;
}

export interface PlateauResult {
  detected: boolean;
  weight_start_kg?: number;
  weight_end_kg?: number;
  weight_change_kg?: number;
  days_on_plateau: number;
}

/**
 * Detect safety alerts based on macro deficiencies over last 7 days.
 * Since micronutrient data isn't captured, we detect severe macro imbalances
 * that correlate with nutrient risks.
 */
export function detectSafetyAlert(
  dailyLogs: DailyNutrition[],
  targetProtein_g: number,
  targetFat_g: number
): SafetyAlertResult {
  if (dailyLogs.length === 0) {
    return { detected: false, deficiencies: [], window_days: 0 };
  }

  // Use last 7 days (or all available)
  const window = dailyLogs.slice(-7);
  const windowDays = window.length;
  const deficiencies = [];

  // Calculate averages
  const avgProtein = window.reduce((sum, d) => sum + d.protein_g, 0) / windowDays;
  const avgFat = window.reduce((sum, d) => sum + d.fat_g, 0) / windowDays;

  // PROTEIN: Check for critically low protein (often correlates with amino acid deficiencies)
  // Clinical minimum: 0.8 g/kg, but for active users 1.2-2.0 g/kg recommended
  // For safety alert: <60% of target = critical
  const proteinClinicalMin = targetProtein_g * 0.6;
  if (avgProtein < proteinClinicalMin) {
    const daysBelow = window.filter((d) => d.protein_g < proteinClinicalMin).length;
    deficiencies.push({
      nutrient_name_ru: 'Белок',
      actual_avg: Math.round(avgProtein * 10) / 10,
      unit: 'г',
      clinical_min: Math.round(proteinClinicalMin * 10) / 10,
      pct_of_minimum: Math.round((avgProtein / proteinClinicalMin) * 100),
      days_below: daysBelow,
      window_days: windowDays,
    });
  }

  // FAT: Check for critically low fat (<20g/day = potential deficiency of fat-soluble vitamins A, D, E, K)
  const fatClinicalMin = Math.max(20, targetFat_g * 0.5);
  if (avgFat < fatClinicalMin) {
    const daysBelow = window.filter((d) => d.fat_g < fatClinicalMin).length;
    deficiencies.push({
      nutrient_name_ru: 'Жиры (необходимы для витаминов A, D, E, K)',
      actual_avg: Math.round(avgFat * 10) / 10,
      unit: 'г',
      clinical_min: Math.round(fatClinicalMin * 10) / 10,
      pct_of_minimum: Math.round((avgFat / fatClinicalMin) * 100),
      days_below: daysBelow,
      window_days: windowDays,
    });
  }

  // CARBS: Check for zero-carb or extreme restriction (can cause electrolyte imbalance, fatigue)
  if (window.some((d) => d.carbs_g === 0)) {
    const daysZero = window.filter((d) => d.carbs_g === 0).length;
    deficiencies.push({
      nutrient_name_ru:
        'Углеводы (полное отсутствие может вызвать усталость и дефицит электролитов)',
      actual_avg:
        Math.round((window.reduce((sum, d) => sum + d.carbs_g, 0) / windowDays) * 10) / 10,
      unit: 'г',
      clinical_min: 50, // Minimum for basic brain function
      pct_of_minimum: Math.round(
        (window.reduce((sum, d) => sum + d.carbs_g, 0) / windowDays / 50) * 100
      ),
      days_below: daysZero,
      window_days: windowDays,
    });
  }

  return {
    detected: deficiencies.length > 0,
    deficiencies,
    window_days: windowDays,
  };
}

/**
 * Detect 7-day negative trends in nutrition metrics.
 * Analyzes calorie intake, macro ratios, and consistency patterns.
 */
export function detectTrendWarning(
  dailyLogs: DailyNutrition[],
  targetCalories: number,
  primaryGoal: string
): TrendWarningResult {
  if (dailyLogs.length < 7) {
    return {
      detected: false,
      trend_metric_name_ru: '',
      trend_category_ru: '',
      trend_direction_ru: '',
      trend_magnitude_pct: 0,
      contributing_factors_ru: '',
    };
  }

  // Split into 3.5-day periods
  const days = dailyLogs.slice(-7);
  const first = days.slice(0, 4);
  const second = days.slice(3, 7);

  const avgCal1 = first.reduce((sum, d) => sum + d.calories, 0) / first.length;
  const avgCal2 = second.reduce((sum, d) => sum + d.calories, 0) / second.length;
  const calorieTrendPct = ((avgCal2 - avgCal1) / avgCal1) * 100;

  const avgProtein1 = first.reduce((sum, d) => sum + d.protein_g, 0) / first.length;
  const avgProtein2 = second.reduce((sum, d) => sum + d.protein_g, 0) / second.length;
  const proteinTrendPct = ((avgProtein2 - avgProtein1) / avgProtein1) * 100;

  // CALORIE TREND: Large drop below target (e.g., -30%)
  if (avgCal2 < targetCalories * 0.7 && calorieTrendPct < -15) {
    const factors = [];
    if (avgProtein2 < avgProtein1 * 0.8) factors.push('снижение белка');
    factors.push('сокращение приёмов пищи');
    return {
      detected: true,
      trend_metric_name_ru: 'Суточные калории',
      trend_category_ru: 'Калорийность',
      trend_direction_ru: `Резкое падение (на ${Math.abs(Math.round(calorieTrendPct))}%)`,
      trend_magnitude_pct: calorieTrendPct,
      contributing_factors_ru: factors.join(', '),
    };
  }

  // PROTEIN TREND: Significant drop (for muscle gain goal)
  if (primaryGoal === 'muscle_gain' && proteinTrendPct < -20 && avgProtein2 < 120) {
    return {
      detected: true,
      trend_metric_name_ru: 'Белок',
      trend_category_ru: 'Макронутриенты',
      trend_direction_ru: `Снижение на ${Math.abs(Math.round(proteinTrendPct))}%`,
      trend_magnitude_pct: proteinTrendPct,
      contributing_factors_ru: 'смена продуктов, пропуск приёмов пищи',
    };
  }

  // CALORIE SPIKE: Significant increase (may indicate loss of control for weight loss)
  if (primaryGoal === 'weight_loss' && calorieTrendPct > 25 && avgCal2 > targetCalories * 1.2) {
    return {
      detected: true,
      trend_metric_name_ru: 'Суточные калории',
      trend_category_ru: 'Калорийность',
      trend_direction_ru: `Скачок вверх на ${Math.round(calorieTrendPct)}%`,
      trend_magnitude_pct: calorieTrendPct,
      contributing_factors_ru: 'увеличение размера порций, частые снеки, сладкие напитки',
    };
  }

  // INCONSISTENCY TREND: Highly variable intake (CV > 40%)
  const calories = days.map((d) => d.calories);
  const mean = calories.reduce((a, b) => a + b) / calories.length;
  const variance = calories.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / calories.length;
  const cv = (Math.sqrt(variance) / mean) * 100;
  if (cv > 40) {
    return {
      detected: true,
      trend_metric_name_ru: 'Вариативность калорийности',
      trend_category_ru: 'Консистентность',
      trend_direction_ru: `Высокая нестабильность (CV ${Math.round(cv)}%)`,
      trend_magnitude_pct: cv,
      contributing_factors_ru: 'нерегулярное питание, переедание в выходные, пропуски приёмов',
    };
  }

  return {
    detected: false,
    trend_metric_name_ru: '',
    trend_category_ru: '',
    trend_direction_ru: '',
    trend_magnitude_pct: 0,
    contributing_factors_ru: '',
  };
}

/**
 * Detect weight loss plateau.
 * Requires weight logs; checks if weight hasn't changed despite calorie deficit.
 */
export function detectPlateau(
  weightLogs: Array<{ date: string; weight_kg: number }>,
  dailyNutrition: DailyNutrition[],
  targetCalories: number
): PlateauResult {
  if (weightLogs.length < 7) {
    return { detected: false, days_on_plateau: 0 };
  }

  const recentWeights = weightLogs.slice(-7);
  const weightStart = recentWeights[0].weight_kg;
  const weightEnd = recentWeights[recentWeights.length - 1].weight_kg;
  const weightChange = weightEnd - weightStart;

  // Check if in calorie deficit
  const recentCalories = dailyNutrition.slice(-7);
  const avgCalories =
    recentCalories.reduce((sum, d) => sum + d.calories, 0) / recentCalories.length;
  const inDeficit = avgCalories < targetCalories * 0.95;

  // Plateau: no weight change (<0.1 kg) despite deficit for 7+ days
  if (inDeficit && Math.abs(weightChange) < 0.1) {
    return {
      detected: true,
      weight_start_kg: parseFloat(weightStart.toFixed(1)),
      weight_end_kg: parseFloat(weightEnd.toFixed(1)),
      weight_change_kg: parseFloat(weightChange.toFixed(2)),
      days_on_plateau: 7,
    };
  }

  return { detected: false, days_on_plateau: 0 };
}
