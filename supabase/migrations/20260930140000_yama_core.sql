-- YAMA core: memories, wishlist and mood history
-- Every row belongs to the authenticated user who created it.

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'Personnel',
  created_at timestamptz not null default now(),
  is_favorite boolean not null default false,
  is_retained_in_ai_memory boolean not null default false
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Personnel',
  notes text not null default '',
  created_at timestamptz not null default now(),
  is_completed boolean not null default false,
  is_shared_with_ai boolean not null default false
);

create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists memories_user_id_created_at_idx
  on public.memories(user_id, created_at desc);
create index if not exists wishlist_items_user_id_created_at_idx
  on public.wishlist_items(user_id, created_at desc);
create index if not exists mood_entries_user_id_created_at_idx
  on public.mood_entries(user_id, created_at desc);

alter table public.memories enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.mood_entries enable row level security;

drop policy if exists "Users can read their memories" on public.memories;
create policy "Users can read their memories"
  on public.memories for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their memories" on public.memories;
create policy "Users can create their memories"
  on public.memories for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their memories" on public.memories;
create policy "Users can update their memories"
  on public.memories for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their memories" on public.memories;
create policy "Users can delete their memories"
  on public.memories for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their wishlist" on public.wishlist_items;
create policy "Users can read their wishlist"
  on public.wishlist_items for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their wishlist" on public.wishlist_items;
create policy "Users can create their wishlist"
  on public.wishlist_items for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their wishlist" on public.wishlist_items;
create policy "Users can update their wishlist"
  on public.wishlist_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their wishlist" on public.wishlist_items;
create policy "Users can delete their wishlist"
  on public.wishlist_items for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their mood history" on public.mood_entries;
create policy "Users can read their mood history"
  on public.mood_entries for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their mood history" on public.mood_entries;
create policy "Users can create their mood history"
  on public.mood_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their mood history" on public.mood_entries;
create policy "Users can update their mood history"
  on public.mood_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their mood history" on public.mood_entries;
create policy "Users can delete their mood history"
  on public.mood_entries for delete
  to authenticated
  using (auth.uid() = user_id);


-- Daily tasks: a practical personal organizer for YAMA.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  created_at timestamptz not null default now(),
  is_completed boolean not null default false
);

create index if not exists tasks_user_id_completed_created_at_idx
  on public.tasks(user_id, is_completed, created_at desc);

alter table public.tasks enable row level security;

drop policy if exists "Users can read their tasks" on public.tasks;
create policy "Users can read their tasks"
  on public.tasks for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their tasks" on public.tasks;
create policy "Users can create their tasks"
  on public.tasks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their tasks" on public.tasks;
create policy "Users can update their tasks"
  on public.tasks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their tasks" on public.tasks;
create policy "Users can delete their tasks"
  on public.tasks for delete
  to authenticated
  using (auth.uid() = user_id);
