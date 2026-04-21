/**
 * GigaChat API client for NutriPlan.
 * GigaChat API is compatible with the OpenAI chat completions format.
 *
 * Required env vars:
 *   GIGACHAT_AUTH_KEY  — base64-encoded "clientId:clientSecret" for OAuth auto-refresh (preferred)
 *   GIGACHAT_TOKEN     — static Bearer token (fallback, expires in ~30 min)
 */

import { randomUUID } from "crypto";
import sharp from "sharp";
import {
  SYSTEM_PROMPT_RU,
  PROMPT_ONBOARDING_RU,
  PROMPT_DAILY_ANALYSIS_RU,
  PROMPT_SAFETY_ALERT_RU,
  PROMPT_WEIGHT_LOSS_RU,
  PROMPT_MUSCLE_GAIN_RU,
  PROMPT_DISEASE_MGMT_RU,
  PROMPT_TREND_WARNING_RU,
  PROMPT_OPTIMISATION_TIP_RU,
  PROMPT_MEAL_SUBSTITUTION_RU,
  PROMPT_FREE_QUESTION_RU,
  PROMPT_MEAL_PLAN_RU,
  PROMPT_SWAP_SLOT_RU,
  PROMPT_RECIPE_DETAIL_RU,
  PROMPT_FOOD_PHOTO_RU,
  PROMPT_FOOD_SUGGESTION_RU,
  MAX_TOKENS,
  TONE_INSTRUCTIONS,
} from "./prompts";

const GIGACHAT_API_URL =
  "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";
const GIGACHAT_FILES_URL =
  "https://gigachat.devices.sberbank.ru/api/v1/files";
const GIGACHAT_OAUTH_URL =
  "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

// ─── Token cache ──────────────────────────────────────────────────────────────

let _tokenCache: { value: string; expiresAt: number } | null = null;

/**
 * Returns a valid GigaChat Bearer token, refreshing via OAuth if needed.
 * Caches the token in memory until 60 s before expiry.
 */
