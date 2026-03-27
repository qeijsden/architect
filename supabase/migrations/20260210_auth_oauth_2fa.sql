-- Add 2FA columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS two_fa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS two_fa_method text DEFAULT 'email',
ADD COLUMN IF NOT EXISTS two_fa_verified boolean DEFAULT false;

-- Create two_fa_codes table for email verification
CREATE TABLE IF NOT EXISTS public.two_fa_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  UNIQUE(user_id, code)
);

-- Enable RLS on two_fa_codes
ALTER TABLE public.two_fa_codes ENABLE ROW LEVEL SECURITY;

-- Policies for two_fa_codes
CREATE POLICY "Users can view their own 2FA codes" 
ON public.two_fa_codes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create 2FA codes" 
ON public.two_fa_codes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their 2FA codes" 
ON public.two_fa_codes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create 2FA sessions table to track active sessions
CREATE TABLE IF NOT EXISTS public.two_fa_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  verified boolean DEFAULT false
);

-- Enable RLS on two_fa_sessions
ALTER TABLE public.two_fa_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for two_fa_sessions
CREATE POLICY "Users can view their own 2FA sessions" 
ON public.two_fa_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create 2FA sessions" 
ON public.two_fa_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their 2FA sessions" 
ON public.two_fa_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Store OAuth provider info
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'email',
ADD COLUMN IF NOT EXISTS provider_id text,
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- Create index for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_profiles_provider_id ON public.profiles(provider, provider_id);
