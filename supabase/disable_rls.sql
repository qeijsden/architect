-- Disable RLS on all tables to allow testing
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards DISABLE ROW LEVEL SECURITY;
ALTER TABLE level_likes DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view all game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can create game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can update own game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can view all session players" ON session_players;
DROP POLICY IF EXISTS "Users can insert session players" ON session_players;
DROP POLICY IF EXISTS "Users can update own session players" ON session_players;
DROP POLICY IF EXISTS "Users can delete own session players" ON session_players;

-- Grant full access to authenticated users
GRANT ALL ON game_sessions TO authenticated;
GRANT ALL ON session_players TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON levels TO authenticated;
GRANT ALL ON friends TO authenticated;
GRANT ALL ON leaderboards TO authenticated;
GRANT ALL ON level_likes TO authenticated;

-- Grant full access to anon users (for testing)
GRANT ALL ON game_sessions TO anon;
GRANT ALL ON session_players TO anon;
GRANT ALL ON profiles TO anon;
GRANT ALL ON levels TO anon;
GRANT ALL ON friends TO anon;
GRANT ALL ON leaderboards TO anon;
GRANT ALL ON level_likes TO anon;
