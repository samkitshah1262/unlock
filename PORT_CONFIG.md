# ✅ Port Configuration - Both Projects Running Successfully!

## Content Reel Project (this project) - Ports 54340-54346

| Service | Port | URL |
|---------|------|-----|
| API (Kong) | 54340 | http://localhost:54340 |
| PostgreSQL | 54341 | postgresql://postgres:postgres@localhost:54341/postgres |
| DB Pooler | 54342 | Disabled |
| Studio | 54343 | http://localhost:54343 |
| Inbucket Web | 54344 | http://localhost:54344 |
| Inbucket SMTP | 54345 | N/A |
| Inbucket POP3 | 54346 | N/A |

## Other Project (mnxgkozrutvylzeogphh) - Ports 54321-54330

| Service | Port | URL |
|---------|------|-----|
| API (Kong) | 54321 | http://localhost:54321 |
| PostgreSQL | 54323 | postgresql://postgres:postgres@localhost:54323/postgres |
| Studio | 54327 | http://localhost:54327 |
| Inbucket Web | 54328 | http://localhost:54328 |
| Inbucket SMTP | 54329 | N/A |
| Inbucket POP3 | 54330 | N/A |

## ✅ No Conflicts - Both Projects Can Run Simultaneously!

### Quick Access

**Content Reel:**
```bash
API:    http://localhost:54340
Studio: http://localhost:54343
DB:     postgresql://postgres:postgres@localhost:54341/postgres
```

**Other Project:**
```bash
API:    http://localhost:54321
Studio: http://localhost:54327
DB:     postgresql://postgres:postgres@localhost:54323/postgres
```

### Start/Stop Commands

```bash
# Content Reel
cd /Users/trilogy/Desktop/2025/content-reel
supabase start  # Start
supabase stop   # Stop
supabase status # Check status

# Other Project
cd /path/to/other/project
supabase start  # Start
supabase stop   # Stop
supabase status # Check status
```

## Updated Files

All files have been updated to use port 54340:
- ✅ `supabase/config.toml`
- ✅ `mobile/src/services/supabase.ts`
- ✅ `show-full-content.js`

## Environment Variables

```bash
# Content Reel
export SUPABASE_URL=http://localhost:54340
export DATABASE_URL=postgresql://postgres:postgres@localhost:54341/postgres

# Other Project  
export SUPABASE_URL=http://localhost:54321
export DATABASE_URL=postgresql://postgres:postgres@localhost:54323/postgres
```

