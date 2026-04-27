'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RecipePreviewCard } from './RecipePreviewCard';
import { extractUrls, isRecipeUrl } from '@/lib/url-utils';

interface Comment {
  id: string;
  author: string;
  authorInitials: string;
  avatarColor: string;
  text: string;
  timestamp: Date;
}

export function GroupCommentsSection() {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      author: 'Анна Петрова',
      authorInitials: 'АП',
      avatarColor: 'bg-sage-200',
      text: 'Нашла отличный рецепт паста! https://example.com/pasta-recipe',
      timestamp: new Date(Date.now() - 2 * 60000),
    },
  ]);
  const [input, setInput] = useState('');

  function handleSendComment() {
    if (!input.trim()) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      author: 'Вы',
      authorInitials: 'ВЫ',
      avatarColor: 'bg-bark-300',
      text: input,
      timestamp: new Date(),
    };

    setComments((prev) => [...prev, newComment]);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-sm font-semibold text-bark-300">
        Обсуждение группы
      </h3>

      {/* Comments list */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ChatBubbleIcon className="h-8 w-8 text-parchment-300 mb-2" />
            <p className="text-xs text-muted-foreground">
              Начните обсуждение с группой
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* Avatar */}
              <div
                className={cn(
                  'h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-bark-300',
                  comment.avatarColor
                )}
              >
                {comment.authorInitials}
              </div>

              {/* Comment bubble */}
              <div className="flex-1 min-w-0">
                <div className="rounded-lg bg-parchment-50 border border-parchment-200 px-3 py-2">
                  <p className="text-xs font-semibold text-bark-300">
                    {comment.author}
                  </p>
                  <div className="text-sm text-bark-300 mt-1 space-y-2 break-words">
                    {/* Render comment text with embedded previews */}
                    <CommentContent text={comment.text} />
                  </div>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  {formatTime(comment.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Поделитесь рецептом или идеей..."
          rows={2}
          className="flex-1 rounded-lg border border-parchment-200 bg-white px-3 py-2 text-sm text-bark-300 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent resize-none"
        />
        <button
          onClick={handleSendComment}
          disabled={!input.trim()}
          className="flex items-center justify-center rounded-lg bg-bark-300 px-4 py-2 text-sm font-medium text-white hover:bg-bark-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Отправить"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CommentContent({ text }: { text: string }) {
  const urls = extractUrls(text);
  const recipeUrls = urls.filter(isRecipeUrl);

  // If no recipe URLs, just show text
  if (recipeUrls.length === 0) {
    return <p>{text}</p>;
  }

  // Split text and render with previews
  let displayText = text;
  recipeUrls.forEach((url) => {
    displayText = displayText.replace(url, '');
  });

  return (
    <>
      {displayText.trim() && <p>{displayText.trim()}</p>}
      {recipeUrls.map((url) => (
        <RecipePreviewCard key={url} url={url} className="w-full mt-2" />
      ))}
    </>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'сейчас';
  if (diffMins < 60) return `${diffMins} мин назад`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} д назад`;
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25c4.97 0 9-1.804 9-4.02V6.756c0-2.215-4.03-4.02-9-4.02s-9 1.805-9 4.02v9.494m0-9.494c0 2.215 4.03 4.02 9 4.02m0-9.494v9.494m0 0v3.494m0-3.494h9m-9 3.494h-9"
      />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}
