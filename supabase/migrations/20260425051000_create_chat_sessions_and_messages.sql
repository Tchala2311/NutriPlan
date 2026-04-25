-- TES-119: Chat history persistence
-- Stores conversation sessions and messages for each user

create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  created_at timestamp with time zone default now()
);

-- Indexes for fast lookup
create index chat_messages_session on chat_messages(session_id);
create index chat_sessions_user_updated on chat_sessions(user_id, updated_at desc);

-- RLS: users can only see their own sessions
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

create policy "users_own_sessions" on chat_sessions
  for select using (auth.uid() = user_id);

create policy "users_own_messages" on chat_messages
  for select using (
    session_id in (select id from chat_sessions where user_id = auth.uid())
  );

create policy "users_insert_messages" on chat_messages
  for insert with check (
    session_id in (select id from chat_sessions where user_id = auth.uid())
  );

create policy "users_create_sessions" on chat_sessions
  for insert with check (auth.uid() = user_id);
