-- Supabase Database Schema for Unlock App
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User journey history (tracks every card view)
CREATE TABLE IF NOT EXISTS public.user_journeys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id TEXT NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('codeforces', 'math', 'ai_primers')),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Index for faster queries
  CONSTRAINT unique_user_card_time UNIQUE (user_id, card_id, viewed_at)
);

-- User progress summary
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_cards_explored INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  domains_explored JSONB DEFAULT '{"math": 0, "codeforces": 0, "ai_primers": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journeys_user_id ON public.user_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_journeys_card_id ON public.user_journeys(card_id);
CREATE INDEX IF NOT EXISTS idx_journeys_viewed_at ON public.user_journeys(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.user_progress(user_id);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own journeys" ON public.user_journeys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journeys" ON public.user_journeys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update progress summary
CREATE OR REPLACE FUNCTION public.update_user_progress_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_progress
  SET 
    total_cards_explored = (
      SELECT COUNT(DISTINCT card_id) 
      FROM public.user_journeys 
      WHERE user_id = NEW.user_id
    ),
    total_time_minutes = (
      SELECT COALESCE(SUM(time_spent_seconds) / 60, 0)
      FROM public.user_journeys
      WHERE user_id = NEW.user_id
    ),
    domains_explored = (
      SELECT jsonb_build_object(
        'math', COUNT(*) FILTER (WHERE card_type = 'math'),
        'codeforces', COUNT(*) FILTER (WHERE card_type = 'codeforces'),
        'ai_primers', COUNT(*) FILTER (WHERE card_type = 'ai_primers')
      )
      FROM public.user_journeys
      WHERE user_id = NEW.user_id
    ),
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update progress
DROP TRIGGER IF EXISTS on_journey_created ON public.user_journeys;
CREATE TRIGGER on_journey_created
  AFTER INSERT ON public.user_journeys
  FOR EACH ROW EXECUTE FUNCTION public.update_user_progress_summary();

