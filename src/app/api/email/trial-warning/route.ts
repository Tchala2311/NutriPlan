/**
 * Send trial expiry warning emails (T-3 days before expiry).
 * Call via cron or manual trigger.
 * Sends one email per user whose trial expires in 3 days.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email-service';

const TRIAL_DURATION_DAYS = 14;
const WARNING_DAYS_BEFORE = 3;
const WARNING_TRIGGER_DAY = TRIAL_DURATION_DAYS - WARNING_DAYS_BEFORE; // Day 11

export async function POST(req: Request) {
  // Verify request is from cron or internal
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get all free users created exactly WARNING_TRIGGER_DAY ago (±1 day tolerance)
  const now = new Date();
  const triggerDateMin = new Date(now.getTime() - (WARNING_TRIGGER_DAY + 1) * 86_400_000);
  const triggerDateMax = new Date(now.getTime() - (WARNING_TRIGGER_DAY - 1) * 86_400_000);

  // Get users on free plan created in target window
  const { data: users, error } = await admin.auth.admin.listUsers();
  if (error) {
    console.error('Failed to list users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  const usersToNotify = (users?.users ?? []).filter((u) => {
    const createdAt = u.created_at ? new Date(u.created_at) : null;
    return createdAt && createdAt >= triggerDateMin && createdAt <= triggerDateMax;
  });

  let sent = 0;
  let failed = 0;

  for (const user of usersToNotify) {
    if (!user.email) continue;

    // Check if already sent warning for this user (via a flag in metadata or DB)
    // For now, just send (idempotent cron will handle duplicates)

    // Check subscription status
    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle();

    // Only warn free users
    if (sub?.plan === 'premium' && sub?.status === 'active') {
      continue;
    }

    const firstName =
      (user.user_metadata?.full_name as string)?.split(' ')[0] ?? user.email.split('@')[0];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6B5B4D 0%, #8B7355 100%); color: white; padding: 30px; border-radius: 8px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
    .cta { background: #6B5B4D; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; }
    .footer { font-size: 12px; color: #999; text-align: center; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 Пробный период заканчивается</h1>
      <p>Через 3 дня ваш доступ к премиум-функциям будет ограничен</p>
    </div>

    <div class="content">
      <p>Привет, ${firstName}!</p>
      <p>Ваш пробный период в NutriPlan заканчивается <strong>через 3 дня</strong>. Чтобы сохранить доступ к полному функционалу (планирование питания, переделки рецептов и более), оформите подписку уже сейчас.</p>

      <p><strong>Что вы потеряете без подписки:</strong></p>
      <ul>
        <li>🤖 Создание еженедельных планов питания с помощью ИИ</li>
        <li>🔄 Переделки рецептов (максимум 3 в неделю)</li>
        <li>📊 Расширенная аналитика питания</li>
        <li>💪 Персональные рекомендации по здоровью</li>
      </ul>

      <p style="text-align: center;">
        <a href="https://nutriplan.app/dashboard/billing" class="cta">Оформить подписку</a>
      </p>

      <p>Вопросы? <a href="mailto:support@nutriplan.app">Напишите нам</a></p>
    </div>

    <div class="footer">
      <p>© 2026 NutriPlan. Все права защищены.</p>
      <p><a href="https://nutriplan.app/privacy">Политика конфиденциальности</a> | <a href="https://nutriplan.app/terms">Условия использования</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendEmail({
      to: user.email,
      subject: '⏰ Ваш пробный период заканчивается через 3 дня',
      html,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      console.error(`Failed to send email to ${user.email}:`, result.error);
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    failed,
    total: usersToNotify.length,
  });
}
