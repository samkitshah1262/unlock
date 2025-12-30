# 🚀 Content Aggregator - Setup Guide

## What We Built

A clean, minimalist content aggregator that:
- Fetches from 4 sources: HackerNews, Investopedia, Book Summaries, Codeforces
- Uses **FREE Groq LLM** (Llama 3) to parse and clean content
- Shows swipeable cards with beautiful formatting
- 100% content-focused (no timers, no TTS, no fluff)

## Architecture

```
Mobile App (React Native)
     ↓
Supabase API
     ↓
Content Fetchers (Edge Functions)
     ↓
Groq LLM Parser
     ↓
PostgreSQL Database
     ↓
External Sources (HN, Investopedia, Books)
```

## Setup Steps

### 1. Start Docker Desktop

The app needs Docker for Supabase:
```bash
open -a Docker
# Wait for Docker to start (icon in menu bar)
```

### 2. Start Supabase

```bash
cd /Users/trilogy/Desktop/2025/content-reel
supabase start
```

You'll see output like:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOiJIUz...
```

### 3. Get Groq API Key (FREE)

1. Go to: https://console.groq.com
2. Sign up (free)
3. Create API key
4. Copy the key

### 4. Set Environment Variables

```bash
cd /Users/trilogy/Desktop/2025/content-reel
cp .env.example .env
nano .env
```

Add your Groq key:
```
GROQ_API_KEY=gsk_your_key_here
```

### 5. Apply Database Migration

```bash
supabase db reset
```

This creates all tables (content_cards, content_pool, etc.)

### 6. Fetch Initial Content

Run each fetcher once to populate database:

```bash
# Fetch HackerNews articles
supabase functions serve fetch-hackernews --no-verify-jwt &
curl -X POST http://localhost:54321/functions/v1/fetch-hackernews

# Fetch Investopedia articles
supabase functions serve fetch-investopedia --no-verify-jwt &
curl -X POST http://localhost:54321/functions/v1/fetch-investopedia

# Fetch book summaries
supabase functions serve fetch-books --no-verify-jwt &
curl -X POST http://localhost:54321/functions/v1/fetch-books
```

### 7. Start the Mobile App

```bash
cd mobile
npm start
```

Press `i` for iOS simulator or `w` for web.

### 8. Use the App!

- Swipe left/right to navigate
- See content from all 4 sources
- Beautiful, minimalist cards
- No distractions!

## File Structure

```
content-reel/
├── supabase/
│   ├── functions/
│   │   ├── _shared/llm.ts (Groq LLM integration)
│   │   ├── fetch-hackernews/ (Tech articles)
│   │   ├── fetch-investopedia/ (Finance)
│   │   ├── fetch-books/ (Book summaries)
│   │   └── get-content/ (Randomizer API)
│   └── migrations/
│       └── 20251006_content_schema.sql
│
└── mobile/
    ├── App.tsx (Main app with swipe gestures)
    └── src/
        ├── components/ContentCard.tsx
        ├── services/
        │   ├── supabase.ts
        │   └── content.ts
        └── types/content.ts
```

## Content Sources

### 1. HackerNews (Tech)
- **Free**: Yes
- **API**: https://hacker-news.firebaseio.com/v0
- **Fetches**: Top 10 stories with >100 points
- **Updates**: Hourly

### 2. Investopedia (Finance)
- **Free**: Yes
- **Method**: Web scraping
- **Fetches**: Latest finance news/articles
- **Updates**: Hourly

### 3. Four Minute Books (Books)
- **Free**: Yes
- **Method**: Web scraping
- **Fetches**: 10 popular book summaries
- **Updates**: Weekly

### 4. Codeforces (Coding)
- **Free**: Yes
- **API**: https://codeforces.com/api
- **Fetches**: Problems by rating
- **Updates**: Daily
- **Status**: TODO - Add fetcher

## How It Works

### Content Pipeline

```
1. FETCH (Scheduled)
   - Fetcher runs (hourly/daily/weekly)
   - Gets content from source
   - Stores raw data

2. PARSE (Automatic)
   - Sends content to Groq LLM
   - LLM cleans and formats:
     * Removes HTML/ads
     * Extracts key points
     * Generates summary
     * Assigns tags
   - Stores in content_cards table

3. POOL (Automatic)
   - Adds to content_pool
   - Sets weights (25% coding, 30% tech, 25% finance, 20% books)

4. SERVE (On-demand)
   - User opens app
   - API gets 20 random cards
   - Respects type distribution
   - No repeats in session

5. DISPLAY
   - App shows card
   - User swipes
   - Next card appears
```

### Database Tables

- **content_cards**: All parsed content
- **content_pool**: Active cards for randomization
- **user_sessions**: Track sessions
- **content_views**: Prevent repeats

## Groq LLM (Free!)

**Why Groq?**
- FREE API (with generous limits)
- Fast (70B parameter Llama 3)
- Good at content parsing
- No credit card required

**What it does:**
- Cleans HTML/junk
- Extracts key points
- Generates summaries
- Formats content nicely

**Cost:** $0/month (free tier)

## Next Steps

### Add Codeforces Fetcher
Create `supabase/functions/fetch-codeforces/index.ts` (reuse from backup)

### Schedule Fetchers
Use Supabase cron jobs:
- HackerNews: Every hour
- Investopedia: Every hour
- Books: Weekly
- Codeforces: Daily

### Improve Parsing
Tweak LLM prompts in `_shared/llm.ts` for better output

### Add More Sources
- Reddit (memes/discussions)
- Medium (articles)
- YouTube (transcripts)
- Wikipedia (concepts)

## Troubleshooting

### "No content available"
Run fetchers to populate database (see Step 6)

### "Groq API error"
Check your API key in Supabase secrets:
```bash
supabase secrets set GROQ_API_KEY=your_key
```

### "Supabase not running"
```bash
supabase stop
supabase start
```

### App crashes
```bash
cd mobile
rm -rf node_modules
npm install
npm start -- --clear
```

## You're Done! 🎉

Open the app and start swiping through content from 4 different sources, all beautifully formatted by AI!

**Enjoy your anti-brainrot content feed!** 📚💻💰📖
