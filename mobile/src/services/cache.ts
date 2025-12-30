// Offline Cache Service - Stores content for offline reading

import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_KEYS = {
  CONTENT: '@unlock:content',
  JOURNEY: '@unlock:journey',
  LAST_SYNC: '@unlock:last_sync',
  USER_PREFERENCES: '@unlock:preferences',
}

const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheEntry<T> {
  data: T
  timestamp: number
  version: string
}

const CACHE_VERSION = '1.0.0'

// Generic cache functions
async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    }
    await AsyncStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Silent fail - cache is optional
  }
}

async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key)
    if (!value) return null

    const entry: CacheEntry<T> = JSON.parse(value)
    
    // Check version
    if (entry.version !== CACHE_VERSION) {
      await AsyncStorage.removeItem(key)
      return null
    }
    
    // Check expiry
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      await AsyncStorage.removeItem(key)
      return null
    }
    
    return entry.data
  } catch {
    return null
  }
}

// Content caching
export interface CachedContent {
  problems: any[]
  mathCards: any[]
  aiCards: any[]
  graph: any
}

export async function cacheContent(content: CachedContent): Promise<void> {
  await setCache(CACHE_KEYS.CONTENT, content)
}

export async function getCachedContent(): Promise<CachedContent | null> {
  return getCache<CachedContent>(CACHE_KEYS.CONTENT)
}

// Journey caching (for offline progress)
export interface CachedJourney {
  path: string[]
  explored: string[]
  traversedEdges: Array<{ from: string; to: string }>
  startTime: number
}

export async function cacheJourney(journey: CachedJourney): Promise<void> {
  await setCache(CACHE_KEYS.JOURNEY, journey)
}

export async function getCachedJourney(): Promise<CachedJourney | null> {
  return getCache<CachedJourney>(CACHE_KEYS.JOURNEY)
}

// User preferences
export interface UserPreferences {
  lastViewedCardId: string | null
  preferredDomains: string[]
  viewedCardIds: string[]
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await setCache(CACHE_KEYS.USER_PREFERENCES, prefs)
}

export async function getPreferences(): Promise<UserPreferences | null> {
  return getCache<UserPreferences>(CACHE_KEYS.USER_PREFERENCES)
}

// Sync tracking
export async function getLastSyncTime(): Promise<number | null> {
  const value = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC)
  return value ? parseInt(value, 10) : null
}

export async function setLastSyncTime(): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString())
}

// Clear all cache
export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(CACHE_KEYS))
  } catch {
    // Silent fail
  }
}

// Get cache size (approximate)
export async function getCacheSize(): Promise<string> {
  try {
    const keys = await AsyncStorage.getAllKeys()
    const unlockKeys = keys.filter(k => k.startsWith('@unlock:'))
    
    let totalSize = 0
    for (const key of unlockKeys) {
      const value = await AsyncStorage.getItem(key)
      if (value) {
        totalSize += value.length * 2 // UTF-16 characters
      }
    }
    
    if (totalSize < 1024) return `${totalSize} B`
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(1)} KB`
    return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
  } catch {
    return 'Unknown'
  }
}

