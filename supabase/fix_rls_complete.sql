-- Complete RLS fix - Run this entire script in Supabase SQL Editor
-- This will disable ALL RLS and grant full access for testing

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can create game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can update own game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can delete own game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can view all session players" ON session_players;
DROP POLICY IF EXISTS "Users can insert session players" ON session_players;
DROP POLICY IF EXISTS "Users can update own session players" ON session_players;
DROP POLICY IF EXISTS "Users can delete own session players" ON session_players;
DROP POLICY IF EXISTS "Enable read access for all users" ON game_sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON game_sessions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON game_sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON session_players;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON session_players;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON session_players;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON session_players;

-- Disable RLS on all tables
ALTER TABLE IF EXISTS game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS session_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaderboards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS level_likes DISABLE ROW LEVEL SECURITY;

-- Grant ALL permissions to anon role (for non-authenticated users)
GRANT ALL ON game_sessions TO anon;
GRANT ALL ON session_players TO anon;
GRANT ALL ON profiles TO anon;
GRANT ALL ON levels TO anon;
GRANT ALL ON friends TO anon;
GRANT ALL ON leaderboards TO anon;
GRANT ALL ON level_likes TO anon;

-- Grant ALL permissions to authenticated role
GRANT ALL ON game_sessions TO authenticated;
GRANT ALL ON session_players TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON levels TO authenticated;
GRANT ALL ON friends TO authenticated;
GRANT ALL ON leaderboards TO authenticated;
GRANT ALL ON level_likes TO authenticated;

-- Grant USAGE on sequences (needed for auto-incrementing IDs if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the changes
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
