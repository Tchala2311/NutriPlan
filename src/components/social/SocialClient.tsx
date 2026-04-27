'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GroupCommentsSection } from './GroupCommentsSection';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

type SubTab = 'group' | 'plan' | 'explore';

type ConnectionStatus = 'active' | 'pending_sent' | 'pending_received';

interface Connection {
  id: string;
  displayName: string;
  username?: string;
  initials: string;
  avatarColor: string;
  status: ConnectionStatus;
  dietaryTags: string[];
  goal: string;
  restrictions: string[];
}

interface SharedMeal {
  id: string;
  day: number;       // 0=Пн … 6=Вс
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  name: string;
  kcalPerPerson: number;
  servingNote?: string;
}

interface ExploreRecipe {
  id: string;
  title: string;
  cookTime: number;
  calories: number;
  tags: string[];
  cuisine: string;
}

/* ─────────────────────────────────────────────
   Mock data (replaced by API in Phase 3/4)
───────────────────────────────────────────── */

const MOCK_CONNECTIONS: Connection[] = [
  {
    id: '1',
    displayName: 'Анна Петрова',
    username: 'anna_petrova',
    initials: 'АП',
    avatarColor: 'bg-sage-200',
    status: 'active',
    dietaryTags: ['Без глютена', 'Вегетарианство'],
    goal: 'Снижение веса',
    restrictions: ['Лактоза'],
  },
  {
    id: '2',
    displayName: 'Михаил Козлов',
    username: 'mikhail_kozlov',
    initials: 'МК',
    avatarColor: 'bg-vital-100',
    status: 'active',
    dietaryTags: ['Высокий белок'],
    goal: 'Набор мышц',
    restrictions: [],
  },
  {
    id: '3',
    displayName: 'lena_fitness',
    username: 'lena_fitness',
    initials: 'ЛФ',
    avatarColor: 'bg-amber-100',
    status: 'pending_received',
    dietaryTags: ['Веган'],
    goal: 'Поддержание веса',
    restrictions: ['Орехи'],
  },
];

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MEAL_LABEL: Record<SharedMeal['mealType'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snacks: 'Перекус',
};
const MEAL_COLOR: Record<SharedMeal['mealType'], string> = {
  breakfast: 'bg-amber-50 border-amber-100',
  lunch: 'bg-sage-50 border-sage-100',
  dinner: 'bg-vital-50 border-vital-100',
  snacks: 'bg-parchment-100 border-parchment-200',
};
const MEAL_ACCENT: Record<SharedMeal['mealType'], string> = {
  breakfast: 'text-amber-500',
  lunch: 'text-sage-400',
  dinner: 'text-vital-400',
  snacks: 'text-stone-400',
};
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;

