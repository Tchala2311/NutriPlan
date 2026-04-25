"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, ChevronRight, Sparkles } from "lucide-react";

// ── Types ────────────────────────────────────────────────
type Step = "q1" | "q2" | "loading" | "result";

interface GoalOption {
  id: string;
  emoji: string;
  label: string;
}

interface RestrictionOption {
  id: string;
  emoji: string;
  label: string;
}

// ── Sample plan data ──────────────────────────────────────
type DayPlan = {
  day: string;
  calories: number;
  protein: number;
  meals: { name: string; cal: number }[];
};

const PLANS: Record<string, Record<string, DayPlan[]>> = {
  lose: {
    none: [
      { day: "Пн", calories: 1480, protein: 110, meals: [{ name: "Овсянка с ягодами", cal: 310 }, { name: "Куриная грудка с гречкой", cal: 420 }, { name: "Творог с мёдом", cal: 180 }, { name: "Рыба с овощами", cal: 570 }] },
      { day: "Вт", calories: 1520, protein: 108, meals: [{ name: "Яичница с тостом", cal: 340 }, { name: "Суп с курицей", cal: 380 }, { name: "Яблоко", cal: 80 }, { name: "Говядина с салатом", cal: 720 }] },
      { day: "Ср", calories: 1460, protein: 112, meals: [{ name: "Гречка с кефиром", cal: 290 }, { name: "Тунец с овощами", cal: 390 }, { name: "Орехи", cal: 160 }, { name: "Куриный стейк", cal: 620 }] },
    ],
    vegetarian: [
      { day: "Пн", calories: 1440, protein: 82, meals: [{ name: "Гранола с соевым молоком", cal: 320 }, { name: "Чечевичный суп", cal: 380 }, { name: "Хумус с овощами", cal: 160 }, { name: "Тофу с рисом", cal: 580 }] },
      { day: "Вт", calories: 1490, protein: 79, meals: [{ name: "Тосты с авокадо", cal: 360 }, { name: "Нут с овощами", cal: 420 }, { name: "Фрукты", cal: 110 }, { name: "Овощное рагу с киноа", cal: 600 }] },
      { day: "Ср", calories: 1420, protein: 85, meals: [{ name: "Омлет из яиц", cal: 310 }, { name: "Фасолевый борщ", cal: 370 }, { name: "Творог", cal: 130 }, { name: "Паста из цельнозерновой муки", cal: 610 }] },
    ],
    gluten: [
      { day: "Пн", calories: 1460, protein: 105, meals: [{ name: "Гречка с яйцом", cal: 330 }, { name: "Куриный суп с рисом", cal: 390 }, { name: "Банан", cal: 90 }, { name: "Лосось с картофелем", cal: 650 }] },
      { day: "Вт", calories: 1500, protein: 108, meals: [{ name: "Рисовая каша с молоком", cal: 280 }, { name: "Индейка с гречкой", cal: 450 }, { name: "Орехи и сыр", cal: 180 }, { name: "Говядина с овощами", cal: 590 }] },
      { day: "Ср", calories: 1430, protein: 110, meals: [{ name: "Омлет с зеленью", cal: 290 }, { name: "Рыбные котлеты с рисом", cal: 420 }, { name: "Яблоко", cal: 80 }, { name: "Куриный стейк с салатом", cal: 640 }] },
    ],
    lactose: [
      { day: "Пн", calories: 1470, protein: 108, meals: [{ name: "Овсянка на воде с орехами", cal: 340 }, { name: "Куриный суп", cal: 380 }, { name: "Мандарин", cal: 80 }, { name: "Говядина с гречкой", cal: 670 }] },
      { day: "Вт", calories: 1510, protein: 112, meals: [{ name: "Яичница на кокосовом масле", cal: 310 }, { name: "Тунец с овощами", cal: 400 }, { name: "Миндаль", cal: 160 }, { name: "Индейка с рисом", cal: 640 }] },
      { day: "Ср", calories: 1450, protein: 106, meals: [{ name: "Гречка с яйцом", cal: 330 }, { name: "Куриная грудка с картофелем", cal: 430 }, { name: "Груша", cal: 90 }, { name: "Лосось с спаржей", cal: 600 }] },
    ],
  },
  gain: {
    none: [
      { day: "Пн", calories: 2840, protein: 185, meals: [{ name: "Омлет 4 яйца + овсянка", cal: 620 }, { name: "Говядина с рисом", cal: 780 }, { name: "Протеиновый коктейль", cal: 280 }, { name: "Лосось с гречкой", cal: 760 }, { name: "Творог с орехами", cal: 400 }] },
      { day: "Вт", calories: 2920, protein: 192, meals: [{ name: "Яйца + гречка", cal: 580 }, { name: "Куриная грудка + рис", cal: 820 }, { name: "Греческий йогурт", cal: 240 }, { name: "Говяжий стейк + картофель", cal: 880 }, { name: "Казеин", cal: 400 }] },
      { day: "Ср", calories: 2780, protein: 180, meals: [{ name: "Овсянка + яйца", cal: 540 }, { name: "Индейка + гречка", cal: 760 }, { name: "Банан + орехи", cal: 320 }, { name: "Рыба + рис", cal: 740 }, { name: "Творог", cal: 420 }] },
    ],
    lactose: [
      { day: "Пн", calories: 2820, protein: 182, meals: [{ name: "Омлет 4 яйца + гречка", cal: 600 }, { name: "Говядина с рисом", cal: 800 }, { name: "Банан + миндаль", cal: 280 }, { name: "Лосось с гречкой", cal: 760 }, { name: "Яйца с авокадо", cal: 380 }] },
      { day: "Вт", calories: 2900, protein: 188, meals: [{ name: "Яйца + овсянка на воде", cal: 560 }, { name: "Куриная грудка + рис", cal: 840 }, { name: "Орехи + сухофрукты", cal: 280 }, { name: "Говяжий стейк + картофель", cal: 860 }, { name: "Тунец с огурцом", cal: 360 }] },
      { day: "Ср", calories: 2760, protein: 178, meals: [{ name: "Овсянка на воде + яйца", cal: 520 }, { name: "Индейка + гречка", cal: 780 }, { name: "Банан + грецкие орехи", cal: 300 }, { name: "Рыба + рис", cal: 760 }, { name: "Куриное бедро запечённое", cal: 400 }] },
    ],
    none_default: [
      { day: "Пн", calories: 2840, protein: 185, meals: [{ name: "Омлет 4 яйца + овсянка", cal: 620 }, { name: "Говядина с рисом", cal: 780 }, { name: "Протеиновый коктейль", cal: 280 }, { name: "Лосось с гречкой", cal: 760 }, { name: "Творог с орехами", cal: 400 }] },
      { day: "Вт", calories: 2920, protein: 192, meals: [{ name: "Яйца + гречка", cal: 580 }, { name: "Куриная грудка + рис", cal: 820 }, { name: "Греческий йогурт", cal: 240 }, { name: "Говяжий стейк + картофель", cal: 880 }, { name: "Казеин", cal: 400 }] },
      { day: "Ср", calories: 2780, protein: 180, meals: [{ name: "Овсянка + яйца", cal: 540 }, { name: "Индейка + гречка", cal: 760 }, { name: "Банан + орехи", cal: 320 }, { name: "Рыба + рис", cal: 740 }, { name: "Творог", cal: 420 }] },
    ],
  },
  healthy: {
    none: [
      { day: "Пн", calories: 1820, protein: 95, meals: [{ name: "Гранола с молоком и фруктами", cal: 410 }, { name: "Греческий суп с овощами", cal: 380 }, { name: "Орехи и изюм", cal: 180 }, { name: "Запечённая рыба с овощами", cal: 520 }, { name: "Кефир", cal: 130 }] },
      { day: "Вт", calories: 1790, protein: 92, meals: [{ name: "Тосты с авокадо и яйцом", cal: 440 }, { name: "Куриный салат", cal: 360 }, { name: "Яблоко", cal: 80 }, { name: "Лосось с картофелем", cal: 680 }, { name: "Йогурт", cal: 130 }] },
      { day: "Ср", calories: 1850, protein: 98, meals: [{ name: "Овсянка с бананом", cal: 380 }, { name: "Суп с индейкой", cal: 390 }, { name: "Фрукты", cal: 120 }, { name: "Говядина с гречкой", cal: 720 }, { name: "Творог", cal: 140 }] },
    ],
    lactose: [
      { day: "Пн", calories: 1800, protein: 94, meals: [{ name: "Овсянка на воде с ягодами и орехами", cal: 390 }, { name: "Куриный суп с овощами", cal: 380 }, { name: "Орехи и изюм", cal: 180 }, { name: "Запечённая рыба с овощами", cal: 520 }, { name: "Банан", cal: 90 }] },
      { day: "Вт", calories: 1780, protein: 91, meals: [{ name: "Тосты с авокадо и яйцом", cal: 440 }, { name: "Куриный салат с оливковым маслом", cal: 360 }, { name: "Яблоко", cal: 80 }, { name: "Лосось с картофелем", cal: 680 }, { name: "Горсть миндаля", cal: 160 }] },
      { day: "Ср", calories: 1840, protein: 97, meals: [{ name: "Гречка с яйцом и зеленью", cal: 360 }, { name: "Суп с индейкой", cal: 390 }, { name: "Фрукты", cal: 120 }, { name: "Говядина с гречкой", cal: 720 }, { name: "Грецкие орехи", cal: 130 }] },
    ],
  },
  maintain: {
    none: [
      { day: "Пн", calories: 2100, protein: 120, meals: [{ name: "Яичница с тостами", cal: 420 }, { name: "Паста с курицей", cal: 580 }, { name: "Греческий йогурт с орехами", cal: 220 }, { name: "Лосось с овощами", cal: 620 }, { name: "Кефир", cal: 130 }] },
      { day: "Вт", calories: 2080, protein: 118, meals: [{ name: "Овсянка с фруктами", cal: 390 }, { name: "Куриный бульон с рисом", cal: 520 }, { name: "Банан", cal: 90 }, { name: "Говядина с гречкой", cal: 760 }, { name: "Творог с мёдом", cal: 160 }] },
      { day: "Ср", calories: 2130, protein: 122, meals: [{ name: "Гречка с яйцом", cal: 410 }, { name: "Тунец с овощами и рисом", cal: 540 }, { name: "Орехи", cal: 180 }, { name: "Индейка с картофелем", cal: 720 }, { name: "Йогурт", cal: 130 }] },
    ],
    lactose: [
      { day: "Пн", calories: 2090, protein: 118, meals: [{ name: "Яичница с тостами на растительном масле", cal: 410 }, { name: "Паста с курицей и овощами", cal: 580 }, { name: "Орехи с сухофруктами", cal: 220 }, { name: "Лосось с овощами", cal: 620 }, { name: "Банан", cal: 90 }] },
      { day: "Вт", calories: 2060, protein: 116, meals: [{ name: "Овсянка на воде с фруктами", cal: 360 }, { name: "Куриный бульон с рисом", cal: 520 }, { name: "Банан + миндаль", cal: 200 }, { name: "Говядина с гречкой", cal: 760 }, { name: "Яблоко", cal: 80 }] },
      { day: "Ср", calories: 2120, protein: 120, meals: [{ name: "Гречка с яйцом", cal: 410 }, { name: "Тунец с овощами и рисом", cal: 540 }, { name: "Орехи", cal: 180 }, { name: "Индейка с картофелем", cal: 720 }, { name: "Апельсин", cal: 80 }] },
    ],
  },
};

