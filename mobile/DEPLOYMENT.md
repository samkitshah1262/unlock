# Unlock - Play Store Deployment Guide

## 📋 Pre-Launch Checklist

### ✅ Completed
- [x] App renamed to "Unlock"
- [x] Debug console.logs removed
- [x] Error boundaries added
- [x] Loading skeleton states
- [x] Empty states UI
- [x] app.json configured (package, version)
- [x] Supabase backend setup
- [x] Google Auth configuration
- [x] Offline caching with AsyncStorage
- [x] EAS Build configuration

### 🔧 Manual Steps Required

## 1. Generate App Icon

```bash
# Install canvas dependency
npm install canvas --save-dev

# Generate icons
node scripts/generate-icons.js
```

Or use the SVG at `assets/icon.svg` with an online converter:
- https://cloudconvert.com/svg-to-png
- Export at: 1024x1024 (icon), 288x288 (splash), 48x48 (favicon)

## 2. Set Up Supabase

1. Create a project at https://supabase.com
2. Go to **Settings > API** and copy:
   - Project URL
   - Anon public key

3. Create `.env` file in mobile folder:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Run the database schema:
   - Go to **SQL Editor** in Supabase Dashboard
   - Paste contents of `supabase/schema.sql`
   - Execute

5. Configure Google Auth:
   - **Supabase Dashboard > Authentication > Providers > Google**
   - Enable Google provider
   - Add OAuth credentials from Google Cloud Console

## 3. Configure Google OAuth (for Auth)

1. Go to https://console.cloud.google.com
2. Create/select project
3. **APIs & Services > OAuth consent screen**
   - Configure external consent screen
   - Add app name, email, etc.
4. **APIs & Services > Credentials**
   - Create OAuth 2.0 Client ID
   - Select "Web application"
   - Add authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret to Supabase Google provider settings

## 4. EAS Build Setup

```bash
# Login to Expo
npx eas-cli login

# Link your project
npx eas-cli init

# Update app.json with your project ID (will be added automatically)
```

Update `app.json` with your EAS project ID:
```json
"extra": {
  "eas": {
    "projectId": "your-project-id-from-expo"
  }
}
```

## 5. Build for Android

### Development Build (for testing)
```bash
npx eas-cli build --profile development --platform android
```

### Preview APK (for internal testing)
```bash
npx eas-cli build --profile preview --platform android
```

### Production AAB (for Play Store)
```bash
npx eas-cli build --profile production --platform android
```

## 6. Play Store Submission

1. **Create Google Play Developer Account** ($25 one-time fee)
   - https://play.google.com/console

2. **Create New Application**
   - App name: Unlock
   - Default language: English
   - App or Game: App
   - Free or Paid: Free

3. **Store Listing**
   - Short description (80 chars max)
   - Full description (4000 chars max)
   - Screenshots: Phone (2+), Tablet (optional)
   - Feature graphic: 1024x500 PNG
   - Icon: 512x512 PNG

4. **Content Rating**
   - Complete the questionnaire
   - Usually rated "Everyone"

5. **App Content**
   - Privacy Policy URL (required)
   - Data safety section
   - Ads declaration

6. **Release to Production**
   - Upload AAB from EAS build
   - Review and rollout

## 📱 Testing Checklist

### Device Testing
- [ ] Android 10 (API 29)
- [ ] Android 11 (API 30)
- [ ] Android 12 (API 31)
- [ ] Android 13 (API 33)
- [ ] Android 14 (API 34)

### Features to Test
- [ ] App loads content properly
- [ ] Swipe left/right navigation works
- [ ] Long press shows graph overlay
- [ ] Shuffle button randomizes content
- [ ] Skeleton loader shows during loading
- [ ] Error boundary catches crashes
- [ ] Offline mode works (disable network, reload app)
- [ ] Auth flow (if implemented)

## 🔐 Security Checklist

- [ ] API keys are in environment variables (not hardcoded)
- [ ] Supabase RLS policies are enabled
- [ ] No sensitive data in git repository
- [ ] `.env` file is in `.gitignore`

## 📦 Files Created

```
mobile/
├── eas.json                    # EAS Build configuration
├── app.json                    # Updated with Unlock branding
├── supabase/
│   └── schema.sql              # Database schema
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx   # Crash handling
│   │   ├── SkeletonLoader.tsx  # Loading animation
│   │   └── EmptyState.tsx      # No content UI
│   ├── contexts/
│   │   └── AuthContext.tsx     # Auth state management
│   └── services/
│       ├── supabase.ts         # Supabase client
│       └── cache.ts            # Offline caching
└── scripts/
    └── generate-icons.js       # Icon generator
```

## 🆘 Troubleshooting

### Build fails with "Missing keystore"
```bash
# EAS will prompt to generate one automatically
# Or generate manually:
keytool -genkeypair -v -storetype PKCS12 -keystore unlock.keystore -alias unlock -keyalg RSA -keysize 2048 -validity 10000
```

### "Supabase URL not found"
Make sure `.env` file exists and has correct values. Restart Metro bundler after changes.

### Google Auth not working
1. Check redirect URI matches exactly
2. Verify OAuth consent screen is configured
3. Check Supabase provider is enabled

---

🚀 Ready to launch? Follow the steps above and you'll have Unlock on the Play Store!

