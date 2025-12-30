#!/usr/bin/env node
/**
 * Test Supabase Connection
 * Run: node scripts/test-supabase.js
 */

require('dotenv').config()

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

async function testConnection() {
  console.log('\n🔍 Testing Supabase Connection...\n')
  
  // Check env vars
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.log('❌ EXPO_PUBLIC_SUPABASE_URL not set in .env')
    return false
  }
  console.log('✅ Supabase URL:', SUPABASE_URL)
  
  if (!SUPABASE_KEY || SUPABASE_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.log('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY not set in .env')
    return false
  }
  console.log('✅ Supabase Key:', SUPABASE_KEY.substring(0, 20) + '...')
  
  // Test API connection
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })
    
    if (response.ok) {
      console.log('✅ API Connection: Success!')
    } else {
      console.log('❌ API Connection failed:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.log('❌ API Connection error:', error.message)
    return false
  }
  
  // Test tables exist
  const tables = ['profiles', 'user_journeys', 'user_progress']
  
  for (const table of tables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=0`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      
      if (response.ok) {
        console.log(`✅ Table "${table}": Exists`)
      } else if (response.status === 404) {
        console.log(`❌ Table "${table}": Not found - Run schema.sql!`)
      } else {
        console.log(`⚠️ Table "${table}": ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.log(`❌ Table "${table}": Error - ${error.message}`)
    }
  }
  
  console.log('\n✨ Supabase setup complete!\n')
  return true
}

testConnection()

