-- Fix user_id column to accept Clerk user IDs (strings, not UUIDs)
ALTER TABLE public.profiles
DROP CONSTRAINT profiles_user_id_unique;

ALTER TABLE public.profiles
ALTER COLUMN user_id SET DATA TYPE TEXT USING user_id::text;

ALTER TABLE public.profiles
ADD UNIQUE(user_id);
