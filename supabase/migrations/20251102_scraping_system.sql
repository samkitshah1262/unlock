-- Scraping System: Jobs, Checkpoints, and Notifications

-- Table 1: Scraping Jobs (for checkpoint/resume)
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name VARCHAR(50) NOT NULL,
  urls TEXT[] NOT NULL,
  current_url TEXT,
  completed_urls TEXT[] DEFAULT '{}',
  failed_urls JSONB DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- running, paused_captcha, paused_blocked, completed, failed
  pause_reason VARCHAR(20), -- CAPTCHA, BLOCKED
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Table 2: Scraping Notifications (for captcha/blocking alerts)
CREATE TABLE scraping_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  error_type VARCHAR(20) NOT NULL, -- CAPTCHA, BLOCKED, RATE_LIMITED
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scraping_jobs_source ON scraping_jobs(source_name);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX idx_scraping_notifications_resolved ON scraping_notifications(resolved);
CREATE INDEX idx_scraping_notifications_source ON scraping_notifications(source_name);

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_scraping_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scraping_jobs_timestamp
  BEFORE UPDATE ON scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_job_timestamp();