const MOCK_SHARED_MEALS: SharedMeal[] = [
  { id: 'sm1', day: 0, mealType: 'breakfast', name: 'Овсянка с ягодами', kcalPerPerson: 320 },
  { id: 'sm2', day: 0, mealType: 'lunch', name: 'Куриный суп', kcalPerPerson: 410 },
  { id: 'sm3', day: 0, mealType: 'dinner', name: 'Запечённая рыба с овощами', kcalPerPerson: 480 },
  { id: 'sm4', day: 1, mealType: 'breakfast', name: 'Греческий йогурт с мюсли', kcalPerPerson: 290 },
  { id: 'sm5', day: 1, mealType: 'lunch', name: 'Гречка с грибами', kcalPerPerson: 380 },
  { id: 'sm6', day: 1, mealType: 'dinner', name: 'Индейка с брокколи', kcalPerPerson: 460 },
  { id: 'sm7', day: 2, mealType: 'breakfast', name: 'Яичница с томатами', kcalPerPerson: 340 },
  { id: 'sm8', day: 2, mealType: 'lunch', name: 'Салат нисуаз', kcalPerPerson: 390 },
  { id: 'sm9', day: 2, mealType: 'dinner', name: 'Паста с овощами', kcalPerPerson: 510 },
  { id: 'sm10', day: 3, mealType: 'breakfast', name: 'Смузи-боул', kcalPerPerson: 300 },
  { id: 'sm11', day: 3, mealType: 'lunch', name: 'Чечевичный суп', kcalPerPerson: 370 },
  { id: 'sm12', day: 3, mealType: 'dinner', name: 'Стейк из лосося', kcalPerPerson: 520 },
  { id: 'sm13', day: 4, mealType: 'breakfast', name: 'Блины с творогом', kcalPerPerson: 360 },
  { id: 'sm14', day: 4, mealType: 'lunch', name: 'Борщ без мяса', kcalPerPerson: 350 },
  { id: 'sm15', day: 4, mealType: 'dinner', name: 'Курица карри', kcalPerPerson: 490 },
  { id: 'sm16', day: 5, mealType: 'breakfast', name: 'Тосты авокадо', kcalPerPerson: 330 },
  { id: 'sm17', day: 5, mealType: 'lunch', name: 'Боул с киноа', kcalPerPerson: 420 },
  { id: 'sm18', day: 5, mealType: 'dinner', name: 'Шашлык из овощей', kcalPerPerson: 440 },
  { id: 'sm19', day: 6, mealType: 'breakfast', name: 'Омлет с зеленью', kcalPerPerson: 310 },
  { id: 'sm20', day: 6, mealType: 'lunch', name: 'Пицца на тонком тесте', kcalPerPerson: 530 },
  { id: 'sm21', day: 6, mealType: 'dinner', name: 'Рыбные котлеты', kcalPerPerson: 470 },
];

const MOCK_SHOPPING: Array<{ category: string; items: Array<{ name: string; qty: number; unit: string }> }> = [
  {
    category: 'Белки',
    items: [
      { name: 'Куриная грудка', qty: 600, unit: 'г' },
      { name: 'Лосось', qty: 400, unit: 'г' },
      { name: 'Яйца', qty: 6, unit: 'шт' },
    ],
  },
  {
    category: 'Крупы',
    items: [
      { name: 'Гречка', qty: 250, unit: 'г' },
      { name: 'Овсянка', qty: 200, unit: 'г' },
      { name: 'Киноа', qty: 150, unit: 'г' },
    ],
  },
  {
    category: 'Овощи и зелень',
    items: [
      { name: 'Брокколи', qty: 400, unit: 'г' },
      { name: 'Томаты', qty: 500, unit: 'г' },
      { name: 'Авокадо', qty: 2, unit: 'шт' },
    ],
  },
  {
    category: 'Молочные',
    items: [
      { name: 'Греческий йогурт', qty: 500, unit: 'г' },
      { name: 'Творог', qty: 300, unit: 'г' },
    ],
  },
];

const DIETARY_FILTERS = ['Веган', 'Вегетарианство', 'Без глютена', 'Без лактозы', 'Высокий белок', 'Кето'];
const CUISINE_FILTERS = ['Русская', 'Средиземноморская', 'Азиатская', 'Мексиканская', 'Итальянская'];

const MOCK_RECIPES: ExploreRecipe[] = [
  { id: 'r1', title: 'Гречневые котлеты с грибами', cookTime: 35, calories: 340, tags: ['Вегетарианство', 'Без глютена'], cuisine: 'Русская' },
  { id: 'r2', title: 'Щи с квашеной капустой', cookTime: 50, calories: 290, tags: ['Без глютена'], cuisine: 'Русская' },
  { id: 'r3', title: 'Пельмени домашние', cookTime: 60, calories: 430, tags: ['Высокий белок'], cuisine: 'Русская' },
  { id: 'r4', title: 'Оливье с курицей', cookTime: 25, calories: 310, tags: ['Без глютена'], cuisine: 'Русская' },
  { id: 'r5', title: 'Блины с красной рыбой', cookTime: 30, calories: 390, tags: ['Высокий белок'], cuisine: 'Русская' },
  { id: 'r6', title: 'Паста с песто и томатами', cookTime: 20, calories: 480, tags: ['Вегетарианство'], cuisine: 'Итальянская' },
  { id: 'r7', title: 'Тайский суп том-ям', cookTime: 40, calories: 380, tags: ['Без глютена'], cuisine: 'Азиатская' },
  { id: 'r8', title: 'Говядина с овощами по-азиатски', cookTime: 30, calories: 520, tags: ['Высокий белок', 'Без глютена'], cuisine: 'Азиатская' },
  { id: 'r9', title: 'Манты с тыквой', cookTime: 55, calories: 360, tags: ['Вегетарианство'], cuisine: 'Средиземноморская' },
];

