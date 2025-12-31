-- Supabase Content Schema for Unlock App
-- Run this in your Supabase SQL Editor AFTER running schema.sql

-- Cards table - stores all learning content
CREATE TABLE IF NOT EXISTS public.cards (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('codeforces', 'math', 'ai_primers')),
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  category TEXT,
  difficulty TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Graph edges table - stores relationships between cards
CREATE TABLE IF NOT EXISTS public.graph_edges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_card_id TEXT NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  to_card_id TEXT NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL CHECK (edge_type IN ('next', 'related', 'prerequisite', 'sibling')),
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_edge UNIQUE (from_card_id, to_card_id, edge_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_type ON public.cards(type);
CREATE INDEX IF NOT EXISTS idx_cards_category ON public.cards(category);
CREATE INDEX IF NOT EXISTS idx_cards_difficulty ON public.cards(difficulty);
CREATE INDEX IF NOT EXISTS idx_edges_from ON public.graph_edges(from_card_id);
CREATE INDEX IF NOT EXISTS idx_edges_to ON public.graph_edges(to_card_id);

-- Enable RLS (read-only for all, write for service role only)
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;

-- Everyone can read cards
CREATE POLICY "Cards are viewable by everyone" ON public.cards
  FOR SELECT USING (true);

-- Everyone can read edges
CREATE POLICY "Edges are viewable by everyone" ON public.graph_edges
  FOR SELECT USING (true);

-- Function to get random cards
CREATE OR REPLACE FUNCTION public.get_random_cards(
  p_limit INTEGER DEFAULT 50,
  p_type TEXT DEFAULT NULL
)
RETURNS SETOF public.cards AS $$
BEGIN
  IF p_type IS NOT NULL THEN
    RETURN QUERY
    SELECT * FROM public.cards
    WHERE type = p_type
    ORDER BY RANDOM()
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT * FROM public.cards
    ORDER BY RANDOM()
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get related cards via graph
CREATE OR REPLACE FUNCTION public.get_related_cards(
  p_card_id TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  card_id TEXT,
  edge_type TEXT,
  weight FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ge.to_card_id, ge.edge_type, ge.weight
  FROM public.graph_edges ge
  WHERE ge.from_card_id = p_card_id
  ORDER BY ge.weight DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

