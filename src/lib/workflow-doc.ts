/**
 * NutriPlan main scenario + common deviations — HTML email version.
 * Generated from TES-119 plan document (v3).
 * Sent to board via POST /api/email-send/workflow-doc.
 */

export const WORKFLOW_DOC_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:860px;margin:0 auto;padding:24px;background:#f7f7f5}
  .card{background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:32px;margin-bottom:24px}
  h1{color:#1a1a1a;border-bottom:3px solid #4f46e5;padding-bottom:10px;margin-top:0}
  h2{color:#4f46e5;margin-top:28px}
  h3{color:#6366f1;margin-top:20px}
  h4{color:#374151;margin-top:16px}
  code{background:#f3f4f6;padding:2px 6px;border-radius:3px;font-family:'Monaco','Menlo',monospace;font-size:.88em}
  pre{background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:6px;overflow-x:auto;font-size:.85em;border-left:4px solid #4f46e5}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:.9em}
  th{background:#4f46e5;color:#fff;text-align:left;padding:8px 12px}
  td{padding:7px 12px;border-bottom:1px solid #e5e7eb}
  tr:nth-child(even) td{background:#f9fafb}
  .badge{display:inline-block;background:#4f46e5;color:#fff;border-radius:4px;padding:2px 8px;font-size:.8em;font-weight:600}
  .badge-green{background:#16a34a}
  .badge-orange{background:#ea580c}
  .badge-red{background:#dc2626}
  .step{background:#f0f0ff;border-left:4px solid #4f46e5;padding:10px 14px;margin:10px 0;border-radius:0 6px 6px 0}
  .deviation{background:#fff7ed;border-left:4px solid #ea580c;padding:10px 14px;margin:10px 0;border-radius:0 6px 6px 0}
  ul{padding-left:20px}
  li{margin:4px 0}
  hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
  .footer{text-align:center;color:#9ca3af;font-size:.85em;margin-top:32px}
</style>
</head>
<body>

<div class="card">
<h1>NutriPlan — Основной сценарий и отклонения</h1>
<p><strong>Версия:</strong> 3 (все проверки агентов завершены) &nbsp;|&nbsp; <strong>Дата:</strong> Апрель 2026</p>

<h2>Обзор</h2>
<p>NutriPlan — персонализированное приложение для планирования питания (Next.js 15, Supabase, GigaChat AI). Ведёт пользователя от регистрации через ведение дневника питания, AI-генерацию планов питания, управление рецептами и постоянные инсайты о здоровье. Все AI-функции работают на <strong>GigaChat</strong> (LLM от Сбера) через OpenAI-совместимый Chat Completions API.</p>

<h2>Инвентаризация GigaChat-потоков (15 функций)</h2>
<table>
<tr><th>#</th><th>Функция</th><th>Модель</th><th>Триггер</th></tr>
<tr><td>1</td><td><code>getOnboardingInsight()</code></td><td><span class="badge">lite</span></td><td>POST /api/ai/onboarding после анкеты здоровья</td></tr>
<tr><td>2</td><td><code>getDailyAnalysis()</code></td><td><span class="badge">lite</span></td><td>POST /api/ai/insights?type=daily_analysis</td></tr>
<tr><td>3</td><td><code>getSafetyAlert()</code></td><td><span class="badge">lite</span></td><td>Критический дефицит нутриентов</td></tr>
<tr><td>4</td><td><code>getGoalInsight()</code></td><td><span class="badge">lite</span></td><td>Еженедельная проверка прогресса</td></tr>
<tr><td>5</td><td><code>getTrendWarning()</code></td><td><span class="badge">lite</span></td><td>Негативный тренд 7+ дней</td></tr>
<tr><td>6</td><td><code>getOptimisationTip()</code></td><td><span class="badge">lite</span></td><td>Совет по оптимизации</td></tr>
<tr><td>7</td><td><code>getMealSubstitution()</code></td><td><span class="badge">lite</span></td><td>Дефицит микронутриента → 3 замены</td></tr>
<tr><td>8</td><td><code>getFreeAnswer()</code></td><td><span class="badge">lite</span></td><td>POST /api/ai/chat (свободный Q&amp;A)</td></tr>
<tr><td>9</td><td><code>generateWeeklyMealPlan()</code></td><td><span class="badge">lite</span></td><td>POST /api/ai/meal-plan</td></tr>
<tr><td>10</td><td><code>swapMealSlot()</code></td><td><span class="badge">lite</span></td><td>POST /api/ai/meal-plan/swap</td></tr>
<tr><td>11</td><td><code>getRecipeDetail()</code></td><td><span class="badge">lite</span></td><td>GET /api/ai/meal-plan/get</td></tr>
<tr><td>12</td><td><code>getFoodPhotoAnalysis()</code></td><td><span class="badge badge-orange">max→pro</span></td><td>POST /api/ai/food-photo (фото еды)</td></tr>
<tr><td>13</td><td><code>estimateIngredientNutrition()</code></td><td><span class="badge">lite</span></td><td>POST /api/ai/food-suggestions (продукт не в БД)</td></tr>
<tr><td>14</td><td><code>getFoodSuggestion()</code></td><td><span class="badge">lite</span></td><td>Постлоговый нёдж</td></tr>
<tr><td>15</td><td><code>generateTastePortrait()</code></td><td><span class="badge">lite</span></td><td>POST /api/ai/taste-portrait (история 30 дней)</td></tr>
</table>
<p><strong>Авторизация GigaChat:</strong> <code>GIGACHAT_AUTH_KEY</code> (base64 clientId:clientSecret) → OAuth-токен с <code>https://ngw.devices.sberbank.ru:9443/api/v2/oauth</code>. Токен кэшируется до истечения (−60 с).</p>
</div>

<div class="card">
<h1>Основной сценарий (Happy Path)</h1>

<h2>Этап 1: Регистрация и аутентификация</h2>
<div class="step">
<strong>Действие пользователя:</strong> Открывает NutriPlan → нажимает «Зарегистрироваться».
</div>
<ol>
<li>Пользователь вводит email + пароль в <code>RegisterForm</code>.</li>
<li>Фронтенд вызывает <code>supabase.auth.signUp()</code>.</li>
<li>Supabase отправляет письмо-подтверждение.</li>
<li>Пользователь кликает ссылку → Supabase устанавливает session cookie.</li>
<li>Next.js middleware (<code>/src/middleware.ts</code>) перехватывает запросы, вызывает <code>supabase.auth.getUser()</code>, перенаправляет неавторизованных на <code>/login</code>.</li>
</ol>
<p><strong>Результат:</strong> Пользователь аутентифицирован, перенаправлен на <code>/onboarding</code>.</p>

<hr/>

<h2>Этап 2: Онбординг (анкета здоровья)</h2>
<div class="step">
<strong>Действие пользователя:</strong> Заполняет многошаговую анкету в <code>OnboardingWizard</code>.
</div>
<h4>Шаги анкеты:</h4>
<ul>
<li>Цель: похудение / набор мышц / лечение заболевания / общее здоровье / поддержание веса</li>
<li>Возраст, пол, рост, вес</li>
<li>Уровень активности (сидячий → очень активный)</li>
<li>Пищевые ограничения (вегетарианство, веган, халяль, кето, без глютена, без лактозы и др.)</li>
<li>Аллергены</li>
<li>Медицинские условия (диабет T2, гипертония, СРК, СПКЯ, гипотиреоз)</li>
<li>Бюджет (низкий / средний / высокий) — используется при генерации плана</li>
<li>Тон ответов (краткий / подробный) — влияет на длину AI-ответов</li>
</ul>
<h4>Что происходит в системе:</h4>
<ol>
<li>Server Action сохраняет данные в таблицу <code>health_assessments</code>.</li>
<li>TDEE и макро-цели рассчитываются через <code>calculateTDEE()</code> + <code>calculateMacros()</code>.</li>
<li><code>POST /api/ai/onboarding</code> → строится <code>UserProfile</code> → вызывается <code>getOnboardingInsight(profile)</code>.</li>
<li><span class="badge">GigaChat lite</span> получает <code>SYSTEM_PROMPT_RU</code> + <code>PROMPT_ONBOARDING_RU</code> с данными пользователя.</li>
<li>Возвращает персонализированный анализ и начальные рекомендации.</li>
</ol>
<p><strong>Результат:</strong> Пользователь видит приветствие + макро-цели на дашборде.</p>

<hr/>

<h2>Этап 3: Дашборд — ежедневный обзор</h2>
<div class="step"><strong>Действие пользователя:</strong> Открывает <code>/dashboard</code>.</div>
<ol>
<li>Сервер параллельно загружает: <code>nutrition_logs</code> за сегодня, <code>user_goals</code>, <code>water_logs</code>.</li>
<li>Подсчитывает итоги, рендерит карточки статистики и прогресс-бары.</li>
</ol>
<p><strong>Результат:</strong> Пользователь видит снимок питания за день.</p>

<hr/>

<h2>Этап 4: Ведение дневника питания</h2>
<div class="step"><strong>Действие пользователя:</strong> Нажимает «Добавить еду» → переходит на <code>/dashboard/log</code>.</div>

<h4>Путь A: Ручной ввод текстом</h4>
<ol>
<li>Пользователь вводит название продукта + количество.</li>
<li>Фронтенд вызывает <code>POST /api/ingredients</code> для поиска нутриентов.</li>
<li>Если не найден → <code>estimateIngredientNutrition()</code> → <span class="badge">GigaChat lite</span> → JSON-оценка.</li>
<li>Пользователь подтверждает → сохраняется в <code>nutrition_logs</code>.</li>
</ol>

<h4>Путь B: Распознавание фото еды</h4>
<ol>
<li>Пользователь загружает фото → <code>POST /api/ai/food-photo</code>.</li>
<li>Сервер уменьшает до ≤1024px через <code>sharp</code>, загружает в GigaChat Files API.</li>
<li><span class="badge badge-orange">GigaChat max (fallback pro)</span> + <code>buildFoodPhotoPrompt()</code> → детальный JSON: ингредиенты, способ приготовления, оценка веса, скрытые калории.</li>
<li>Если доступны рецепты недели — GigaChat пытается сопоставить через <code>matched_recipe_id</code>.</li>
</ol>

<h4>Путь C: AI-подсказка после логирования</h4>
<ol>
<li>После каждой записи → <code>getFoodSuggestion(profile, dayTotals)</code> → <span class="badge">GigaChat lite</span>.</li>
<li>Если <code>eating_disorder_flag = true</code> — в промпт явно инжектируется блокирующая инструкция (не строка с флагом), избегающая числовых значений.</li>
<li>Возвращается ОДНА краткая подсказка или пустая строка.</li>
</ol>

<hr/>

<h2>Этап 5: Генерация недельного плана питания</h2>
<div class="step"><strong>Действие пользователя:</strong> Переходит на <code>/dashboard/planner</code> → нажимает «Сгенерировать план».</div>
<ol>
<li><code>getMealPlanPrompt(params)</code> строит обогащённый промпт:
  <ul>
  <li><strong>5 шаблонов</strong> по целям (похудение / набор мышц / поддержание / заболевания / общее здоровье)</li>
  <li><strong>Фазовые цели по калориям</strong> (тренировочный / восстановительный день)</li>
  <li><strong>Модификаторы сценария</strong>: keto, vegan_muscle, diabetes_t2, hypertension, ibs, pcos, hypothyroidism, eating_disorder, budget_low/moderate/high</li>
  <li><strong>Блок жёстких ограничений</strong> — коды ограничений переведены в явные запреты на русском</li>
  <li><strong>ED-пост-обработка</strong> — при флаге скрабятся числа ккал из текста промпта</li>
  </ul>
</li>
<li><code>generateWeeklyMealPlan()</code> → <span class="badge">GigaChat lite</span> → <code>WeekPlanRaw</code> (7 дней × 4 приёма пищи).</li>
<li><code>extractJson()</code> удаляет markdown-фенсы; <code>sanitizeNumbers()</code> приводит строки-числа.</li>
<li>Рецепты сохраняются в таблицу <code>recipes</code>; создаются <code>meal_plan_entries</code>.</li>
</ol>

<hr/>

<h2>Этап 6: Взаимодействие с рецептами</h2>
<ul>
<li><strong>Детали рецепта:</strong> <code>getRecipeDetail()</code> → <span class="badge">GigaChat lite</span> → пошаговые инструкции, советы, замены.</li>
<li><strong>Замена блюда:</strong> <code>swapMealSlot()</code> → <span class="badge">GigaChat lite</span> → ОДНО новое блюдо, не повторяющее существующие в этот день.</li>
<li><strong>Переделка плана (redo):</strong> до 3 раз в неделю бесплатно; 4+ → платёж 100 ₽.</li>
</ul>

<hr/>

<h2>Этап 7: AI-инсайты</h2>
<table>
<tr><th>Приоритет</th><th>Тип</th><th>Функция GigaChat</th><th>Триггер</th></tr>
<tr><td>1</td><td>safety_alert</td><td><code>getSafetyAlert()</code></td><td>Критический дефицит нутриентов (&lt;70% цели 3+ дня)</td></tr>
<tr><td>2</td><td>goal_insight</td><td><code>getGoalInsight()</code></td><td>Еженедельная проверка</td></tr>
<tr><td>3</td><td>trend_warning</td><td><code>getTrendWarning()</code></td><td>Негативный тренд 7 дней</td></tr>
<tr><td>4</td><td>optimisation_tip</td><td><code>getOptimisationTip()</code></td><td>Совет по улучшению</td></tr>
<tr><td>5</td><td>daily_analysis</td><td><code>getDailyAnalysis()</code></td><td>Сводка дня; фолбэк для неизвестных целей</td></tr>
<tr><td>6</td><td>meal_substitution</td><td><code>getMealSubstitution()</code></td><td>Дефицит микронутриента → 3 продукта-замены</td></tr>
</table>

<hr/>

<h2>Этап 8: Свободный чат Q&amp;A</h2>
<ol>
<li><code>POST /api/ai/chat</code> с <code>{ message }</code>.</li>
<li>Ввод санируется: <code>{{</code> и <code>}}</code> экранируются (защита от prompt injection).</li>
<li><code>getFreeAnswer(profile, message)</code> → <span class="badge">GigaChat lite</span> → ответ, адаптированный к профилю.</li>
<li>История диалога сохраняется в <code>chat_sessions</code> + <code>chat_messages</code> (Supabase).</li>
</ol>

<hr/>

<h2>Этап 9: Портрет вкуса</h2>
<ol>
<li>Сервер агрегирует историю 30 дней + оценённые блюда.</li>
<li><code>generateTastePortrait()</code> → <span class="badge">GigaChat lite</span> → JSON: <code>taste_profile_summary, preferred_cuisines[], flavor_preferences[], dietary_fit, health_alignment, top_rated_patterns[], recommendations[]</code>.</li>
</ol>

<hr/>

<h2>Этапы 10–11: Список покупок и экспорт данных</h2>
<ul>
<li><strong>Список покупок:</strong> Агрегирует ингредиенты из <code>meal_plan_entries</code> за неделю. AI не используется — чистая агрегация данных.</li>
<li><strong>Экспорт:</strong> <code>GET /api/export-data</code> → CSV всех <code>nutrition_logs</code> и <code>water_logs</code>.</li>
</ul>
</div>

<div class="card">
<h1>Частые отклонения и обработка</h1>

<h3>Отклонение 1: Пользователь пропускает онбординг</h3>
<div class="deviation">
<code>DashboardShell</code> проверяет наличие <code>health_assessments</code> при каждом рендере → перенаправляет на <code>/onboarding?from=dashboard</code>. GigaChat-инсайт не вызывается до завершения анкеты.
</div>

<h3>Отклонение 2: Сбой / таймаут GigaChat</h3>
<div class="deviation">
Таймаут: 30 с (фото-анализ: 60 с). Одна автоматическая повторная попытка. При сбое — graceful degradation: UI показывает заглушку, не крашится. Скелетон-состояния загрузки реализованы для всех 8 AI-точек входа.
</div>

<h3>Отклонение 3: Истёк токен GigaChat</h3>
<div class="deviation">
Модуль <code>gigachat/client.ts</code> кэширует OAuth-токен. Если до истечения &lt;60 с — автоматически запрашивает новый перед вызовом. Прозрачно для вызывающего кода.
</div>

<h3>Отклонение 4: Пользователь меняет настройки профиля</h3>
<div class="deviation">
Настройки обновляются через Server Actions. Новый план генерируется вручную пользователем — AI не перегенерирует автоматически при изменении профиля.
</div>

<h3>Отклонение 5: Платёж / подписка</h3>
<div class="deviation">
YooKassa webhook (<code>POST /api/subscription/webhook</code>): <code>payment.succeeded</code> → устанавливает <code>plan: "premium"</code>; <code>payment.canceled</code> → <code>plan: "past_due"</code>. Пробный период: 14 дней, триггер предупреждения за 3 дня (T-3 email). Платные фичи: планировщик, redo 4+, экспорт PDF. Реферальная система: ?ref= захватывается на лендинге, сохраняется в localStorage/sessionStorage, применяется при регистрации.
</div>

<h3>Отклонение 6: Нераспознанная фотография еды</h3>
<div class="deviation">
GigaChat возвращает пустой массив ингредиентов или низкую уверенность → фронтенд предлагает перейти к ручному вводу. Сообщение об ошибке отображается без краша.
</div>

<h3>Отклонение 7: Беременность / кормление грудью</h3>
<div class="deviation">
Флаги <code>is_pregnant</code> / <code>is_breastfeeding</code> в <code>health_assessments</code>. TDEE-аплифт: +0/+340/+452/+500 ккал по триместрам. GigaChat получает ограничения по безопасности продуктов (нет сырой рыбы, мяса, яиц; печени; непастеризованных сыров; тунца &gt;2 порции/нед.). Применяется во всех 5 точках вызова целей.
</div>

<h3>Отклонение 8: Расстройства пищевого поведения (RПП)</h3>
<div class="deviation">
Гранулярные флаги: анорексия/ограничительное РПП (скрыть числа калорий, показать только светофор), компульсивное переедание (БЭД) (без ограничений, акцент на чувство голода), орторексия (избегать «чистая» vs «грязная» еда). Флаг инжектируется как явный блок инструкций в промпт GigaChat, не как строка.
</div>

<h3>Отклонение 9: Заболевания (per-condition маршрутизация)</h3>
<div class="deviation">
Отдельные субпромпты для: ХБП (ограничение белка, фосфора, калия), СД1/СД2 (подсчёт углеводов, ГИ), подагра (низкопуриновая), бариатрия (малые порции, белок первым), ФКУ (ограничение фенилаланина), гипотиреоз (ограничение сырых крестоцветных/сои). ХБП и ФКУ включают обязательный дисклеймер: «проконсультируйтесь с нефрологом/диетологом».
</div>

<h3>Отклонение 10: Нарушение безопасности питания</h3>
<div class="deviation">
Пороги для safety_alert: &lt;70% цели калорий 3+ дня; &lt;50% белка 3+ дня; нет источника B12 7+ дней (веганы); потеря &gt;1% массы тела/неделю. При срабатывании — <code>getSafetyAlert()</code> получает наивысший приоритет перед другими инсайтами.
</div>
</div>

<div class="card">
<h1>Технические характеристики</h1>
<table>
<tr><th>Компонент</th><th>Технология</th></tr>
<tr><td>Frontend</td><td>Next.js 15 (App Router), React 19, TypeScript</td></tr>
<tr><td>Backend</td><td>Next.js API Routes + Server Actions</td></tr>
<tr><td>База данных</td><td>Supabase (PostgreSQL) + Row Level Security</td></tr>
<tr><td>Аутентификация</td><td>Supabase Auth (email/password, Yandex OAuth, Telegram)</td></tr>
<tr><td>AI-сервис</td><td>GigaChat (Sber) — lite (текст), max→pro (фото)</td></tr>
<tr><td>AI-авторизация</td><td>OAuth2 GIGACHAT_API_PERS, токен кэшируется</td></tr>
<tr><td>Платежи</td><td>YooKassa webhook</td></tr>
<tr><td>Email</td><td>Resend API (RESEND_API_KEY)</td></tr>
<tr><td>Стилизация</td><td>Tailwind CSS v4</td></tr>
<tr><td>Деплой</td><td>Vercel (рекомендуется)</td></tr>
</table>

<h2>Ключевые таблицы БД</h2>
<table>
<tr><th>Таблица</th><th>Назначение</th></tr>
<tr><td>health_assessments</td><td>Профиль здоровья пользователя (цели, ограничения, медусловия)</td></tr>
<tr><td>nutrition_logs</td><td>Записи питания (пагинация + фильтр по дате)</td></tr>
<tr><td>meal_plans / meal_plan_entries</td><td>AI-сгенерированные планы питания</td></tr>
<tr><td>recipes</td><td>Рецепты (источник AI + оценки пользователей)</td></tr>
<tr><td>dish_ratings</td><td>Оценки блюд (1–5) + комментарии</td></tr>
<tr><td>user_taste_portrait</td><td>AI-портрет вкусов (JSON)</td></tr>
<tr><td>chat_sessions / chat_messages</td><td>История диалогов с GigaChat</td></tr>
<tr><td>meal_redos</td><td>Запросы на переделку плана (3/нед. бесплатно)</td></tr>
<tr><td>referrals</td><td>Реферальная система (?ref= → награды)</td></tr>
<tr><td>water_logs</td><td>Трекинг потребления воды</td></tr>
<tr><td>user_goals</td><td>Цели и макро-таргеты пользователя</td></tr>
<tr><td>meals</td><td>Каталог блюд для 8-недельной программы</td></tr>
<tr><td>catalog_completions</td><td>Отметки выполнения блюд в программе</td></tr>
</table>
</div>

<div class="footer">
<p>NutriPlan — разработано с использованием рекомендаций ВОЗ по нормам питания</p>
<p>Документ сгенерирован автоматически из TES-119 (v3) · ${new Date().toLocaleDateString('ru-RU')}</p>
</div>

</body>
</html>`;
