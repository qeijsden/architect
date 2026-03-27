-- Add seed, max_time_seconds, and completion_count to levels table
ALTER TABLE public.levels 
ADD COLUMN IF NOT EXISTS seed TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS max_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS completion_count INTEGER NOT NULL DEFAULT 0;

-- Add tutorial_completed to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT false;

-- Create function to generate unique seed
CREATE OR REPLACE FUNCTION public.generate_level_seed()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 8 character seed
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  NEW.seed := result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate seed on level creation
DROP TRIGGER IF EXISTS generate_level_seed_trigger ON public.levels;
CREATE TRIGGER generate_level_seed_trigger
BEFORE INSERT ON public.levels
FOR EACH ROW
WHEN (NEW.seed IS NULL)
EXECUTE FUNCTION public.generate_level_seed();

-- Create index on seed for fast lookups
CREATE INDEX IF NOT EXISTS idx_levels_seed ON public.levels(seed);

-- Delete all existing levels (user requested)
DELETE FROM public.level_likes;
DELETE FROM public.leaderboards;
DELETE FROM public.levels;