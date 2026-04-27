'use client';

import { useState, useEffect, useRef } from 'react';

const EMOJIS = ['👍', '🔥', '🤢', '❤️'];

interface Reaction {
  meal_date: string;
  meal_type: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

interface MealReactionsProps {
  meal_plan_id: string;
  meal_date: string;
  meal_type: string;
  shared_plan_token: string;
  user_id: string;
  reactions: Reaction[];
  onReactionsUpdate?: (reactions: Reaction[]) => void;
}

export function MealReactions({
  meal_plan_id,
  meal_date,
  meal_type,
  shared_plan_token,
  user_id,
  reactions: initialReactions,
  onReactionsUpdate,
}: MealReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [loading, setLoading] = useState(false);
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Filter reactions for this specific meal
  const mealReactions = reactions.filter(
    (r) => r.meal_date === meal_date && r.meal_type === meal_type
  );

  // Group reactions by emoji
  const reactionCounts: Record<string, string[]> = {};
  mealReactions.forEach((r) => {
    if (!reactionCounts[r.emoji]) {
      reactionCounts[r.emoji] = [];
    }
    reactionCounts[r.emoji].push(r.user_id);
  });

  // Check if current user has reacted with each emoji
  const userReactions = new Set(
    mealReactions.filter((r) => r.user_id === user_id).map((r) => r.emoji)
  );

  const toggleReaction = async (emoji: string) => {
    setLoading(true);
    try {
      const hasReacted = userReactions.has(emoji);

      if (hasReacted) {
        // Remove reaction
        const res = await fetch('/api/meal-reactions/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shared_plan_token,
            meal_plan_id,
            meal_date,
            meal_type,
            emoji,
            user_id,
          }),
        });

        if (res.ok) {
          setReactions((prev) =>
            prev.filter(
              (r) =>
                !(
                  r.meal_date === meal_date &&
                  r.meal_type === meal_type &&
                  r.emoji === emoji &&
                  r.user_id === user_id
                )
            )
          );
        }
      } else {
        // Add reaction
        const res = await fetch('/api/meal-reactions/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shared_plan_token,
            meal_plan_id,
            meal_date,
            meal_type,
            emoji,
            user_id,
          }),
        });

        if (res.ok) {
          const newReaction: Reaction = {
            meal_date,
            meal_type,
            emoji,
            user_id,
            created_at: new Date().toISOString(),
          };
          setReactions((prev) => [...prev, newReaction]);
        }
      }
    } catch (e) {
      console.error('Reaction toggle failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
      {EMOJIS.map((emoji) => {
        const count = reactionCounts[emoji]?.length ?? 0;
        const isSelected = userReactions.has(emoji);

        return (
          <div key={emoji} className="relative">
            <button
              onClick={() => toggleReaction(emoji)}
              disabled={loading}
              onMouseEnter={() => count > 0 && setHoveredEmoji(emoji)}
              onMouseLeave={() => setHoveredEmoji(null)}
              className={`
                text-sm px-2 py-0.5 rounded-full transition-all
                ${
                  isSelected
                    ? 'bg-sage-200 border-sage-300'
                    : count > 0
                      ? 'bg-parchment-100 border-parchment-200 hover:bg-parchment-200'
                      : 'hover:bg-parchment-100 border-transparent'
                }
                border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1
              `}
            >
              <span>{emoji}</span>
              {count > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground">{count}</span>
              )}
            </button>

            {/* Tooltip: who reacted */}
            {hoveredEmoji === emoji && count > 0 && (
              <div
                ref={tooltipRef}
                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-bark-400 text-cream-100 text-[10px] rounded whitespace-nowrap z-50 pointer-events-none"
              >
                {count} {count === 1 ? 'реакция' : 'реакций'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
