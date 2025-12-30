// Knowledge Graph Navigation Service
// Handles traversal logic for swipe-based exploration

import type { 
  KnowledgeGraph, 
  NavigationCandidates, 
  UserJourney,
  Domain 
} from '../types/graph'

// Create empty user journey
export function createUserJourney(): UserJourney {
  return {
    explored: new Set(),
    path: [],
    traversedEdges: [],
    byDomain: {
      math: 0,
      codeforces: 0,
      ai_primers: 0
    },
    startTime: Date.now()
  }
}

// Record that user visited a card
export function recordVisit(
  journey: UserJourney, 
  cardId: string, 
  domain: Domain
): UserJourney {
  const newJourney = { ...journey }
  newJourney.explored = new Set(journey.explored)
  newJourney.explored.add(cardId)
  newJourney.path = [...journey.path, cardId]
  newJourney.byDomain = { ...journey.byDomain }
  newJourney.byDomain[domain]++
  return newJourney
}

// Record edge traversal (for graph visualization later)
export function recordEdge(
  journey: UserJourney,
  fromCardId: string,
  toCardId: string
): UserJourney {
  return {
    ...journey,
    traversedEdges: [
      ...journey.traversedEdges,
      {
        from: fromCardId,
        to: toCardId,
        timestamp: Date.now()
      }
    ]
  }
}

// Get navigation candidates for current card
export function getNavigationCandidates(
  currentCardId: string,
  graph: KnowledgeGraph,
  journey: UserJourney,
  options: {
    preferUnseen?: boolean
    maxCandidates?: number
  } = {}
): NavigationCandidates {
  const { preferUnseen = true, maxCandidates = 10 } = options
  const adj = graph.adjacencyList[currentCardId]
  
  if (!adj) {
    return {
      swipeRight: [],
      swipeLeft: [],
      swipeUp: [],
      swipeDown: []
    }
  }
  
  // Filter and optionally prioritize unseen cards
  const filterCandidates = (ids: string[]): string[] => {
    let candidates = ids.filter(id => graph.nodes[id]) // Ensure node exists
    
    if (preferUnseen) {
      const unseen = candidates.filter(id => !journey.explored.has(id))
      const seen = candidates.filter(id => journey.explored.has(id))
      candidates = [...unseen, ...seen] // Unseen first
    }
    
    return candidates.slice(0, maxCandidates)
  }
  
  // Swipe Right: Go deeper - related and next cards
  const swipeRight = filterCandidates([
    ...adj.related,
    ...adj.next
  ])
  
  // Swipe Left: Parallel - siblings at same level
  const swipeLeft = filterCandidates(adj.siblings)
  
  // Swipe Up: Next in sequence
  const swipeUp = filterCandidates(adj.next)
  
  // Swipe Down: Back in history
  const pathIndex = journey.path.indexOf(currentCardId)
  const previousCards = pathIndex > 0 
    ? [journey.path[pathIndex - 1]] 
    : []
  const swipeDown = filterCandidates(previousCards)
  
  return {
    swipeRight,
    swipeLeft,
    swipeUp,
    swipeDown
  }
}

// Get the next card for a swipe direction
export function getNextCard(
  direction: 'right' | 'left' | 'up' | 'down',
  candidates: NavigationCandidates
): string | null {
  const mapping: Record<string, string[]> = {
    right: candidates.swipeRight,
    left: candidates.swipeLeft,
    up: candidates.swipeUp,
    down: candidates.swipeDown
  }
  
  const options = mapping[direction]
  return options.length > 0 ? options[0] : null
}

// Find a random starting card in a domain
export function getRandomStartCard(
  graph: KnowledgeGraph,
  options: {
    maxDifficulty?: number
    category?: string
  } = {}
): string | null {
  const { maxDifficulty = 3, category } = options
  
  let candidates = Object.values(graph.nodes)
    .filter(node => node.difficulty <= maxDifficulty)
  
  if (category) {
    candidates = candidates.filter(node => 
      node.category.toLowerCase().includes(category.toLowerCase())
    )
  }
  
  if (candidates.length === 0) return null
  
  const randomIndex = Math.floor(Math.random() * candidates.length)
  return candidates[randomIndex].id
}

// Get recommended next cards based on user journey
export function getRecommendedCards(
  graph: KnowledgeGraph,
  journey: UserJourney,
  limit: number = 5
): string[] {
  const currentCardId = journey.path[journey.path.length - 1]
  if (!currentCardId) {
    // No history - return random beginner cards
    return Object.values(graph.nodes)
      .filter(n => n.difficulty <= 2)
      .slice(0, limit)
      .map(n => n.id)
  }
  
  const candidates = getNavigationCandidates(currentCardId, graph, journey)
  
  // Combine and dedupe
  const all = [
    ...candidates.swipeRight,
    ...candidates.swipeUp,
    ...candidates.swipeLeft
  ]
  
  return [...new Set(all)].slice(0, limit)
}

// Compute stats about user's exploration
export function computeExplorationStats(
  graph: KnowledgeGraph,
  journey: UserJourney
): {
  totalExplored: number
  percentExplored: number
  categoriesCovered: number
  averageDifficulty: number
  uniqueEdgesTraversed: number
} {
  const exploredNodes = [...journey.explored]
    .map(id => graph.nodes[id])
    .filter(Boolean)
  
  const categories = new Set(exploredNodes.map(n => n.category))
  
  const avgDifficulty = exploredNodes.length > 0
    ? exploredNodes.reduce((sum, n) => sum + n.difficulty, 0) / exploredNodes.length
    : 0
  
  const uniqueEdges = new Set(
    journey.traversedEdges.map(e => `${e.from}->${e.to}`)
  )
  
  return {
    totalExplored: journey.explored.size,
    percentExplored: (journey.explored.size / Object.keys(graph.nodes).length) * 100,
    categoriesCovered: categories.size,
    averageDifficulty: Math.round(avgDifficulty * 10) / 10,
    uniqueEdgesTraversed: uniqueEdges.size
  }
}

