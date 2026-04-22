/**
 * Goal-specific meal planner prompts and phase configurations.
 *
 * Skeleton authored by FullStackDev (TES-69).
 * Full prompt content to be delivered by PromptEngineer (TES-84).
 *
 * PRIMARY_GOALS:
 *   weight_loss | muscle_gain | maintenance | disease_management | general_wellness
 */

import type { PhaseCalorieTarget } from "./phases";

// ── Phase calorie target overrides per goal ──────────────────────────────────
// Default targets in phases.ts assume weight_loss.
// Override here for other goals (all kcal values for ~75kg reference person).

export const PHASE_CALORIE_OVERRIDES: Record<string, Record<number, PhaseCalorieTarget>> = {
  weight_loss: {
    1: { training: 2200, rest: 2050 },
    2: { training: 2000, rest: 1800 },
    3: { training: 2200, rest: 2000 },
    4: { training: 2100, rest: 1950 },
  },
  muscle_gain: {
    // Slight caloric surplus throughout; performance phase maximises carbs
    1: { training: 2600, rest: 2350 },
    2: { training: 2700, rest: 2500 },
    3: { training: 2900, rest: 2600 },
    4: { training: 2600, rest: 2400 },
  },
  maintenance: {
    // TDEE ± 0 all phases; minor carb cycling on training days
    1: { training: 2300, rest: 2200 },
    2: { training: 2300, rest: 2200 },
    3: { training: 2300, rest: 2200 },
    4: { training: 2300, rest: 2200 },
  },
  disease_management: {
    // Conservative — emphasis on food quality over aggressive calorie targets
    // TODO (TES-84): Condition-specific overrides (diabetes, hypertension, IBS…)
    1: { training: 2100, rest: 2000 },
    2: { training: 2050, rest: 1950 },
    3: { training: 2100, rest: 2000 },
    4: { training: 2100, rest: 2000 },
  },
  general_wellness: {
    // Mild deficit phase 1–2, maintenance phase 3–4
    1: { training: 2200, rest: 2050 },
    2: { training: 2100, rest: 1950 },
    3: { training: 2300, rest: 2200 },
    4: { training: 2300, rest: 2200 },
  },
};

// ── Phase guidance messages (goal × phase) ───────────────────────────────────
// Short coaching text shown in the phase banner. 2–3 sentences max.
// TODO (TES-84): PromptEngineer to fill in all 20 messages (5 goals × 4 phases).

export const PHASE_GUIDANCE: Record<string, Record<number, string>> = {
  weight_loss: {
    1: "Фаза основы: формируем привычки и адаптируем пищеварение. Умеренный дефицит сохраняет мышцы. Фокус — белок и регулярность приёмов пищи.",
    2: "Фаза сушки: дефицит до 500 ккал/день защищает мышцы при снижении жира. Белок ≥ 1,6 г/кг — обязателен. Избегайте резких ограничений.",
    3: "Фаза прогресса: углеводная загрузка восстанавливает гликоген и повышает интенсивность тренировок. Дефицит остаётся умеренным.",
    4: "Фаза поддержания: устойчивый долгосрочный рацион без жёстких ограничений. Закрепите привычки, выработанные в предыдущих фазах.",
  },
  muscle_gain: {
    1: "Фаза основы: постепенно наращиваем калораж для создания анаболической среды. Белок — главный приоритет на каждом приёме пищи.",
    2: "Фаза набора: умеренный профицит 200–300 ккал/день стимулирует рост без лишнего жира. Углеводы закрывают гликогеновые окна после тренировок.",
    3: "Фаза прогресса: максимальный калораж и углеводы поддерживают тяжёлые тренировки. Партионные блюда экономят время на приготовление.",
    4: "Фаза поддержания: фиксируем набранную массу, постепенно снижаем профицит до нуля. Белок остаётся высоким.",
  },
  maintenance: {
    1: "Фаза основы: стабилизируем текущий вес без стресса. Приоритет — разнообразие и качество продуктов, а не подсчёт калорий.",
    2: "Фаза баланса: отрабатываем устойчивые привычки. Тренировочные и восстановительные дни различаются только по углеводам.",
    3: "Фаза прогресса: поддерживаем энергетический баланс при росте интенсивности тренировок. Углеводы приоритизируются в тренировочные дни.",
    4: "Фаза поддержания: долгосрочный устойчивый рацион. Гибкость в выборе продуктов при соблюдении общего баланса.",
  },
  disease_management: {
    1: "Фаза основы: мягкая адаптация рациона под состояние здоровья. Все изменения — постепенные. Проконсультируйтесь с врачом перед переходом к следующей фазе.",
    2: "Фаза коррекции: нутриентный профиль скорректирован с учётом вашего состояния. Мониторьте самочувствие и сообщайте врачу о значительных изменениях.",
    3: "Фаза укрепления: акцент на противовоспалительных продуктах и разнообразии микронутриентов. Энергетический баланс остаётся консервативным.",
    4: "Фаза поддержания: устойчивый рацион, адаптированный к долгосрочному управлению состоянием. Регулярный контроль с врачом.",
  },
  general_wellness: {
    1: "Фаза основы: закладываем основу сбалансированного питания. Умеренный дефицит помогает улучшить самочувствие без жёстких ограничений.",
    2: "Фаза оптимизации: нутриентная плотность рациона растёт. Разнообразие продуктов поддерживает здоровье микробиома и общий тонус.",
    3: "Фаза прогресса: углеводная загрузка в тренировочные дни даёт энергию для активности. Самочувствие — главный индикатор.",
    4: "Фаза поддержания: привычки закреплены. Поддерживайте разнообразие и прислушивайтесь к своему телу.",
  },
};

