-- Content Aggregator - Database Schema
-- Simple content-only schema with multi-source support

-- Table 1: Content sources configuration
CREATE TABLE content_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'api', 'scrape'
  endpoint TEXT,
  update_frequency VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'
  enabled BOOLEAN DEFAULT true,
  last_fetched TIMESTAMP,
  config JSONB DEFAULT '{}'::jsonb
);

-- Table 2: Content cards (normalized, ready to display)
CREATE TABLE content_cards (
  id BIGSERIAL PRIMARY KEY,
  
  -- Content type
  type VARCHAR(50) NOT NULL, -- 'problem', 'tech_article', 'finance_article', 'book_summary'
  
  -- Core content
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  
  -- Media
  image_url TEXT,
  image_alt TEXT,
  
  -- Metadata
  source_name VARCHAR(50),
  source_url TEXT,
  author VARCHAR(255),
  published_at TIMESTAMP,
  tags TEXT[] DEFAULT '{}',
  read_time_minutes INTEGER DEFAULT 5,
  
  -- Original data
  raw_data JSONB,
  
  -- Status
  active BOOLEAN DEFAULT true,
  quality_score INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Table 3: Content pool (for randomization)
CREATE TABLE content_pool (
  id BIGSERIAL PRIMARY KEY,
  content_id BIGINT REFERENCES content_cards(id) ON DELETE CASCADE,
  weight INTEGER DEFAULT 1,
  times_served INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  added_at TIMESTAMP DEFAULT NOW()
);

-- Table 4: User sessions (minimal tracking)
CREATE TABLE user_sessions (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  started_at TIMESTAMP DEFAULT NOW(),
  cards_viewed INTEGER DEFAULT 0
);

-- Table 5: Content views (track what user saw)
CREATE TABLE content_views (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  content_id BIGINT REFERENCES content_cards(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, content_id)
);

-- Indexes
CREATE INDEX idx_content_cards_type ON content_cards(type);
CREATE INDEX idx_content_cards_active ON content_cards(active);
CREATE INDEX idx_content_pool_active ON content_pool(active);
CREATE INDEX idx_content_views_session ON content_views(session_id);

-- Insert default sources
INSERT INTO content_sources (name, type, endpoint, update_frequency, config) VALUES
  ('codeforces', 'api', 'https://codeforces.com/api/problemset.problems', 'daily', '{"rating_offset": 200}'),
  ('hackernews', 'api', 'https://hacker-news.firebaseio.com/v0', 'hourly', '{"min_score": 100}'),
  ('investopedia', 'scrape', 'https://www.investopedia.com', 'hourly', '{"sections": ["news", "markets"]}'),
  ('book_summaries', 'scrape', 'https://fourminutebooks.com', 'weekly', '{}');
