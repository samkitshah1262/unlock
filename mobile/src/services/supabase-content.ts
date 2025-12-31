// Supabase Content Service - Fetches cards and graph from database

import { supabase } from './supabase'
import type { ProblemCard } from '../types/codeforces'
import type { MathCard } from '../types/math'
import type { AIPrimerCard } from '../types/ai-primers'
import type { KnowledgeGraph, GraphEdge } from '../types/graph'

// Database row type
interface CardRow {
  id: string
  type: 'codeforces' | 'math' | 'ai_primers'
  title: string
  content: any
  category: string | null
  difficulty: string | null
  tags: string[]
}

interface EdgeRow {
  from_card_id: string
  to_card_id: string
  edge_type: string
  weight: number
}

// Fetch random cards from Supabase
export async function fetchRandomCards(limit = 100): Promise<{
  problems: ProblemCard[]
  mathCards: MathCard[]
  aiCards: AIPrimerCard[]
}> {
  const { data, error } = await supabase
    .rpc('get_random_cards', { p_limit: limit })
  
  if (error) {
    console.error('Error fetching cards:', error)
    return { problems: [], mathCards: [], aiCards: [] }
  }
  
  const rows = data as CardRow[]
  
  const problems: ProblemCard[] = []
  const mathCards: MathCard[] = []
  const aiCards: AIPrimerCard[] = []
  
  for (const row of rows) {
    const content = row.content
    
    if (row.type === 'codeforces') {
      problems.push(content as ProblemCard)
    } else if (row.type === 'math') {
      mathCards.push(content as MathCard)
    } else if (row.type === 'ai_primers') {
      aiCards.push(content as AIPrimerCard)
    }
  }
  
  return { problems, mathCards, aiCards }
}

// Fetch cards by type
export async function fetchCardsByType(
  type: 'codeforces' | 'math' | 'ai_primers',
  limit = 50
): Promise<any[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('content')
    .eq('type', type)
    .limit(limit)
  
  if (error) {
    console.error(`Error fetching ${type} cards:`, error)
    return []
  }
  
  return data.map(row => row.content)
}

// Fetch a single card by ID
export async function fetchCardById(id: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('cards')
    .select('content, type')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching card:', error)
    return null
  }
  
  return data?.content || null
}

// Fetch related cards via graph
export async function fetchRelatedCards(cardId: string, limit = 10): Promise<string[]> {
  const { data, error } = await supabase
    .rpc('get_related_cards', { p_card_id: cardId, p_limit: limit })
  
  if (error) {
    console.error('Error fetching related cards:', error)
    return []
  }
  
  return (data as EdgeRow[]).map(row => row.to_card_id)
}

// Fetch the full graph for a specific card type
export async function fetchGraph(type?: string): Promise<KnowledgeGraph> {
  let query = supabase.from('graph_edges').select('*')
  
  if (type) {
    // Filter edges to only those connecting cards of the specified type
    // This requires a join, so we fetch all and filter client-side
  }
  
  const { data, error } = await query.limit(10000)
  
  if (error) {
    console.error('Error fetching graph:', error)
    return { nodes: [], edges: [], adjacencyList: {} }
  }
  
  const edges: GraphEdge[] = []
  const adjacencyList: Record<string, Array<{ targetId: string; type: string; weight: number }>> = {}
  const nodeIds = new Set<string>()
  
  for (const row of data as EdgeRow[]) {
    edges.push({
      from: row.from_card_id,
      to: row.to_card_id,
      type: row.edge_type as 'next' | 'related' | 'prerequisite' | 'sibling',
      weight: row.weight
    })
    
    nodeIds.add(row.from_card_id)
    nodeIds.add(row.to_card_id)
    
    if (!adjacencyList[row.from_card_id]) {
      adjacencyList[row.from_card_id] = []
    }
    adjacencyList[row.from_card_id].push({
      targetId: row.to_card_id,
      type: row.edge_type,
      weight: row.weight
    })
  }
  
  return {
    nodes: Array.from(nodeIds).map(id => ({ id, type: 'unknown', label: id })),
    edges,
    adjacencyList
  }
}

// Check if Supabase has content
export async function hasContent(): Promise<boolean> {
  const { count, error } = await supabase
    .from('cards')
    .select('id', { count: 'exact', head: true })
  
  if (error) {
    console.error('Error checking content:', error)
    return false
  }
  
  return (count || 0) > 0
}

