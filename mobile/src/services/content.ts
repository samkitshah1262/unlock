// Content Service - Fetch random content cards

import { supabase } from './supabase'
import type { ContentCard } from '../types/content'
import * as Crypto from 'expo-crypto'

// Generate device ID
let deviceId: string | null = null
async function getDeviceId(): Promise<string> {
  if (!deviceId) {
    deviceId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Date.now().toString() + Math.random().toString()
    )
  }
  return deviceId
}

// Generate session ID
let sessionId: string | null = null
function getSessionId(): string {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
  return sessionId
}

// Fetch random content
export async function fetchRandomContent(count: number = 40): Promise<ContentCard[]> {
  try {
    const { data, error } = await supabase.functions.invoke('get-content', {
      body: {
        deviceId: await getDeviceId(),
        sessionId: getSessionId(),
        count
      }
    })

    if (error) throw error

    return data.cards || []
  } catch (error) {
    console.error('Error fetching content:', error)
    throw error
  }
}

// Refresh session (get new content)
export function refreshSession() {
  sessionId = null
}