async function getToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - 60_000) {
    return _tokenCache.value;
  }

  const authKey = process.env.GIGACHAT_AUTH_KEY;
  if (authKey) {
    const res = await fetch(GIGACHAT_OAUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        RqUID: randomUUID(),
      },
      body: "scope=GIGACHAT_API_PERS",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GigaChat OAuth error ${res.status}: ${body}`);
    }
    const data = await res.json();
    // expires_at is a Unix ms timestamp from GigaChat
    _tokenCache = { value: data.access_token as string, expiresAt: data.expires_at as number };
    return _tokenCache.value;
  }

  // Fallback: static token set externally
  const token = process.env.GIGACHAT_TOKEN;
  if (!token) throw new Error("Set GIGACHAT_AUTH_KEY or GIGACHAT_TOKEN env var");
  return token;
}

// ─── Image upload ─────────────────────────────────────────────────────────────

/**
 * Resize image to max 1024 px on either dimension, convert to JPEG,
 * upload to GigaChat files API, and return the file id.
 */
async function uploadImageFile(imageBuffer: Buffer, token: string): Promise<string> {
  // Resize to ≤ 1024 px (GigaChat vision limit)
  const resized = await sharp(imageBuffer)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const form = new FormData();
  form.append("file", new Blob([resized.buffer as ArrayBuffer], { type: "image/jpeg" }), "photo.jpg");
  form.append("purpose", "general");

  const res = await fetch(GIGACHAT_FILES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GigaChat file upload error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.id as string;
}

export type ToneMode = "краткий" | "подробный";

export interface UserProfile {
  age?: number;
  sex?: string;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: string;
  primary_goal?: string;
  secondary_goals?: string[];
  dietary_restrictions?: string[];
  allergens?: string[];
  medical_conditions?: string[];
  eating_disorder_flag?: boolean;
  tone_mode?: ToneMode;
  tdee_kcal?: number;
  target_protein_g?: number;
  target_carbs_g?: number;
  target_fat_g?: number;
  target_rate_kg_per_week?: number;
  weeks_on_plan?: number;
  protein_cap_g?: number;
  kidney_disease?: boolean;
  water_target_ml?: number;
}

/** Replace {{key}} placeholders in a template string with values from a flat record. */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return trimmed in vars ? vars[trimmed] : `{{${trimmed}}}`;
  });
}

/** Flatten a nested object into dot-notation keys, converting arrays to comma-separated strings. */
function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) {
      result[full] = "—";
    } else if (Array.isArray(v)) {
      result[full] = v.length > 0 ? v.join(", ") : "—";
    } else if (typeof v === "object") {
      Object.assign(result, flatten(v as Record<string, unknown>, full));
    } else {
      result[full] = String(v);
    }
  }
  return result;
}

/** Build the flat variable map for template substitution. */
function buildVars(
  user: UserProfile,
  analysis: Record<string, unknown> = {},
  extra: Record<string, string> = {}
): Record<string, string> {
  const toneMode = user.tone_mode ?? "краткий";
  return {
    ...flatten({ user, analysis }),
    tone_instruction: TONE_INSTRUCTIONS[toneMode] ?? TONE_INSTRUCTIONS["краткий"],
    ...extra,
  };
}

async function callGigaChat(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const token = await getToken();

  const res = await fetch(GIGACHAT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "GigaChat-Pro",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GigaChat API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}

function resolveMaxTokens(promptId: string, toneMode: ToneMode): number {
  return MAX_TOKENS[promptId]?.[toneMode] ?? 400;
}

// ─── Public helpers ──────────────────────────────────────────────────────────

export async function getOnboardingInsight(
  user: UserProfile
): Promise<string> {
  const vars = buildVars(user);
  const system = interpolate(SYSTEM_PROMPT_RU, vars);
  const userMsg = interpolate(PROMPT_ONBOARDING_RU, vars);
  return callGigaChat(system, userMsg, resolveMaxTokens("onboarding", user.tone_mode ?? "краткий"));
}

export async function getDailyAnalysis(
  user: UserProfile,
  analysis: {
    total_kcal: number;
    pct_tdee: number;
    total_protein_g: number;
    total_carbs_g: number;
    total_fat_g: number;
    meals_today: Array<{ time: string; name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }>;
  }
): Promise<string> {
  const mealsList =
    analysis.meals_today.length > 0
      ? analysis.meals_today
          .map(
            (m) =>
              `- ${m.time} | ${m.name}: ${m.calories} ккал, белок ${m.protein_g}г, углеводы ${m.carbs_g}г, жиры ${m.fat_g}г`
          )
          .join("\n")
      : "— (записи отсутствуют)";

  const vars = buildVars(user, analysis as unknown as Record<string, unknown>, { meals_list: mealsList });
  const system = interpolate(SYSTEM_PROMPT_RU, vars);
  const userMsg = interpolate(PROMPT_DAILY_ANALYSIS_RU, vars);
  return callGigaChat(system, userMsg, resolveMaxTokens("daily_analysis", user.tone_mode ?? "краткий"));
}

export async function getSafetyAlert(
  user: UserProfile,
  analysis: {
    window_days: number;
    critical_deficiencies: Array<{
      nutrient_name_ru: string;
      actual_avg: number;
      unit: string;
      clinical_min: number;
      pct_of_minimum: number;
      days_below: number;
      window_days: number;
    }>;
  }
): Promise<string> {
  const defList = analysis.critical_deficiencies
    .map(
      (d) =>
        `- ${d.nutrient_name_ru}: фактически ${d.actual_avg} ${d.unit}/день (норма ${d.clinical_min} ${d.unit}, ${d.pct_of_minimum}% от нормы, ${d.days_below} дн.)`
    )
    .join("\n");

  const vars = buildVars(user, analysis as unknown as Record<string, unknown>, { deficiencies_list: defList });
  const system = interpolate(SYSTEM_PROMPT_RU, vars);
  const userMsg = interpolate(PROMPT_SAFETY_ALERT_RU, vars);
  return callGigaChat(system, userMsg, resolveMaxTokens("safety_alert", user.tone_mode ?? "краткий"));
}

export async function getGoalInsight(
  user: UserProfile,
  analysis: Record<string, unknown>
): Promise<string> {
  const goal = user.primary_goal;
  let template: string;
  let promptId: string;

  if (goal === "weight_loss") {
    template = PROMPT_WEIGHT_LOSS_RU;
    promptId = "weight_loss";
  } else if (goal === "muscle_gain") {
    template = PROMPT_MUSCLE_GAIN_RU;
    promptId = "muscle_gain";
  } else if (goal === "disease_management") {
    template = PROMPT_DISEASE_MGMT_RU;
    promptId = "disease_mgmt";
  } else {
    // Fall back to daily analysis for other goals
    return getDailyAnalysis(user, analysis as Parameters<typeof getDailyAnalysis>[1]);
  }

  const extra: Record<string, string> = {};
  if (goal === "weight_loss" && analysis.plateau_detected) {
    extra.plateau_instruction =
      "Пользователь в плато. Предложи одну научно обоснованную стратегию выхода из плато, соответствующую его уровню активности. Не рекомендуй экстремальное ограничение калорий.";
  } else {
    extra.plateau_instruction = "";
  }
  if (goal === "muscle_gain" && user.kidney_disease) {
    extra.kidney_instruction = `ВАЖНО: У пользователя заболевание почек. Максимум белка: ${user.protein_cap_g} г/день. Не рекомендуй превышать этот уровень.`;
  } else {
    extra.kidney_instruction = "";
  }

  const vars = buildVars(user, analysis, extra);
  const system = interpolate(SYSTEM_PROMPT_RU, vars);
  const userMsg = interpolate(template, vars);
  return callGigaChat(system, userMsg, resolveMaxTokens(promptId, user.tone_mode ?? "краткий"));
}

export async function getTrendWarning(
  user: UserProfile,
  analysis: {
    trend_metric_name_ru: string;
    trend_category_ru: string;
    trend_direction_ru: string;
    trend_magnitude_pct: number;
    contributing_factors_ru: string;
  }
): Promise<string> {
  const vars = buildVars(user, analysis as unknown as Record<string, unknown>);
  const system = interpolate(SYSTEM_PROMPT_RU, vars);
  const userMsg = interpolate(PROMPT_TREND_WARNING_RU, vars);
  return callGigaChat(system, userMsg, resolveMaxTokens("trend_warning", user.tone_mode ?? "краткий"));
}

export async function getOptimisationTip(
  user: UserProfile,
  tipSubtypeRu: string,
  tipData: string
): Promise<string> {
  const vars = buildVars(user, {}, { tip_subtype_ru: tipSubtypeRu, tip_data: tipData });
  const system = interpolate(SYSTEM_PROMPT_RU, vars);
  const userMsg = interpolate(PROMPT_OPTIMISATION_TIP_RU, vars);
  return callGigaChat(system, userMsg, resolveMaxTokens("optimisation_tip", user.tone_mode ?? "краткий"));
}

export async function getMealSubstitution(
  user: UserProfile,
  analysis: {
    target_nutrient_ru: string;
    current_avg: number;
    unit: string;
    target_amt: number;
    gap_amt: number;
    user_food_history_json: string;
  }
): Promise<string> {
  const vars = buildVars(user, analysis as unknown as Record<string, unknown>);
  const system = interpolate(SYSTEM_PROMPT_RU, vars);
  const userMsg = interpolate(PROMPT_MEAL_SUBSTITUTION_RU, vars);
  return callGigaChat(system, userMsg, resolveMaxTokens("meal_substitution", user.tone_mode ?? "краткий"));
}

export async function getFreeAnswer(
  user: UserProfile,
  userMessage: string
): Promise<string> {
  const vars = buildVars(user, {}, { user_message: userMessage });
  const system = interpolate(SYSTEM_PROMPT_RU, vars);
  const userMsg = interpolate(PROMPT_FREE_QUESTION_RU, vars);
  return callGigaChat(system, userMsg, resolveMaxTokens("free_question", user.tone_mode ?? "краткий"));
}

// ── Meal planner helpers ──────────────────────────────────────────────────────

export interface MealRecipeRaw {
  title: string;
  prep_min: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
  ingredients: string[];
  steps: string[];
  tags: string[];
  substitutions: Array<{ original: string; substitute: string; reason: string }>;
}

export interface DayPlanRaw {
  date: string;
  breakfast: MealRecipeRaw;
  lunch: MealRecipeRaw;
  dinner: MealRecipeRaw;
  snacks: MealRecipeRaw;
}

export interface WeekPlanRaw {
  days: DayPlanRaw[];
}

/**
 * Attempt to extract JSON from a GigaChat response.
 * Strips markdown code fences (```json ... ```) before searching for {…}.
 */
function extractJson(raw: string): string {
  // Strip markdown code fences
  const fenceStripped = raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();
  const source = fenceStripped.length > 0 ? fenceStripped : raw;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return source.slice(start, end + 1);
}

/**
 * GigaChat sometimes returns numeric fields as strings with units ("250 г", "1.5 г").
 * Recursively walk the parsed object and coerce those to numbers.
 * Also joins any ingredient arrays that arrive as Array instead of string.
 */
function sanitizeNumbers(obj: unknown, numericKeys: Set<string>): unknown {
  if (Array.isArray(obj)) return obj.map((v) => sanitizeNumbers(v, numericKeys));
  if (obj !== null && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (numericKeys.has(k) && (typeof v === "string")) {
        const n = parseFloat((v as string).replace(/[^0-9.]/g, ""));
        out[k] = isNaN(n) ? 0 : n;
      } else if (k === "ingredients" && Array.isArray(v)) {
        // ingredients: string[] — join sub-arrays or leave as-is
        out[k] = (v as unknown[]).map((item) =>
          Array.isArray(item) ? (item as string[]).join(", ") : item
        );
      } else {
        out[k] = sanitizeNumbers(v, numericKeys);
      }
    }
    return out;
  }
  return obj;
}

const FOOD_PHOTO_NUMERIC_KEYS = new Set(["calories", "protein_g", "carbs_g", "fat_g"]);
const MEAL_NUMERIC_KEYS = new Set(["prep_min", "kcal", "p", "c", "f"]);

export async function generateWeeklyMealPlan(
  user: UserProfile & { avoided_ingredients?: string[] },
  weekStart: string, // "YYYY-MM-DD" Monday
  weekEnd: string    // "YYYY-MM-DD" Sunday
): Promise<WeekPlanRaw> {
  const extra: Record<string, string> = {
    week_start: weekStart,
    week_end: weekEnd,
  };
  const vars = buildVars(user as unknown as UserProfile, {}, extra);
  const system = "Ты профессиональный диетолог, отвечаешь только валидным JSON.";
  const userMsg = interpolate(PROMPT_MEAL_PLAN_RU, vars);
  const raw = await callGigaChat(system, userMsg, MAX_TOKENS.meal_plan.краткий);
  const json = extractJson(raw);
  const parsed = JSON.parse(json);
  return sanitizeNumbers(parsed, MEAL_NUMERIC_KEYS) as WeekPlanRaw;
}

export async function swapMealSlot(
  user: UserProfile,
  mealType: string,
  mealTypeRu: string,
  existingMealTitles: string[],
  targetKcal: number,
  targetP: number,
  targetC: number,
  targetF: number
): Promise<MealRecipeRaw> {
  const extra: Record<string, string> = {
    meal_type: mealType,
    meal_type_ru: mealTypeRu,
    existing_meals: existingMealTitles.length > 0 ? existingMealTitles.join(", ") : "—",
    target_kcal: String(targetKcal),
    target_p: String(targetP),
    target_c: String(targetC),
    target_f: String(targetF),
  };
  const vars = buildVars(user, {}, extra);
  const system = "Ты профессиональный диетолог, отвечаешь только валидным JSON.";
  const userMsg = interpolate(PROMPT_SWAP_SLOT_RU, vars);
  const raw = await callGigaChat(system, userMsg, MAX_TOKENS.swap_slot.краткий);
  const json = extractJson(raw);
  const parsed = JSON.parse(json);
  return sanitizeNumbers(parsed, MEAL_NUMERIC_KEYS) as MealRecipeRaw;
}

// ── Photo food recognition ────────────────────────────────────────────────────

export interface FoodPhotoItem {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portion: string;
}

export interface FoodPhotoResult {
  items: FoodPhotoItem[];
  error?: string;
}

/**
 * Analyse a food photo using GigaChat-Max vision.
 * Resizes the image to ≤1024 px, uploads it via the files API,
 * then sends a chat completion using attachments[] (GigaChat format).
 */
export async function getFoodPhotoAnalysis(
  imageBuffer: Buffer,
  // mimeType kept for API compatibility but image is always converted to JPEG internally
  _mimeType = "image/jpeg"
): Promise<FoodPhotoResult> {
  const token = await getToken();
  const fileId = await uploadImageFile(imageBuffer, token);

  const res = await fetch(GIGACHAT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "GigaChat-2-Max",
      max_tokens: MAX_TOKENS.food_photo.краткий,
      messages: [
        {
          role: "user",
          content: PROMPT_FOOD_PHOTO_RU,
          attachments: [fileId],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GigaChat vision error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content as string;
  const json = extractJson(raw);
  const parsed = JSON.parse(json);
  return sanitizeNumbers(parsed, FOOD_PHOTO_NUMERIC_KEYS) as FoodPhotoResult;
}

// ── Post-log AI suggestion ────────────────────────────────────────────────────

/**
 * Returns a short nudge after the user logs food, or empty string if no nudge needed.
 */
export async function getFoodSuggestion(
  user: UserProfile,
  dayTotals: {
    current_kcal: number;
    target_kcal: number;
    current_protein_g: number;
    target_protein_g: number;
    current_carbs_g: number;
    target_carbs_g: number;
    current_fat_g: number;
    target_fat_g: number;
  }
): Promise<string> {
  const pct = (cur: number, tgt: number) =>
    tgt > 0 ? Math.round((cur / tgt) * 100) : 0;

  const extra: Record<string, string> = {
    current_kcal: String(dayTotals.current_kcal),
    target_kcal: String(dayTotals.target_kcal),
    pct_kcal: String(pct(dayTotals.current_kcal, dayTotals.target_kcal)),
    current_protein_g: String(dayTotals.current_protein_g),
    target_protein_g: String(dayTotals.target_protein_g),
    pct_protein: String(pct(dayTotals.current_protein_g, dayTotals.target_protein_g)),
    current_carbs_g: String(dayTotals.current_carbs_g),
    target_carbs_g: String(dayTotals.target_carbs_g),
    current_fat_g: String(dayTotals.current_fat_g),
    target_fat_g: String(dayTotals.target_fat_g),
  };

  const vars = buildVars(user, {}, extra);
  const system = interpolate(SYSTEM_PROMPT_RU, vars);
  const userMsg = interpolate(PROMPT_FOOD_SUGGESTION_RU, vars);
  const result = await callGigaChat(
    system,
    userMsg,
    resolveMaxTokens("food_suggestion", user.tone_mode ?? "краткий")
  );
  return result.trim();
}

export async function getRecipeDetail(
  user: UserProfile,
  recipeTitle: string,
  ingredientsList: string
): Promise<{ detailed_steps: string[]; tips: string[]; substitutions: Array<{ original: string; substitute: string; reason: string }> }> {
  const extra: Record<string, string> = {
    recipe_title: recipeTitle,
    ingredients_list: ingredientsList,
  };
  const vars = buildVars(user, {}, extra);
  const system = "Ты профессиональный шеф-повар и диетолог, отвечаешь только валидным JSON.";
  const userMsg = interpolate(PROMPT_RECIPE_DETAIL_RU, vars);
  const raw = await callGigaChat(system, userMsg, MAX_TOKENS.recipe_detail.краткий);
  const json = extractJson(raw);
  return JSON.parse(json);
}
