// Supabase Client Configuration
// Set up your Supabase project at https://supabase.com

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// TODO: Replace with your Supabase project credentials
// Get these from: Supabase Dashboard > Settings > API
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Database types
export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface UserJourneyRecord {
  id: string
  user_id: string
  card_id: string
  card_type: 'codeforces' | 'math' | 'ai_primers'
  viewed_at: string
  time_spent_seconds: number
}

export interface UserProgress {
  id: string
  user_id: string
  total_cards_explored: number
  total_time_minutes: number
  streak_days: number
  last_active_at: string
  domains_explored: {
    math: number
    codeforces: number
    ai_primers: number
  }
}

// Auth helpers
export async function signInWithGoogle() {
  // Note: For Google Auth in Expo, you need to configure:
  // 1. Google Cloud Console OAuth credentials
  // 2. Supabase Dashboard > Authentication > Providers > Google
  // 3. expo-auth-session for the redirect handling
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'exp://localhost:8081', // Update for production
    },
  })
  
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

// Progress sync functions
export async function syncJourneyToCloud(
  userId: string,
  cardId: string,
  cardType: 'codeforces' | 'math' | 'ai_primers',
  timeSpentSeconds: number
) {
  const { error } = await supabase
    .from('user_journeys')
    .insert({
      user_id: userId,
      card_id: cardId,
      card_type: cardType,
      time_spent_seconds: timeSpentSeconds,
    })
  
  return { error }
}

export async function getUserProgress(userId: string): Promise<UserProgress | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) return null
  return data as UserProgress
}

export async function updateUserProgress(
  userId: string,
  progress: Partial<UserProgress>
) {
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      ...progress,
      last_active_at: new Date().toISOString(),
    })
  
  return { error }
}

// Fetch user's journey history
export async function getJourneyHistory(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('user_journeys')
    .select('*')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(limit)
  
  if (error) return []
  return data as UserJourneyRecord[]
}
