"use client";

import Link from "next/link";
import { Check, ChevronRight, Star, Zap, ShoppingCart, TrendingUp } from "lucide-react";
import { LandingDemoClient as LandingDemo } from "@/components/landing/LandingDemoClient";

// ── Feature cards ─────────────────────────────────────────
const FEATURES = [
  {
    icon: Zap,
    title: "ИИ-планировщик питания",
    body: "Просто скажите, что хотите — похудеть, набрать мышцы или питаться здоровее. NutriPlan составит меню на неделю, учитывая ваши вкусы и ограничения. Никакого гречневого похудения.",
  },
  {
    icon: Star,
    title: "Трекинг без боли",
    body: "Добавляйте блюда за секунды — через поиск, штрих-код или фото. Видите калории, белки, жиры и углеводы в реальном времени. Никаких таблиц.",
  },
  {
    icon: ShoppingCart,
    title: "Список покупок с одной кнопкой",
    body: "Готовый список продуктов на неделю — автоматически. Сходите в магазин один раз и питайтесь по плану.",
  },
  {
    icon: TrendingUp,
    title: "Прогресс, который виден",
    body: "Отслеживайте вес, объёмы и динамику питания на одном экране. Видите результат — хочется продолжать.",
  },
];

// ── Pricing tiers ─────────────────────────────────────────
const FREE_FEATURES = [
  "Трекинг калорий и КБЖУ",
  "База из 1 200+ продуктов",
  "7-дневная история питания",
  "1 шаблон недельного меню",
  "Дневник питания",
];