// ED-safe fallback: strips calorie references, focuses on nourishment
export const PHASE_GUIDANCE_ED_SAFE: Record<number, string> = {
  1: "Фаза основы: фокус на разнообразии и регулярности питания. Добавляем питательные продукты, а не убираем привычные.",
  2: "Фаза баланса: продолжаем кормить тело разнообразно. Прислушивайтесь к сигналам голода и насыщения.",
  3: "Фаза прогресса: дополнительная энергия в активные дни — это нормально и необходимо. Рацион поддерживает ваш ритм жизни.",
  4: "Фаза поддержания: устойчивые отношения с едой важнее любых цифр. Продолжайте питаться разнообразно и с удовольствием.",
};

// ── Goal-aware phase guidance helper ─────────────────────────────────────────

export function getPhaseGuidance(
  goal: string,
  phaseNumber: number,
  eatingDisorderFlag: boolean
): string {
  if (eatingDisorderFlag) {
    return PHASE_GUIDANCE_ED_SAFE[phaseNumber] ?? PHASE_GUIDANCE_ED_SAFE[1];
  }
  const goalGuidance = PHASE_GUIDANCE[goal] ?? PHASE_GUIDANCE.general_wellness;
  return goalGuidance[phaseNumber] ?? goalGuidance[1];
}

// ── Goal-aware calorie target helper ─────────────────────────────────────────

export function getPhaseCalorieTarget(
  goal: string,
  phaseNumber: number
): PhaseCalorieTarget {
  const overrides = PHASE_CALORIE_OVERRIDES[goal] ?? PHASE_CALORIE_OVERRIDES.general_wellness;
  return overrides[phaseNumber] ?? overrides[1];
}

// ── Meal plan prompt variants (goal-specific) ─────────────────────────────────
// TODO (TES-84): PromptEngineer fills full Russian prompts per goal.
// Stubs use {{…}} variables that getMealPlanPrompt() substitutes at runtime.

