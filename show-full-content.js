#!/usr/bin/env node
/**
 * Show full content from database
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54340'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function showContent(sourceName, limit = 3) {
  console.log(`\n${'═'.repeat(80)}`)
  console.log(`${sourceName.toUpperCase()} - FULL CONTENT`)
  console.log('═'.repeat(80))
  
  const { data, error } = await supabase
    .from('content_cards')
    .select('*')
    .eq('source_name', sourceName.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error(`Error: ${error.message}`)
    return
  }
  
  if (!data || data.length === 0) {
    console.log(`No content found for ${sourceName}`)
    return
  }
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    console.log(`\n${'─'.repeat(80)}`)
    console.log(`[${i + 1}/${data.length}] ${item.title}`)
    console.log('─'.repeat(80))
    console.log(`URL: ${item.source_url}`)
    console.log(`Type: ${item.type}`)
    console.log(`Created: ${new Date(item.created_at).toLocaleString()}`)
    
    if (item.author) {
      console.log(`Author: ${item.author}`)
    }
    
    if (item.tags && item.tags.length > 0) {
      console.log(`Tags: ${item.tags.join(', ')}`)
    }
    
    console.log(`\n📝 SUMMARY:`)
    console.log(item.summary || 'N/A')
    
    console.log(`\n📄 FULL BODY:`)
    console.log(item.body || 'N/A')
    
    if (item.key_points && item.key_points.length > 0) {
      console.log(`\n💡 KEY POINTS:`)
      item.key_points.forEach((kp, idx) => {
        console.log(`  ${idx + 1}. ${kp}`)
      })
    }
    
    if (item.raw_data) {
      console.log(`\n🔍 RAW DATA (first 200 chars):`)
      console.log(JSON.stringify(item.raw_data).substring(0, 200) + '...')
    }
    
    console.log('')
  }
}

async function main() {
  const sources = process.argv.slice(2)
  const allSources = ['codeforces', 'hackernews', 'techcrunch', 'producthunt', 'investopedia', 'fourminutebooks']
  
  const sourcesToShow = sources.length > 0 ? sources : allSources
  
  for (const source of sourcesToShow) {
    await showContent(source, 2)
  }
}

main().catch(console.error)