/* ─────────────────────────────────────────────
   Sub-tab: Group View
───────────────────────────────────────────── */

interface SearchResult {
  id: string;
  username: string;
  displayName: string;
}

function GroupView() {
  const [inviteValue, setInviteValue] = useState('');
  const [connections, setConnections] = useState<Connection[]>(MOCK_CONNECTIONS);
  const [inviteSent, setInviteSent] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConnections = connections.filter((c) => c.status === 'active');
  const pendingReceived = connections.filter((c) => c.status === 'pending_received');
  const pendingSent = connections.filter((c) => c.status === 'pending_sent');

  // Fetch search results when @ is typed
  useEffect(() => {
    const query = inviteValue.trim();

    // Only search if value starts with @ or looks like a username
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const isUsernameSearch = query.startsWith('@') || query.includes('@');

    if (!isUsernameSearch) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const searchQuery = query.replace(/^@/, '');
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);

    fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        setSearchResults(data.results || []);
        setShowSearchDropdown(data.results && data.results.length > 0);
      })
      .catch((err) => {
        console.error('Search error:', err);
        setSearchResults([]);
      })
      .finally(() => setIsSearching(false));
  }, [inviteValue]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectUser(user: SearchResult) {
    setInviteValue(`@${user.username}`);
    setShowSearchDropdown(false);
  }

  function handleSendInvite() {
    if (!inviteValue.trim()) return;
    setInviteSent(true);
    setInviteValue('');
    setSearchResults([]);
    setTimeout(() => setInviteSent(false), 3000);
  }

  function handleAccept(id: string) {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'active' } : c))
    );
  }

  function handleDecline(id: string) {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }

  function handleRemove(id: string) {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Invite panel */}
      <div className="rounded-xl border border-parchment-200 bg-parchment-50 p-4 sm:p-5">
        <h2 className="font-display text-base font-semibold text-bark-300 mb-1">
          Пригласить участника
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Введите имя пользователя или e-mail
        </p>
        <div className="flex gap-2 relative">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inviteValue}
              onChange={(e) => setInviteValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendInvite();
                if (e.key === 'Escape') setShowSearchDropdown(false);
              }}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchDropdown(true);
              }}
              placeholder="user@example.com или @username"
              className="w-full rounded-lg border border-parchment-200 bg-white px-3 py-2 text-sm text-bark-300 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent"
            />

            {/* @mention autocomplete dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-2 z-50 rounded-lg border border-parchment-200 bg-white shadow-lg overflow-hidden"
              >
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectUser(result)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-parchment-50 transition-colors border-b border-parchment-100 last:border-b-0"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-200 text-[10px] font-bold text-bark-300">
                      {(result.displayName || result.username)
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-bark-300 truncate">
                        {result.displayName || result.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{result.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSendInvite}
            className="flex items-center gap-1.5 rounded-lg bg-bark-300 px-4 py-2 text-sm font-medium text-white hover:bg-bark-400 active:scale-95 transition-all"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Пригласить</span>
          </button>
        </div>
        {inviteSent && (
          <p className="mt-2 text-xs text-sage-400 font-medium">
            Приглашение отправлено
          </p>
        )}
      </div>

      {/* Pending invites received */}
      {pendingReceived.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-sm font-semibold text-bark-300 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold">
              {pendingReceived.length}
            </span>
            Входящие приглашения
          </h2>
          {pendingReceived.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 group hover:border-amber-200 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar connection={c} />
                <Link
                  href={c.username ? `/dashboard/users/@${c.username}` : '#'}
                  className="min-w-0 hover:opacity-80 transition-opacity"
                >
                  <p className="text-sm font-medium text-bark-300 truncate">{c.displayName}</p>
                  {c.username && (
                    <p className="text-xs text-muted-foreground">@{c.username}</p>
                  )}
                </Link>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAccept(c.id)}
                  className="rounded-lg bg-sage-300 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-400 transition-colors"
                >
                  Принять
                </button>
                <button
                  onClick={() => handleDecline(c.id)}
                  className="rounded-lg border border-parchment-200 bg-white px-3 py-1.5 text-xs font-medium text-bark-200 hover:bg-parchment-100 transition-colors"
                >
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending sent */}
      {pendingSent.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-sm font-semibold text-bark-200">
            Ожидают ответа
          </h2>
          {pendingSent.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-parchment-200 bg-parchment-50 px-4 py-3 group hover:border-parchment-300 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar connection={c} />
                <Link
                  href={c.username ? `/dashboard/users/@${c.username}` : '#'}
                  className="min-w-0 hover:opacity-80 transition-opacity"
                >
                  <p className="text-sm text-bark-200 truncate">{c.displayName}</p>
                  {c.username && (
                    <p className="text-xs text-muted-foreground">@{c.username}</p>
                  )}
                </Link>
              </div>
              <span className="shrink-0 text-xs text-stone-400 bg-parchment-100 px-2 py-1 rounded-full">
                Ожидание
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Active group */}
      <div className="space-y-2">
        <h2 className="font-display text-sm font-semibold text-bark-300">
          Моя группа — {activeConnections.length} участника
        </h2>
        {activeConnections.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-8 w-8 text-parchment-300" />}
            title="Группа пуста"
            body="Пригласите людей, с которыми хотите планировать совместное питание."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeConnections.map((c) => (
              <ConnectionCard key={c.id} connection={c} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>

      {/* Group comments section */}
      <div className="rounded-xl border border-parchment-200 bg-white p-4 sm:p-5">
        <GroupCommentsSection />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-tab: Shared Meal Plan
───────────────────────────────────────────── */

function SharedPlanView() {
  const [headcount, setHeadcount] = useState(2);
  const [activeDay, setActiveDay] = useState<number | null>(null); // null = all days on desktop
  const [showBasket, setShowBasket] = useState(false);
  // Synced "bought" state — in Phase 4 this will be a real-time subscription
  const [boughtItems, setBoughtItems] = useState<Set<string>>(new Set());

  function toggleBought(itemName: string) {
    setBoughtItems((prev) => {
      const next = new Set(prev);
      next.has(itemName) ? next.delete(itemName) : next.add(itemName);
      return next;
    });
  }

  function incrementHeadcount() {
    setHeadcount((n) => Math.min(n + 1, 12));
  }
  function decrementHeadcount() {
    setHeadcount((n) => Math.max(n - 1, 1));
  }

  const visibleDays = activeDay !== null ? [activeDay] : DAY_LABELS.map((_, i) => i);

  return (
    <div className="space-y-5">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-parchment-200 bg-parchment-50 px-4 py-3">
        {/* Headcount selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-bark-300">Количество человек</span>
          <div className="flex items-center gap-1.5 rounded-lg border border-parchment-200 bg-white px-1 py-1">
            <button
              onClick={decrementHeadcount}
              disabled={headcount <= 1}
              className="flex h-7 w-7 items-center justify-center rounded text-bark-200 hover:bg-parchment-100 disabled:opacity-30 transition-colors"
              aria-label="Уменьшить"
            >
              <MinusIcon className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-sm font-semibold text-bark-300">
              {headcount >= 12 ? '12+' : headcount}
            </span>
            <button
              onClick={incrementHeadcount}
              disabled={headcount >= 12}
              className="flex h-7 w-7 items-center justify-center rounded text-bark-200 hover:bg-parchment-100 disabled:opacity-30 transition-colors"
              aria-label="Увеличить"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Shopping basket toggle */}
        <button
          onClick={() => setShowBasket((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            showBasket
              ? 'bg-bark-300 text-white'
              : 'border border-parchment-200 bg-white text-bark-200 hover:bg-parchment-100'
          )}
        >
          <CartIcon className="h-4 w-4" />
          Список покупок
        </button>
      </div>

      {/* Shopping basket (collapsible) */}
      {showBasket && (
        <div className="rounded-xl border border-sage-100 bg-sage-50 p-4 space-y-4">
          {/* Header with sync indicator */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-display text-sm font-semibold text-bark-300 flex items-center gap-2">
              <CartIcon className="h-4 w-4 text-sage-400" />
              Список покупок на {headcount} {pluralPerson(headcount)}
            </h3>
            <div className="flex items-center gap-3">
              {boughtItems.size > 0 && (
                <span className="text-xs text-stone-400">
                  {boughtItems.size} куплено
                </span>
              )}
              {/* Sync badge — indicates real-time shared state */}
              <span className="flex items-center gap-1 rounded-full bg-sage-100 border border-sage-200 px-2 py-0.5 text-[10px] font-medium text-sage-600">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-pulse" />
                Синхронизировано
              </span>
              <span className="text-xs text-muted-foreground">×{headcount}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {MOCK_SHOPPING.map((cat) => (
              <div key={cat.category}>
                <p className="text-xs font-semibold text-bark-200 uppercase tracking-wide mb-2">
                  {cat.category}
                </p>
                <ul className="space-y-1">
                  {cat.items.map((item) => {
                    const bought = boughtItems.has(item.name);
                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => toggleBought(item.name)}
                          className={cn(
                            'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors',
                            bought
                              ? 'bg-sage-100/60 border border-sage-100'
                              : 'bg-white border border-parchment-200 hover:border-sage-200'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Checkbox indicator */}
                            <span
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                bought
                                  ? 'bg-sage-400 border-sage-400 text-white'
                                  : 'border-parchment-300 bg-white'
                              )}
                            >
                              {bought && (
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <span
                              className={cn(
                                'text-sm transition-colors truncate',
                                bought ? 'text-stone-400 line-through' : 'text-bark-300'
                              )}
                            >
                              {item.name}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'text-sm font-medium tabular-nums shrink-0 transition-colors',
                              bought ? 'text-stone-400 line-through' : 'text-bark-300'
                            )}
                          >
                            {formatQty(item.qty * headcount, item.unit)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Clear bought items */}
          {boughtItems.size > 0 && (
            <button
              onClick={() => setBoughtItems(new Set())}
              className="text-xs text-stone-400 hover:text-bark-300 transition-colors underline underline-offset-2"
            >
              Сбросить отмеченные
            </button>
          )}
        </div>
      )}

      {/* Mobile day pill nav */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:hidden scrollbar-hide">
        {DAY_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveDay(activeDay === i ? null : i)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              activeDay === i
                ? 'bg-bark-300 text-white'
                : 'border border-parchment-200 bg-white text-bark-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Weekly grid */}
      <div className="space-y-4">
        {/* Desktop: all days visible as columns */}
        <div className="hidden sm:grid grid-cols-7 gap-2">
          {DAY_LABELS.map((label, dayIdx) => (
            <div key={dayIdx} className="space-y-1.5">
              <p className="text-center text-xs font-semibold text-bark-200 uppercase tracking-wide">
                {label}
              </p>
              {MEAL_TYPES.map((mt) => {
                const meal = MOCK_SHARED_MEALS.find(
                  (m) => m.day === dayIdx && m.mealType === mt
                );
                if (!meal) return <div key={mt} className="h-16 rounded-lg bg-parchment-50 border border-parchment-100" />;
                return (
                  <div
                    key={mt}
                    className={cn(
                      'rounded-lg border p-2 text-[11px] leading-tight',
                      MEAL_COLOR[mt]
                    )}
                  >
                    <p className={cn('font-semibold mb-0.5 uppercase tracking-wide text-[9px]', MEAL_ACCENT[mt])}>
                      {MEAL_LABEL[mt]}
                    </p>
                    <p className="text-bark-300 font-medium line-clamp-2">{meal.name}</p>
                    <p className="mt-1 text-stone-400">
                      {meal.kcalPerPerson * headcount} ккал
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Mobile: selected day(s) */}
        <div className="sm:hidden space-y-3">
          {(activeDay !== null ? [activeDay] : visibleDays).map((dayIdx) => (
            <div key={dayIdx} className="rounded-xl border border-parchment-200 bg-white overflow-hidden">
              <div className="px-4 py-2 bg-parchment-100 border-b border-parchment-200">
                <p className="text-xs font-semibold text-bark-300">{DAY_LABELS[dayIdx]}</p>
              </div>
              <div className="divide-y divide-parchment-100">
                {MEAL_TYPES.map((mt) => {
                  const meal = MOCK_SHARED_MEALS.find(
                    (m) => m.day === dayIdx && m.mealType === mt
                  );
                  return (
                    <div key={mt} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className={cn('text-[10px] font-semibold uppercase tracking-wide mb-0.5', MEAL_ACCENT[mt])}>
                          {MEAL_LABEL[mt]}
                        </p>
                        <p className="text-sm text-bark-300">
                          {meal ? meal.name : <span className="text-stone-400">—</span>}
                        </p>
                      </div>
                      {meal && (
                        <p className="text-xs text-stone-400 tabular-nums ml-4 shrink-0">
                          {meal.kcalPerPerson * headcount} ккал
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-tab: Recipe Explore
───────────────────────────────────────────── */

function RecipeExploreView() {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [maxCookTime, setMaxCookTime] = useState<number>(120);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  function toggleFilter(f: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  function handleAddToPlan(id: string) {
    setAddedIds((prev) => new Set(prev).add(id));
  }

  const filtered = MOCK_RECIPES.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilters.size > 0 && ![...activeFilters].every((f) => r.tags.includes(f))) return false;
    if (activeCuisine && r.cuisine !== activeCuisine) return false;
    if (r.cookTime > maxCookTime) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Source badge */}
      <div className="flex items-center gap-2 rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2">
        <span className="text-xs text-muted-foreground">Источник:</span>
        <span className="text-xs font-medium text-bark-300">Российские рецептурные базы</span>
        <span className="ml-auto text-[10px] text-stone-400">Обновлено сегодня</span>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск рецептов..."
          className="w-full rounded-lg border border-parchment-200 bg-white py-2.5 pl-9 pr-4 text-sm text-bark-300 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent"
        />
      </div>

      {/* Filter chips */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => toggleFilter(f)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                activeFilters.has(f)
                  ? 'bg-sage-300 text-white border-sage-300'
                  : 'bg-white border-parchment-200 text-bark-200 hover:border-sage-200 hover:text-bark-300'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CUISINE_FILTERS.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCuisine(activeCuisine === c ? null : c)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                activeCuisine === c
                  ? 'bg-bark-300 text-white border-bark-300'
                  : 'bg-white border-parchment-200 text-bark-200 hover:border-bark-200 hover:text-bark-300'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Max cook time slider */}
        <div className="flex items-center gap-3">
          <ClockIcon className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            До {maxCookTime === 120 ? '2+ ч' : `${maxCookTime} мин`}
          </span>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={maxCookTime}
            onChange={(e) => setMaxCookTime(Number(e.target.value))}
            className="flex-1 h-1.5 accent-sage-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-8 w-8 text-parchment-300" />}
          title="Рецепты не найдены"
          body="Попробуйте изменить фильтры или поисковый запрос."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              added={addedIds.has(r.id)}
              onAdd={handleAddToPlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Shared sub-components
───────────────────────────────────────────── */

function Avatar({ connection }: { connection: Connection }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-bark-300',
        connection.avatarColor
      )}
    >
      {connection.initials}
    </div>
  );
}

function DietaryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-sage-50 border border-sage-100 px-2 py-0.5 text-[10px] font-medium text-sage-600">
      {label}
    </span>
  );
}

function ConnectionCard({
  connection,
  onRemove,
}: {
  connection: Connection;
  onRemove: (id: string) => void;
}) {
  const profileUrl = connection.username ? `/dashboard/users/@${connection.username}` : '#';

  return (
    <div className="rounded-xl border border-parchment-200 bg-white p-4 flex items-center gap-3 group hover:border-sage-200 transition-colors">
      <Avatar connection={connection} />
      <Link
        href={profileUrl}
        className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <p className="text-sm font-semibold text-bark-300 truncate">{connection.displayName}</p>
        {connection.username && (
          <p className="text-xs text-muted-foreground mt-0.5">@{connection.username}</p>
        )}
        {!connection.username && (
          <p className="text-xs text-muted-foreground mt-0.5">Участник группы</p>
        )}
      </Link>
      <button
        onClick={() => onRemove(connection.id)}
        className="text-stone-300 hover:text-red-400 transition-colors p-1 rounded"
        aria-label="Удалить из группы"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function RecipeCard({
  recipe,
  added,
  onAdd,
}: {
  recipe: ExploreRecipe;
  added: boolean;
  onAdd: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-parchment-200 bg-white p-4 flex flex-col gap-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-bark-300 leading-snug">{recipe.title}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {recipe.cookTime} мин
          </span>
          <span className="flex items-center gap-1">
            <FireIcon className="h-3 w-3" />
            {recipe.calories} ккал
          </span>
          <span className="text-stone-400">{recipe.cuisine}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {recipe.tags.map((t) => (
            <DietaryChip key={t} label={t} />
          ))}
        </div>
      </div>
      <button
        onClick={() => onAdd(recipe.id)}
        disabled={added}
        className={cn(
          'w-full rounded-lg py-2 text-xs font-semibold transition-all',
          added
            ? 'bg-sage-50 text-sage-400 border border-sage-100 cursor-default'
            : 'bg-bark-300 text-white hover:bg-bark-400 active:scale-95'
        )}
      >
        {added ? '✓ Добавлено в план' : '+ В совместный план'}
      </button>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-parchment-200 bg-parchment-50 py-12 px-6 text-center">
      {icon}
      <p className="text-sm font-semibold text-bark-200">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{body}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function pluralPerson(n: number): string {
  if (n === 1) return 'человека';
  if (n >= 2 && n <= 4) return 'человека';
  return 'человек';
}

function formatQty(raw: number, unit: string): string {
  if (unit === 'шт') return `${Math.round(raw)} ${unit}`;
  if (raw >= 1000) return `${(raw / 1000).toFixed(1)} кг`;
  return `${Math.round(raw)} ${unit}`;
}

/* ─────────────────────────────────────────────
   Root component
───────────────────────────────────────────── */

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'group', label: 'Моя группа' },
  { key: 'plan', label: 'Совместный план' },
  { key: 'explore', label: 'Рецепты' },
];

export function SocialClient() {
  const [activeTab, setActiveTab] = useState<SubTab>('group');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-bark-300">Социальное</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Совместное планирование питания с группой
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 rounded-xl bg-parchment-100 border border-parchment-200 p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
              activeTab === t.key
                ? 'bg-white text-bark-300 shadow-sm'
                : 'text-bark-200 hover:text-bark-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'group' && <GroupView />}
      {activeTab === 'plan' && <SharedPlanView />}
      {activeTab === 'explore' && <RecipeExploreView />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Inline icons
───────────────────────────────────────────── */

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  );
}
