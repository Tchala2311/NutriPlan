'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { recordMealRedo } from '@/app/dashboard/planner/actions';

interface MealRedoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekNumber: number;
  mealType: string;
  date: string;
  redoType: 'individual' | 'daily' | 'weekly';
  onSuccess: () => void;
}

const REDO_TYPE_LABEL: Record<string, string> = {
  individual: 'Переделать приём пищи',
  daily: 'Переделать день',
  weekly: 'Переделать неделю',
};

export function MealRedoModal({
  open,
  onOpenChange,
  weekNumber,
  mealType,
  date,
  redoType,
  onSuccess,
}: MealRedoModalProps) {
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await recordMealRedo(weekNumber, redoType, date, reason, mealType);

      if (!result.success) {
        if (result.trialExpired) {
          setError('Пробный период закончился. Оформите подписку, чтобы продолжить.');
        } else {
          setError('Не удалось переделать приём пищи. Попробуйте позже.');
        }
        return;
      }

      if (result.requiresPayment) {
        setError(
          `Вы использовали 3 бесплатных переделки за неделю. Следующая переделка будет стоить ${result.paymentAmount} ₽.`
        );
        // In a real app, trigger payment here
        return;
      }

      // Success
      setReason('');
      onOpenChange(false);
      onSuccess();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-lg font-bold text-bark-300">
                {REDO_TYPE_LABEL[redoType]}
              </Dialog.Title>
              <p className="text-sm text-stone-400 mt-1">
                Расскажите, почему вы хотите переделать{' '}
                {redoType === 'individual'
                  ? 'приём пищи'
                  : redoType === 'daily'
                    ? 'день'
                    : 'неделю'}
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-stone-400 hover:text-bark-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-bark-300 mb-2">
                Причина переделки
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Например: Изменился график, хочу другой вариант..."
                className="w-full px-3 py-2 border border-parchment-200 rounded-lg text-sm text-bark-300 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent resize-none"
                rows={3}
                disabled={isPending}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-vital-50 border border-vital-100">
                <AlertCircle className="h-5 w-5 text-vital-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-vital-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-lg border border-parchment-200 text-bark-300 font-medium text-sm hover:bg-parchment-50 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isPending || !reason.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-sage-400 text-white font-medium text-sm hover:bg-sage-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Обработка...' : 'Переделать'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
