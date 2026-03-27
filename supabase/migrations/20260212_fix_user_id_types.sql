-- Fix user_id and host_id columns to support Clerk string IDs instead of UUIDs

-- Drop existing foreign key constraints if any
ALTER TABLE public.game_sessions 
  DROP CONSTRAINT IF EXISTS game_sessions_host_id_fkey;

ALTER TABLE public.session_players 
  DROP CONSTRAINT IF EXISTS session_players_user_id_fkey;

-- Change game_sessions.host_id from UUID to TEXT
ALTER TABLE public.game_sessions 
  ALTER COLUMN host_id TYPE TEXT USING host_id::TEXT;

-- Change session_players.user_id from UUID to TEXT
ALTER TABLE public.session_players 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Change profiles.user_id from UUID to TEXT (if not already changed)
ALTER TABLE public.profiles 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Change friends table user_id and friend_id columns
ALTER TABLE public.friends 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.friends 
  ALTER COLUMN friend_id TYPE TEXT USING friend_id::TEXT;

-- Change leaderboards.user_id from UUID to TEXT
ALTER TABLE public.leaderboards 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Change levels.author_id from UUID to TEXT
ALTER TABLE public.levels 
  ALTER COLUMN author_id TYPE TEXT USING author_id::TEXT;
