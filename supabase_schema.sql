-- Create the scores table
create table public.scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  username text,
  game_id text not null,
  score int not null,
  created_at timestamptz default now(),
  
  -- Ensure one score entry per user per game
  unique(user_id, game_id)
);

-- Enable Row Level Security
alter table public.scores enable row level security;

-- Policy: Allow anyone to read scores (for global leaderboards)
create policy "Public scores are viewable by everyone"
  on public.scores for select
  using ( true );

-- Policy: Allow users to insert their own scores
create policy "Users can insert their own scores"
  on public.scores for insert
  with check ( auth.uid() = user_id );

-- Policy: Allow users to update their own scores
create policy "Users can update their own scores"
  on public.scores for update
  using ( auth.uid() = user_id );