export const PROMPT_MEAL_PLAN_BY_GOAL: Record<string, string> = {
  weight_loss: `Ты — диетолог. Составь недельный план питания на 7 дней для снижения веса.
ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON — без пояснений, без markdown-блоков, только объект.

Цель: снижение веса. Дефицит калорий {{deficit_kcal}} ккал/день от TDEE {{user.tdee_kcal}}.
Фаза {{phase_number}} ({{phase_name}}): {{phase_guidance}}

Профиль:
- Диетические ограничения: {{user.dietary_restrictions}}
- Аллергены (жёсткое исключение): {{user.allergens}}
- Нежелательные ингредиенты: {{user.avoided_ingredients}}
- Медицинские условия: {{user.medical_conditions}}
- Белок: ≥ {{user.target_protein_g}}г/день (защита мышц при дефиците)
- Углеводы: {{user.target_carbs_g}}г | Жиры: {{user.target_fat_g}}г
- Дни зала: более высокие углеводы (+35–45г) и калории (+150–200 ккал)

Неделя: {{week_start}} — {{week_end}}

{{base_format}}`,

  muscle_gain: `Ты — диетолог. Составь недельный план питания на 7 дней для набора мышечной массы.
ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON — без пояснений, без markdown-блоков, только объект.

Цель: набор мышечной массы. Профицит {{surplus_kcal}} ккал/день над TDEE {{user.tdee_kcal}}.
Фаза {{phase_number}} ({{phase_name}}): {{phase_guidance}}

Профиль:
- Диетические ограничения: {{user.dietary_restrictions}}
- Аллергены (жёсткое исключение): {{user.allergens}}
- Нежелательные ингредиенты: {{user.avoided_ingredients}}
- Медицинские условия: {{user.medical_conditions}}
- Белок: ≥ {{user.target_protein_g}}г/день (≥ 1,6г/кг — приоритет)
- Углеводы: {{user.target_carbs_g}}г (приоритизировать вокруг тренировок)
- Жиры: {{user.target_fat_g}}г
- Pre-workout: 40–50г углеводов + 20–30г белка за 60–90 мин
- Post-workout: 40–50г углеводов + 30–40г белка в течение 60 мин
- Помечай подходящие блюда тегом "высокобелковое"

Неделя: {{week_start}} — {{week_end}}

{{base_format}}`,

  maintenance: `Ты — диетолог. Составь недельный план питания на 7 дней для поддержания веса.
ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON — без пояснений, без markdown-блоков, только объект.

Цель: поддержание текущего веса и улучшение качества питания. Калории ≈ TDEE {{user.tdee_kcal}}.
Фаза {{phase_number}} ({{phase_name}}): {{phase_guidance}}

Профиль:
- Диетические ограничения: {{user.dietary_restrictions}}
- Аллергены (жёсткое исключение): {{user.allergens}}
- Нежелательные ингредиенты: {{user.avoided_ingredients}}
- Медицинские условия: {{user.medical_conditions}}
- Белок: {{user.target_protein_g}}г | Углеводы: {{user.target_carbs_g}}г | Жиры: {{user.target_fat_g}}г
- Приоритет: разнообразие и нутриентная плотность, а не ограничение
- В дни зала: +150 ккал, акцент на углеводы

Неделя: {{week_start}} — {{week_end}}

{{base_format}}`,

  disease_management: `Ты — диетолог. Составь недельный план питания на 7 дней с учётом состояния здоровья.
ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON — без пояснений, без markdown-блоков, только объект.

Цель: управление здоровьем. Состояния: {{user.medical_conditions}}. Калории: {{user.tdee_kcal}}.
Фаза {{phase_number}} ({{phase_name}}): {{phase_guidance}}

Профиль:
- Диетические ограничения: {{user.dietary_restrictions}}
- Аллергены (жёсткое исключение): {{user.allergens}}
- Нежелательные ингредиенты: {{user.avoided_ingredients}}
- Белок: {{user.target_protein_g}}г | Углеводы: {{user.target_carbs_g}}г | Жиры: {{user.target_fat_g}}г

Особые требования по условиям:
- diabetes_t2: низкогликемические углеводы (ГИ < 55), клетчатка ≥ 25г/день, равномерное распределение углеводов
- hypertension: натрий < 1500мг/день, DASH-совместимые продукты (больше калия, магния)
- ibs: исключить продукты FODMAP высокого уровня, мягкая обработка
- pcos: акцент на цельные злаки, бобовые, противовоспалительные жиры
- hypothyroidism: йод и селен из натуральных источников, избегать сырых крестоцветных в больших количествах

Неделя: {{week_start}} — {{week_end}}

Предупреждение: этот план не заменяет назначения врача. Изменения в питании должны обсуждаться с лечащим специалистом.

{{base_format}}`,

  general_wellness: `Ты — диетолог. Составь недельный план питания на 7 дней для общего здоровья и хорошего самочувствия.
ВЕРНИ ТОЛЬКО ВАЛИДНЫЙ JSON — без пояснений, без markdown-блоков, только объект.

Цель: улучшение общего самочувствия, энергии и качества жизни. Калории: {{user.tdee_kcal}}.
Фаза {{phase_number}} ({{phase_name}}): {{phase_guidance}}

Профиль:
- Диетические ограничения: {{user.dietary_restrictions}}
- Аллергены (жёсткое исключение): {{user.allergens}}
- Нежелательные ингредиенты: {{user.avoided_ingredients}}
- Медицинские условия: {{user.medical_conditions}}
- Белок: {{user.target_protein_g}}г | Углеводы: {{user.target_carbs_g}}г | Жиры: {{user.target_fat_g}}г
- Приоритет: разнообразие, антиоксиданты, ферментированные продукты, здоровье микробиома
- В дни зала: +150 ккал на углеводах

Неделя: {{week_start}} — {{week_end}}

{{base_format}}`,
};

