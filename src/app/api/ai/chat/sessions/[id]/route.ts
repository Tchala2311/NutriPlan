/**
 * GET /api/ai/chat/sessions/[id]
 * Load single chat session with all messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const sessionId = id;

  // Verify user owns this session
  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id, created_at, updated_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Load messages for this session
  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('id, role, text, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  return NextResponse.json({ session, messages });
}