function getPlan(goal: string, restriction: string): DayPlan[] {
  const goalPlan = PLANS[goal] || PLANS["healthy"];
  return goalPlan[restriction] || goalPlan["none"] || Object.values(goalPlan)[0];
}

// ── Options ───────────────────────────────────────────────
const GOALS: GoalOption[] = [
  { id: "lose",     emoji: "🎯", label: "Похудеть" },
  { id: "gain",     emoji: "💪", label: "Набрать мышцы" },
  { id: "healthy",  emoji: "🥗", label: "Питаться здоровее" },
  { id: "maintain", emoji: "⚖️",  label: "Поддержать форму" },
];

const RESTRICTIONS: RestrictionOption[] = [
  { id: "none",       emoji: "✅", label: "Нет ограничений" },
  { id: "vegetarian", emoji: "🌱", label: "Вегетарианец" },
  { id: "gluten",     emoji: "🌾", label: "Без глютена" },
  { id: "lactose",    emoji: "🥛", label: "Без лактозы" },
];

// ── Main component ────────────────────────────────────────
export function LandingDemo() {
  const [step, setStep] = useState<Step>("q1");
  const [goal, setGoal] = useState<string>("");
  const [restriction, setRestriction] = useState<string>("");
  const [plan, setPlan] = useState<DayPlan[]>([]);

  function handleGoal(id: string) {
    setGoal(id);
    setStep("q2");
  }

  function handleRestriction(id: string) {
    setRestriction(id);
    setStep("loading");
    setTimeout(() => {
      setPlan(getPlan(goal, id));
      setStep("result");
    }, 1800);
  }

  const goalLabel = GOALS.find((g) => g.id === goal)?.label ?? "";
  const restrictionLabel = RESTRICTIONS.find((r) => r.id === restriction)?.label ?? "";

  return (
    <div className="bg-parchment-50 border border-parchment-200 rounded-2xl shadow-warm-lg overflow-hidden">
      {/* Header bar */}
      <div className="bg-bark-300 px-6 py-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-200" />
        <span className="text-cream-100 text-sm font-medium">
          NutriPlan AI — демо без регистрации
        </span>
      </div>

      <div className="p-6 md:p-8">
        {/* Q1 */}
        {step === "q1" && (
          <div className="animate-fade-in">
            <p className="text-bark-400 text-xs font-semibold tracking-widest uppercase mb-2">Вопрос 1 из 2</p>
            <h3 className="font-display text-2xl font-semibold text-bark-300 mb-6">
              Какова ваша цель?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGoal(g.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-parchment-200 bg-white hover:border-bark-300 hover:bg-parchment-50 transition-all duration-150 group"
                >
                  <span className="text-3xl">{g.emoji}</span>
                  <span className="text-sm font-medium text-bark-400 group-hover:text-bark-300">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Q2 */}
        {step === "q2" && (
          <div className="animate-fade-in">
            <p className="text-bark-400 text-xs font-semibold tracking-widest uppercase mb-2">Вопрос 2 из 2</p>
            <h3 className="font-display text-2xl font-semibold text-bark-300 mb-6">
              Есть ли ограничения в питании?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {RESTRICTIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRestriction(r.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-parchment-200 bg-white hover:border-bark-300 hover:bg-parchment-50 transition-all duration-150 group"
                >
                  <span className="text-3xl">{r.emoji}</span>
                  <span className="text-sm font-medium text-bark-400 group-hover:text-bark-300">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center py-12 gap-4 animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-parchment-200 border-t-bark-300 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-amber-300 animate-pulse-vital" />
            </div>
            <p className="text-bark-400 font-medium">Составляем ваш персональный план…</p>
            <p className="text-stone-400 text-sm">Цель: {goalLabel} · {restrictionLabel}</p>
          </div>
        )}

        {/* Result */}
        {step === "result" && (
          <div className="animate-fade-in">
            {/* Pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-sage-50 text-sage-400 px-3 py-1.5 rounded-full border border-sage-100">
                <span>🎯</span> {goalLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-400 px-3 py-1.5 rounded-full border border-amber-100">
                <span>✨</span> {restrictionLabel}
              </span>
            </div>

            <h3 className="font-display text-xl font-semibold text-bark-300 mb-4">
              Ваш план питания на неделю
            </h3>

            {/* 3 unlocked days */}
            <div className="space-y-3 mb-4">
              {plan.map((day, i) => (
                <div key={i} className="bg-white rounded-xl border border-parchment-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-bark-300">{day.day}</span>
                    <div className="flex gap-3 text-xs text-stone-400">
                      <span>{day.calories} ккал</span>
                      <span>Б: {day.protein}г</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {day.meals.map((meal, j) => (
                      <div key={j} className="flex items-center justify-between text-sm">
                        <span className="text-bark-400">{meal.name}</span>
                        <span className="text-stone-400 text-xs">{meal.cal} ккал</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Locked days */}
            <div className="relative">
              <div className="space-y-3 opacity-50 blur-[2px] pointer-events-none select-none">
                {["Чт", "Пт", "Сб", "Вс"].map((day) => (
                  <div key={day} className="bg-white rounded-xl border border-parchment-200 p-4 h-16 flex items-center">
                    <span className="font-semibold text-bark-300 mr-3">{day}</span>
                    <div className="flex-1 bg-parchment-100 rounded h-3" />
                  </div>
                ))}
              </div>
              {/* Lock overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream-100/60 backdrop-blur-[1px] rounded-xl">
                <Lock className="w-7 h-7 text-bark-300 mb-2" />
                <p className="text-sm font-semibold text-bark-300 text-center px-4">
                  Разблокируйте полный план
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 space-y-3">
              <Link
                href="/onboarding"
                className="flex items-center justify-center gap-2 w-full bg-bark-300 hover:bg-bark-400 text-cream-100 font-semibold py-3.5 rounded-xl transition-colors duration-150"
              >
                Разблокируйте полный план — Начать бесплатно
                <ChevronRight className="w-4 h-4" />
              </Link>
              <p className="text-center text-xs text-stone-400">
                Без кредитной карты · 14 дней Про бесплатно
              </p>
            </div>

            {/* Restart */}
            <button
              onClick={() => { setStep("q1"); setGoal(""); setRestriction(""); setPlan([]); }}
              className="mt-3 text-xs text-stone-400 hover:text-bark-300 underline underline-offset-2 block mx-auto"
            >
              Пройти заново
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
