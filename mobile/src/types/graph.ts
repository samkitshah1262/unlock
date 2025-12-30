// Knowledge Graph Types

export type Domain = 'math' | 'codeforces' | 'ai_primers'

export interface GraphNode {
  id: string
  title: string
  category: string
  subcategory?: string
  difficulty: number
  tags: string[]
  order?: number
  estimatedMinutes?: number
}

export interface GraphEdge {
  source: string
  target: string
  type: 'next' | 'related' | 'sibling' | 'prerequisite'
  weight?: number
}

export interface AdjacencyList {
  [cardId: string]: {
    next: string[]
    related: string[]
    siblings: string[]
  }
}

export interface KnowledgeGraph {
  domain: Domain
  version: string
  generatedAt: string
  nodes: Record<string, GraphNode>
  edges: GraphEdge[]
  adjacencyList: AdjacencyList
  stats: {
    totalNodes: number
    totalEdges: number
    edgesByType: Record<string, number>
  }
}

// User's exploration journey
export interface UserJourney {
  explored: Set<string>
  path: string[]           // Stack of visited card IDs (for back navigation)
  traversedEdges: Array<{
    from: string
    to: string
    timestamp: number
  }>
  byDomain: {
    math: number
    codeforces: number
    ai_primers: number
  }
  startTime: number        // Session start timestamp
}

// Navigation candidates for swipe actions
export interface NavigationCandidates {
  swipeRight: string[]   // Go deeper / related
  swipeLeft: string[]    // Parallel / alternative
  swipeUp: string[]      // Next in sequence
  swipeDown: string[]    // Previous / back
}

