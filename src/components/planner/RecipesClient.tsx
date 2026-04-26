'use client';

import { useState, useTransition } from 'react';
import {
  Search,
  Clock,
  Flame,
  Bookmark,
  BookmarkCheck,
  BookmarkX,
  Filter,
  CalendarDays,
} from 'lucide-react';
import type { RecipeSummary } from '@/app/dashboard/planner/actions';
import { saveRecipeToLibrary, unsaveRecipe } from '@/app/dashboard/planner/actions';
import { RecipeDetailModal } from './RecipeDetailModal';

interface SavedRecipeRow {
  recipe: RecipeSummary;
  saved_at: string;
}

interface RecipesClientProps {
  weeklyRecipes: RecipeSummary[];
  initialSavedRecipeIds: string[];
  savedRecipes: SavedRecipeRow[];
  isCatalogSource?: boolean;
  catalogWeekLabel?: string;
}

const ALL_TAGS = [
  'вегетарианское',
  'веганское',
  'без глютена',
  'без лактозы',
  'высокобелковое',
  'низкоуглеводное',
];

export function RecipesClient({
  weeklyRecipes,
  initialSavedRecipeIds,
  savedRecipes: initialSaved,
  isCatalogSource = false,
  catalogWeekLabel,
}: RecipesClientProps) {
  const [tab, setTab] = useState<'week' | 'saved'>('week');
  const [savedIds, setSavedIds] = useState(new Set(initialSavedRecipeIds));
  const [savedRecipes, setSavedRecipes] = useState(initialSaved);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRecipe, setModalRecipe] = useState<RecipeSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split('T')[0];

  function handleSaveToggle(recipeId: string, save: boolean) {
    startTransition(async () => {
      if (save) {
        await saveRecipeToLibrary(recipeId);
        setSavedIds((prev) => new Set([...prev, recipeId]));
      } else {
        await unsaveRecipe(recipeId);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
        setSavedRecipes((prev) => prev.filter((r) => r.recipe.id !== recipeId));
      }
    });
  }

  function openRecipe(recipe: RecipeSummary) {
    setModalRecipe(recipe);
    setModalOpen(true);
  }

  const filteredWeekly = weeklyRecipes.filter((r) => {
    const matchesQuery = !query || r.title.toLowerCase().includes(query.toLowerCase());
    const matchesTag = !activeTag || (r.dietary_tags ?? []).includes(activeTag);
    return matchesQuery && matchesTag;
  });

  const filteredSaved = savedRecipes.filter(({ recipe }) => {
    const matchesQuery = !query || recipe.title.toLowerCase().includes(query.toLowerCase());
    const matchesTag = !activeTag || (recipe.dietary_tags ?? []).includes(activeTag);
    return matchesQuery && matchesTag;
  });

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-parchment-100 border border-parchment-200 w-fit mb-6">
        <button
          onClick={() => setTab('week')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${
              tab === 'week'
                ? 'bg-bark-300 text-primary-foreground shadow-sm'
                : 'text-bark-200 hover:text-bark-300'
            }`}
        >
          <CalendarDays className="h-4 w-4" />
          Эта неделя
        </button>
        <button
          onClick={() => setTab('saved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${
              tab === 'saved'
                ? 'bg-bark-300 text-primary-foreground shadow-sm'
                : 'text-bark-200 hover:text-bark-300'
            }`}
        >
          <Bookmark className="h-4 w-4" />
          Избранное
          {savedRecipes.length > 0 && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === 'saved' ? 'bg-white/20 text-white' : 'bg-parchment-200 text-stone-500'
              }`}
            >
              {savedRecipes.length}
            </span>
          )}
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск рецептов…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-parchment-200 bg-parchment-50 text-sm text-bark-300
              placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-bark-100 focus:border-bark-100 transition"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-stone-400 shrink-0" />
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-2.5 py-1 text-2xs rounded-full border transition-colors
                ${
                  activeTag === tag
                    ? 'bg-sage-300 border-sage-300 text-white'
                    : 'border-parchment-200 text-stone-400 hover:border-sage-200 hover:text-sage-400'
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly tab content */}
      {tab === 'week' &&
        (weeklyRecipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-parchment-300 bg-parchment-50 p-10 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-parchment-300 mb-3" />
            <p className="font-display text-base font-semibold text-bark-200">
              Нет плана на эту неделю
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
              Создайте план питания в планировщике — рецепты появятся здесь автоматически.
            </p>
          </div>
        ) : filteredWeekly.length === 0 ? (
          <div className="rounded-xl border border-dashed border-parchment-300 bg-parchment-50 p-10 text-center">
            <p className="font-display text-base font-semibold text-bark-200">Ничего не найдено</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Попробуйте другой запрос или фильтр.
            </p>
          </div>
        ) : (
          <>
            {isCatalogSource && catalogWeekLabel && (
              <p className="mb-4 text-xs text-stone-400">
                Показаны блюда каталога —{' '}
                <span className="font-medium text-bark-200">{catalogWeekLabel}</span>
              </p>
            )}
            <RecipeGrid
              recipes={filteredWeekly}
              savedIds={savedIds}
              onOpen={isCatalogSource ? () => {} : openRecipe}
              onSaveToggle={handleSaveToggle}
              isPending={isPending}
              hideSaveButton={isCatalogSource}
            />
          </>
        ))}

      {/* Saved tab content */}
      {tab === 'saved' &&
        (savedRecipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-parchment-300 bg-parchment-50 p-10 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-parchment-300 mb-3" />
            <p className="font-display text-base font-semibold text-bark-200">Библиотека пуста</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
              Открывайте рецепты и нажимайте закладку, чтобы сохранить в избранное.
            </p>
          </div>
        ) : filteredSaved.length === 0 ? (
          <div className="rounded-xl border border-dashed border-parchment-300 bg-parchment-50 p-10 text-center">
            <p className="font-display text-base font-semibold text-bark-200">Ничего не найдено</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Попробуйте другой запрос или фильтр.
            </p>
          </div>
        ) : (
          <RecipeGrid
            recipes={filteredSaved.map((r) => r.recipe)}
            savedIds={savedIds}
            onOpen={openRecipe}
            onSaveToggle={handleSaveToggle}
            isPending={isPending}
            showUnsaveButton
          />
        ))}

      {/* Recipe detail modal */}
      <RecipeDetailModal
        recipe={modalRecipe}
        mealType="breakfast"
        date={today}
        isSaved={modalRecipe ? savedIds.has(modalRecipe.id) : false}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaveToggle={(recipeId, saved) => {
          if (saved) {
            setSavedIds((prev) => new Set([...prev, recipeId]));
          } else {
            setSavedIds((prev) => {
              const next = new Set(prev);
              next.delete(recipeId);
              return next;
            });
            setSavedRecipes((prev) => prev.filter((r) => r.recipe.id !== recipeId));
          }
        }}
        onLogged={() => {}}
      />
    </div>
  );
}

interface RecipeGridProps {
  recipes: RecipeSummary[];
  savedIds: Set<string>;
  onOpen: (recipe: RecipeSummary) => void;
  onSaveToggle: (recipeId: string, save: boolean) => void;
  isPending: boolean;
  showUnsaveButton?: boolean;
  hideSaveButton?: boolean;
}

function RecipeGrid({
  recipes,
  savedIds,
  onOpen,
  onSaveToggle,
  isPending,
  showUnsaveButton = false,
  hideSaveButton = false,
}: RecipeGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map((recipe) => {
        const isSaved = savedIds.has(recipe.id);
        return (
          <div
            key={recipe.id}
            className={`group relative rounded-2xl border border-parchment-200 bg-parchment-50 overflow-hidden
              hover:border-parchment-300 hover:shadow-warm-md transition-all ${hideSaveButton ? '' : 'cursor-pointer'}`}
            onClick={() => !hideSaveButton && onOpen(recipe)}
          >
            <div className="p-4">
              {recipe.dietary_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {recipe.dietary_tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-2xs rounded-full bg-sage-50 text-sage-400 border border-sage-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h3 className="font-display text-sm font-semibold text-bark-300 leading-snug mb-2 line-clamp-2">
                {recipe.title}
              </h3>

              <div className="flex items-center gap-3 text-2xs text-stone-400">
                {recipe.prep_time_min != null && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {recipe.prep_time_min} мин
                  </div>
                )}
                {recipe.calories_per_serving != null && (
                  <div className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-amber-400" />
                    {Math.round(recipe.calories_per_serving)} ккал
                  </div>
                )}
              </div>

              {recipe.protein_per_serving != null && (
                <div className="mt-2 flex items-center gap-2 text-2xs">
                  <span className="text-vital-400 font-medium">
                    Б {Math.round(recipe.protein_per_serving)}г
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-stone-400">
                    У {Math.round(recipe.carbs_per_serving ?? 0)}г
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-stone-400">
                    Ж {Math.round(recipe.fat_per_serving ?? 0)}г
                  </span>
                </div>
              )}
            </div>

            {/* Save / unsave button — hidden for catalog-source meals */}
            {!hideSaveButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveToggle(recipe.id, !isSaved);
                }}
                disabled={isPending}
                title={isSaved ? 'Убрать из избранного' : 'В избранное'}
                className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all
                  ${
                    showUnsaveButton
                      ? 'opacity-100 bg-parchment-100 text-stone-300 hover:bg-destructive/10 hover:text-destructive'
                      : isSaved
                        ? 'opacity-100 bg-sage-50 text-sage-400 border border-sage-200'
                        : 'opacity-0 group-hover:opacity-100 bg-parchment-100 text-stone-300 hover:bg-sage-50 hover:text-sage-400'
                  }`}
              >
                {showUnsaveButton ? (
                  <BookmarkX className="h-3.5 w-3.5" />
                ) : isSaved ? (
                  <BookmarkCheck className="h-3.5 w-3.5" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
