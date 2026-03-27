-- Add hammers currency system to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hammers integer NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS last_hammer_recharge timestamp with time zone DEFAULT now();

-- Add import permission and report data to levels
ALTER TABLE public.levels
ADD COLUMN IF NOT EXISTS allow_import boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS track_url text;

-- Create level_reports table for reporting levels
CREATE TABLE public.level_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id uuid NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.level_reports ENABLE ROW LEVEL SECURITY;

-- Policies for level_reports
CREATE POLICY "Anyone can view reports" 
ON public.level_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create reports" 
ON public.level_reports 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

-- Create favorites table
CREATE TABLE public.level_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id uuid NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(level_id, user_id)
);

-- Enable RLS
ALTER TABLE public.level_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for favorites
CREATE POLICY "Favorites are viewable by owner" 
ON public.level_favorites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" 
ON public.level_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" 
ON public.level_favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create user_level_plays table to track which levels users have played
CREATE TABLE public.user_level_plays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id uuid NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(level_id, user_id)
);

-- Enable RLS
ALTER TABLE public.user_level_plays ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Plays are viewable by everyone" 
ON public.user_level_plays 
FOR SELECT 
USING (true);

CREATE POLICY "Users can record plays" 
ON public.user_level_plays 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their plays" 
ON public.user_level_plays 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create feature_requests table
CREATE TABLE public.feature_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  request_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create requests" 
ON public.feature_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Requests viewable by owner" 
ON public.feature_requests 
FOR SELECT 
USING (auth.uid() = user_id);