// Shared JSON format block appended to every goal prompt
export const PROMPT_BASE_FORMAT = `Формат (строго соблюдай, дни в хронологическом порядке):
Объект с ключом "days" — массив из 7 объектов. Каждый объект дня: "date" (YYYY-MM-DD), "breakfast", "lunch", "dinner", "snacks". Каждый приём пищи: "title" (строка), "prep_min" (целое), "kcal" (целое), "p" (число), "c" (число), "f" (число), "ingredients" (массив строк), "steps" (массив строк), "tags" (массив строк), "substitutions" (массив объектов с "original", "substitute", "reason").

Правила:
- Строго исключи аллергены
- Соблюдай диетические ограничения
- Разнообразные блюда (не повторять одинаковые в один день)
- ingredients: максимум 5 позиций на блюдо
- steps: максимум 4 шага
- tags: [] или из набора: ["вегетарианское","веганское","без глютена","без лактозы","высокобелковое","низкоуглеводное","низкогликемическое","противовоспалительное"]
- substitutions: 1 альтернатива для основного ингредиента (можно [])
- Сумма КБЖУ за день ≈ целевым калориям
- Реалистичное время приготовления`;

// ── getMealPlanPrompt ─────────────────────────────────────────────────────────

export interface MealPlanPromptParams {
  primaryGoal: string;
  tdeeKcal: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  dietaryRestrictions: string[];
  allergens: string[];
  avoidedIngredients: string[];
  medicalConditions: string[];
  eatingDisorderFlag: boolean;
  weekStart: string;
  weekEnd: string;
  phaseNumber: number;
  phaseName: string;
}

/**
 * Selects the correct goal-specific prompt and fills all placeholders.
 * When eatingDisorderFlag = true, all calorie/deficit mentions are removed.
 */
export function getMealPlanPrompt(params: MealPlanPromptParams): string {
  const goal = PHASE_CALORIE_OVERRIDES[params.primaryGoal]
    ? params.primaryGoal
    : "general_wellness";

  const basePrompt = PROMPT_MEAL_PLAN_BY_GOAL[goal] ?? PROMPT_MEAL_PLAN_BY_GOAL.general_wellness;
  const phaseGuidance = getPhaseGuidance(goal, params.phaseNumber, params.eatingDisorderFlag);
  const calorieTarget = getPhaseCalorieTarget(goal, params.phaseNumber);

  const deficitKcal = goal === "weight_loss"
    ? Math.max(0, params.tdeeKcal - calorieTarget.rest)
    : 0;
  const surplusKcal = goal === "muscle_gain"
    ? Math.max(0, calorieTarget.training - params.tdeeKcal)
    : 0;

  let prompt = basePrompt
    .replace("{{user.primary_goal}}", goal)
    .replace("{{user.tdee_kcal}}", String(params.tdeeKcal))
    .replace("{{user.target_protein_g}}", String(params.targetProteinG))
    .replace("{{user.target_carbs_g}}", String(params.targetCarbsG))
    .replace("{{user.target_fat_g}}", String(params.targetFatG))
    .replace("{{user.dietary_restrictions}}", params.dietaryRestrictions.join(", ") || "нет")
    .replace("{{user.allergens}}", params.allergens.join(", ") || "нет")
    .replace("{{user.avoided_ingredients}}", params.avoidedIngredients.join(", ") || "нет")
    .replace("{{user.medical_conditions}}", params.medicalConditions.join(", ") || "нет")
    .replace("{{phase_number}}", String(params.phaseNumber))
    .replace("{{phase_name}}", params.phaseName)
    .replace("{{phase_guidance}}", phaseGuidance)
    .replace("{{deficit_kcal}}", String(deficitKcal))
    .replace("{{surplus_kcal}}", String(surplusKcal))
    .replace("{{week_start}}", params.weekStart)
    .replace("{{week_end}}", params.weekEnd)
    .replace("{{base_format}}", PROMPT_BASE_FORMAT);

  // ED-safe: strip any remaining calorie numbers from prompt
  if (params.eatingDisorderFlag) {
    prompt = prompt
      .replace(/\d{3,4}\s*ккал/g, "достаточно калорий")
      .replace(/дефицит[^.]*ккал[^.]*\./gi, "умеренное питание.")
      .replace(/профицит[^.]*ккал[^.]*\./gi, "питательный рацион.")
      .replace(/TDEE\s*\d{3,4}/g, "TDEE пользователя");
  }

  return prompt;
}
