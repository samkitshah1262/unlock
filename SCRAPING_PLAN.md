# Web Scraping Service Integration Plan

## Service Comparison

### Recommended: Firecrawl
**Pros:**
- ✅ Handles JavaScript rendering automatically
- ✅ Built-in IP rotation and proxy management
- ✅ Captcha detection and handling
- ✅ Clean markdown/HTML output
- ✅ Good API for Deno/TypeScript
- ✅ Free tier: 1,000 pages/month
- ✅ Paid: $20/month for 10,000 pages

**Cons:**
- ⚠️ Costs money at scale
- ⚠️ Third-party dependency

### Alternatives

1. **ScrapingBee** ($49/month for 25k requests)
   - Good proxy rotation
   - Captcha solving available
   - More expensive

2. **ScraperAPI** ($99/month for 100k requests)
   - Excellent success rate
   - Built-in captcha solving
   - Most expensive

3. **Bright Data** (Enterprise pricing)
   - Best for large scale
   - Overkill for this project

## Architecture

```
Edge Function
    ↓
Shared Scraper Service (firecrawl.ts)
    ↓
┌─────────────────────────────────────┐
│  Retry Logic (exponential backoff)  │
│  IP Rotation (automatic via API)    │
│  Captcha Detection                  │
│  Checkpoint System                  │
└─────────────────────────────────────┘
    ↓
Firecrawl API
    ↓
Clean Content
```

## Implementation Plan

### Phase 1: Shared Scraper Service
- Create `_shared/scraper.ts` with:
  - Firecrawl client wrapper
  - Retry logic with exponential backoff
  - Captcha detection
  - Checkpoint management
  - Notification system

### Phase 2: Database Schema Updates
- Add `scraping_jobs` table for checkpoint tracking
- Add `scraping_notifications` table for captcha alerts

### Phase 3: Notification System
- Email notifications (via Supabase Edge Function)
- Webhook support for Slack/Discord
- Database logging

### Phase 4: Update All Fetchers
- Replace direct `fetch()` with scraper service
- Add checkpoint resume logic

## Retry Policy

```typescript
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000,      // 1 second
  maxDelay: 60000,         // 60 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  captchaStatusCodes: [403, 401]
}
```

## Captcha Detection

Firecrawl returns specific error codes:
- `CAPTCHA_REQUIRED`: Manual intervention needed
- `BLOCKED`: IP blocked, needs rotation
- `RATE_LIMITED`: Too many requests

## Checkpoint System

Store progress in `scraping_jobs`:
- Source name
- Current URL being processed
- List of completed URLs
- List of failed URLs
- Status: `running`, `paused_captcha`, `completed`, `failed`
- Last updated timestamp


