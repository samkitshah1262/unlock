#!/usr/bin/env node
/**
 * Upload Content to Supabase
 * Run: node scripts/upload-content-to-supabase.js
 * 
 * Prerequisites:
 * 1. Run content-schema.sql in Supabase SQL Editor
 * 2. Set SUPABASE_SERVICE_KEY in .env (NOT the anon key!)
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY // Use service key for writes

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
  console.log('\nAdd to your .env file:')
  console.log('SUPABASE_SERVICE_KEY=your-service-role-key')
  console.log('\nGet it from: Supabase Dashboard > Settings > API > service_role key')
  process.exit(1)
}

async function supabaseInsert(table, rows) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(rows)
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to insert into ${table}: ${error}`)
  }
  
  return response
}

async function uploadCards() {
  console.log('\nUploading cards to Supabase...\n')
  
  const cards = []
  
  // Load AI Primers
  const aiCardsPath = path.join(__dirname, '../data/ai-primers/all-cards.json')
  if (fs.existsSync(aiCardsPath)) {
    const aiCards = JSON.parse(fs.readFileSync(aiCardsPath, 'utf-8'))
    console.log(`Found ${aiCards.length} AI primer cards`)
    
    for (const card of aiCards) {
      cards.push({
        id: card.id,
        type: 'ai_primers',
        title: card.title || card.subtitle || 'Untitled',
        content: card,
        category: card.category,
        difficulty: card.difficulty,
        tags: card.tags || []
      })
    }
  }
  
  // Load Math cards
  const mathPath = path.join(__dirname, '../src/data/math-cards.json')
  if (fs.existsSync(mathPath)) {
    const mathCards = JSON.parse(fs.readFileSync(mathPath, 'utf-8'))
    console.log(`Found ${mathCards.length} math cards`)
    
    for (const card of mathCards) {
      cards.push({
        id: card.id,
        type: 'math',
        title: card.title || card.question || 'Math Problem',
        content: card,
        category: card.subject,
        difficulty: card.difficulty,
        tags: card.topics || []
      })
    }
  }
  
  // Load Codeforces problems
  const cfPath = path.join(__dirname, '../src/data/problems.json')
  if (fs.existsSync(cfPath)) {
    const cfCards = JSON.parse(fs.readFileSync(cfPath, 'utf-8'))
    console.log(`Found ${cfCards.length} codeforces cards`)
    
    for (const card of cfCards) {
      cards.push({
        id: card.id,
        type: 'codeforces',
        title: card.title || card.name || 'Problem',
        content: card,
        category: card.contestId?.toString(),
        difficulty: card.rating?.toString(),
        tags: card.tags || []
      })
    }
  }
  
  console.log(`\nTotal: ${cards.length} cards to upload`)
  
  // Upload in batches of 500
  const BATCH_SIZE = 500
  let uploaded = 0
  
  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE)
    try {
      await supabaseInsert('cards', batch)
      uploaded += batch.length
      console.log(`Uploaded ${uploaded}/${cards.length} cards`)
    } catch (error) {
      console.error(`Error at batch ${i}: ${error.message}`)
      // Continue with next batch
    }
  }
  
  console.log(`\nCards upload complete: ${uploaded}/${cards.length}`)
  return uploaded
}

async function uploadGraph() {
  console.log('\nUploading graph edges to Supabase...\n')
  
  const graphPath = path.join(__dirname, '../data/graphs/ai-primers-graph.json')
  if (!fs.existsSync(graphPath)) {
    console.log('No graph file found, skipping edges upload')
    return 0
  }
  
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'))
  const edges = []
  
  // Convert adjacency list to edges
  if (graph.adjacencyList) {
    for (const [fromId, connections] of Object.entries(graph.adjacencyList)) {
      for (const conn of connections) {
        edges.push({
          from_card_id: fromId,
          to_card_id: conn.targetId,
          edge_type: conn.type || 'related',
          weight: conn.weight || 1.0
        })
      }
    }
  }
  
  console.log(`Found ${edges.length} graph edges`)
  
  // Upload in batches
  const BATCH_SIZE = 500
  let uploaded = 0
  
  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    const batch = edges.slice(i, i + BATCH_SIZE)
    try {
      await supabaseInsert('graph_edges', batch)
      uploaded += batch.length
      console.log(`Uploaded ${uploaded}/${edges.length} edges`)
    } catch (error) {
      console.error(`Error at batch ${i}: ${error.message}`)
    }
  }
  
  console.log(`\nEdges upload complete: ${uploaded}/${edges.length}`)
  return uploaded
}

async function main() {
  console.log('=== Supabase Content Uploader ===')
  console.log(`URL: ${SUPABASE_URL}`)
  
  try {
    const cardsUploaded = await uploadCards()
    const edgesUploaded = await uploadGraph()
    
    console.log('\n=== Upload Summary ===')
    console.log(`Cards: ${cardsUploaded}`)
    console.log(`Edges: ${edgesUploaded}`)
    console.log('\nDone!')
  } catch (error) {
    console.error('Upload failed:', error.message)
    process.exit(1)
  }
}

main()