const PRO_FEATURES = [
  "Всё из Базового плана",
  "AI-планировщик (GigaChat) — меню под ваши цели",
  "Безлимитная история питания",
  "Генерация списка покупок",
  "Подробный трекинг микронутриентов",
  "Прогресс-графики (вес, ИМТ)",
  "Экспорт PDF-отчёта",
  "Приоритетная поддержка",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-100">
      {/* ── Sticky nav ────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-parchment-200 bg-cream-100/90 backdrop-blur-sm">
        <div className="max-w-content mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="font-display text-xl font-semibold text-bark-300">NutriPlan</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-bark-300 hover:text-bark-400 transition-colors"
            >
              Вход
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 bg-bark-300 hover:bg-bark-400 text-cream-100 text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150"
            >
              Попробовать бесплатно
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="bg-hero-gradient">
        <div className="max-w-content mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-sage-400 mb-4">
                Планировщик питания с ИИ
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-5xl font-bold text-bark-300 leading-[1.08] tracking-tighter mb-5">
                Ешьте правильно —<br />
                <span className="text-amber-300">без стресса</span> и без таблиц
              </h1>
              <p className="text-bark-400 text-lg leading-relaxed mb-8 max-w-prose">
                NutriPlan анализирует ваши цели, предпочтения и ограничения — и составляет меню
                на неделю вперёд. Считайте калории, следите за прогрессом, получайте список
                покупок. Всё в одном месте.
              </p>

              {/* CTA group */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 bg-bark-300 hover:bg-bark-400 text-cream-100 font-semibold text-base px-6 py-3.5 rounded-xl transition-colors duration-150 shadow-warm-md"
                >
                  Начать бесплатно
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-bark-300 font-semibold text-base px-6 py-3.5 rounded-xl border border-parchment-200 transition-colors duration-150"
                >
                  Попробовать демо ↓
                </a>
              </div>

              {/* Anxiety reducers */}
              <p className="text-stone-400 text-sm">
                Без кредитной карты · 14 дней Про бесплатно · Отмена в любой момент
              </p>

              {/* Social proof */}
              <div className="mt-8 flex items-start gap-4 bg-white/70 rounded-xl p-4 border border-parchment-100 max-w-md">
                <div className="text-2xl shrink-0">💬</div>
                <div>
                  <p className="text-sm text-bark-400 italic leading-snug">
                    «Наконец-то приложение, которое не заставляет считать каждую ложку. Меню уже готово — просто готовлю.»
                  </p>
                  <p className="text-xs text-stone-400 mt-1.5 font-medium">— Анна, 31 год, Москва</p>
                </div>
              </div>
            </div>

            {/* Right: interactive demo */}
            <div id="demo" className="scroll-mt-20">
              <LandingDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <section className="py-20 md:py-24">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-sage-400 mb-3">
              Возможности
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-bark-300 tracking-tight">
              Всё, что нужно для здорового питания
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl border border-parchment-100 p-6 shadow-warm-sm hover:shadow-warm-md transition-shadow duration-220">
                <div className="w-10 h-10 rounded-xl bg-parchment-100 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-bark-300" />
                </div>
                <h3 className="font-semibold text-bark-300 mb-2 leading-snug">{title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="bg-parchment-50 py-20 md:py-24 border-y border-parchment-200">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-sage-400 mb-3">
              Как это работает
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-bark-300 tracking-tight">
              Три шага до вашего меню
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Расскажите о себе", desc: "Укажите цель, предпочтения и ограничения. Занимает 30 секунд." },
              { step: "2", title: "ИИ составит план", desc: "GigaChat анализирует данные и генерирует персональное меню на неделю." },
              { step: "3", title: "Готовьте и отслеживайте", desc: "Следуйте плану, логируйте питание, смотрите прогресс." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-bark-300 text-cream-100 font-display text-xl font-bold flex items-center justify-center mx-auto mb-4 shadow-warm-md">
                  {step}
                </div>
                <h3 className="font-semibold text-bark-300 mb-2">{title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────── */}
      <section className="py-20 md:py-24">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-sage-400 mb-3">
              Тарифы
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-bark-300 tracking-tight mb-3">
              Простые, прозрачные цены
            </h2>
            <p className="text-stone-400">
              Начните бесплатно. Переходите на Про, когда будете готовы.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-parchment-200 p-7 shadow-warm-sm">
              <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-3">Базовый</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-4xl font-bold text-bark-300">0 ₽</span>
              </div>
              <p className="text-sm text-stone-400 mb-6">Навсегда бесплатно</p>
              <ul className="space-y-3 mb-7">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-bark-400">
                    <Check className="w-4 h-4 text-sage-300 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/onboarding"
                className="block text-center w-full border border-bark-300 text-bark-300 hover:bg-parchment-50 font-semibold py-3 rounded-xl transition-colors duration-150"
              >
                Начать бесплатно
              </Link>
            </div>

            {/* Pro */}
            <div className="relative bg-bark-300 rounded-2xl p-7 shadow-warm-xl text-cream-100">
              {/* Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-300 text-bark-500 text-xs font-bold px-3 py-1 rounded-full shadow-amber-glow">
                  14 дней бесплатно
                </span>
              </div>
              <p className="text-xs font-semibold tracking-widest uppercase text-cream-200 mb-3">Про</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-4xl font-bold">399 ₽</span>
                <span className="text-cream-200 text-sm">/месяц</span>
              </div>
              <p className="text-cream-200 text-sm mb-1">или 2 990 ₽/год — <span className="text-amber-200 font-medium">экономия 38%</span></p>
              <p className="text-cream-200/70 text-xs mb-6">«Меньше цены одного похода в ресторан»</p>
              <ul className="space-y-3 mb-7">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-cream-100">
                    <Check className="w-4 h-4 text-vital-300 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/onboarding"
                className="block text-center w-full bg-cream-100 hover:bg-cream-200 text-bark-300 font-bold py-3 rounded-xl transition-colors duration-150"
              >
                Перейти на Про — 399 ₽/мес
              </Link>
              <p className="text-center text-xs text-cream-200/70 mt-2">
                Без кредитной карты · Отмена в любой момент
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────── */}
      <section className="bg-bark-gradient py-20">
        <div className="max-w-prose mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-cream-100 mb-4 tracking-tight">
            Начните питаться правильно сегодня
          </h2>
          <p className="text-cream-200 mb-8 leading-relaxed">
            Присоединяйтесь к тысячам людей, которые уже питаются по своему персональному плану.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 bg-amber-300 hover:bg-amber-400 text-bark-500 font-bold text-base px-8 py-4 rounded-xl transition-colors duration-150 shadow-amber-glow"
          >
            Начать бесплатно
            <ChevronRight className="w-4 h-4" />
          </Link>
          <p className="text-cream-200/60 text-sm mt-4">
            Без кредитной карты · 14 дней Про бесплатно · Отмена в любой момент
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="border-t border-parchment-200 bg-cream-100 py-8">
        <div className="max-w-content mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥗</span>
            <span className="font-display font-semibold text-bark-300">NutriPlan</span>
          </div>
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} NutriPlan. Разработано с учётом рекомендаций ВОЗ по нормам питания.
          </p>
          <div className="flex gap-5 text-xs text-stone-400">
            <Link href="/pricing" className="hover:text-bark-300 transition-colors">Тарифы</Link>
            <Link href="/login" className="hover:text-bark-300 transition-colors">Войти</Link>
            <Link href="/onboarding" className="hover:text-bark-300 transition-colors">Начать</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
