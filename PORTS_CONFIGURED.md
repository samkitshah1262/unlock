# Port Configuration - Both Projects Running

## ✅ Content Reel (This Project) - Running on ports 54340-54346

| Service | Port | URL |
|---------|------|-----|
| **API (Kong)** | 54340 | http://localhost:54340 |
| **PostgreSQL** | 54341 | postgresql://postgres:postgres@localhost:54341/postgres |
| **DB Pooler** | 54342 | N/A (disabled) |
| **Studio** | 54343 | http://localhost:54343 |
| **Inbucket Web** | 54344 | http://localhost:54344 |
| **Inbucket SMTP** | 54345 | N/A |
| **Inbucket POP3** | 54346 | N/A |

## Other Project (mnxgkozrutvylzeogphh) - Running on ports 54321-54330

| Service | Port | URL |
|---------|------|-----|
| **API (Kong)** | 54321 | http://localhost:54321 |
| **PostgreSQL** | 54323 | postgresql://postgres:postgres@localhost:54323/postgres |
| **Studio** | 54327 | http://localhost:54327 |
| **Inbucket Web** | 54328 | http://localhost:54328 |
| **Inbucket SMTP** | 54329 | N/A |
| **Inbucket POP3** | 54330 | N/A |

## ✅ No Port Conflicts - Both Projects Running!

### Access Content Reel:
- API: `http://localhost:54340`
- Studio: `http://localhost:54343`
- Database: `postgresql://postgres:postgres@localhost:54341/postgres`

### Access Other Project:
- API: `http://localhost:54321`
- Studio: `http://localhost:54327`
- Database: `postgresql://postgres:postgres@localhost:54323/postgres`

## Updated Files

- ✅ `supabase/config.toml` - All ports updated to 54340-54346 range
- ✅ `mobile/src/services/supabase.ts` - API URL updated to 54340
- ✅ `show-full-content.js` - API URL updated to 54340

## Quick Start

```bash
# Content Reel is already running!
# To stop: supabase stop

# To restart:
cd /Users/trilogy/Desktop/2025/content-reel
supabase start
```

## Environment Variables

```bash
# For Content Reel
export SUPABASE_URL=http://localhost:54340
export DATABASE_URL=postgresql://postgres:postgres@localhost:54341/postgres

# For Other Project
export SUPABASE_URL=http://localhost:54321
export DATABASE_URL=postgresql://postgres:postgres@localhost:54323/postgres
```

