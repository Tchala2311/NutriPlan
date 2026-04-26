/**
 * POST /api/ai/chat/messages
 * Save message to a chat session
 * Body: { session_id: string, role: "user" | "assistant", text: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { session_id, role, text } = body as {
    session_id?: string;
    role?: string;
    text?: string;
  };

  // Validate inputs
  if (!session_id || !role || !text) {
    return NextResponse.json({ error: 'Missing session_id, role, or text' }, { status: 400 });
  }

  if (!['user', 'assistant'].includes(role)) {
    return NextResponse.json({ error: "role must be 'user' or 'assistant'" }, { status: 400 });
  }

  // Verify user owns the session
  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 });
  }

  // Insert message
  const { data: message, error: insertError } = await supabase
    .from('chat_messages')
    .insert([
      {
        session_id,
        role,
        text,
      },
    ])
    .select('id, role, text, created_at')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update session's updated_at timestamp
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', session_id);

  return NextResponse.json({ message });
}
