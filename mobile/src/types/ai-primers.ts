// AI Primers Card Types (scraped from aman.ai)

export interface AIPrimerCard {
  id: string
  domain: 'ai_primers'
  
  // Hierarchy
  category: string        // e.g., "Algorithms/Architecture", "NLP/LLM"
  article: string         // e.g., "Transformers"
  articleSlug: string     // e.g., "transformers"
  chapter: string         // e.g., "Self-Attention"
  title: string           // Section title
  subtitle?: string | null
  
  // Content
  contentHtml: string
  contentMarkdown: string
  
  // Ordering
  order: number           // Position within article
  orderInChapter: number  // Position within chapter
  
  // Metadata
  difficulty: 1 | 2 | 3 | 4 | 5
  estimatedMinutes: number
  tags: string[]
  
  metadata: {
    hasCode: boolean
    hasMath: boolean
    hasImages: boolean
    wordCount: number
    contentLength: number
  }
  
  // Graph links
  nextCards: string[]
  relatedCards: string[]
  siblings?: string[]
  prerequisites?: string[]
  
  // Source
  sourceUrl: string
  scrapedAt: string
}

// Category display info
export const aiCategoryInfo: Record<string, { name: string; color: string; icon: string }> = {
  'algorithms-architecture': { name: 'Algorithms', color: '#3B82F6', icon: '🧠' },
  'data-training': { name: 'Training', color: '#10B981', icon: '📊' },
  'models': { name: 'Models', color: '#8B5CF6', icon: '🤖' },
  'vision': { name: 'Vision', color: '#F59E0B', icon: '👁️' },
  'speech': { name: 'Speech', color: '#EC4899', icon: '🎤' },
  'nlp-llm': { name: 'NLP/LLM', color: '#6366F1', icon: '💬' },
  'multimodal-ai-vlm': { name: 'Multimodal', color: '#14B8A6', icon: '🎭' },
  'offline-online-evaluation': { name: 'Evaluation', color: '#EF4444', icon: '📈' },
  'mlops': { name: 'MLOps', color: '#64748B', icon: '⚙️' },
  'on-device-ai': { name: 'On-Device', color: '#84CC16', icon: '📱' },
  'hyperparameters': { name: 'Hyperparams', color: '#F97316', icon: '🎛️' },
  'miscellaneous': { name: 'Misc', color: '#6B7280', icon: '📚' },
}

// Get category info with fallback
export function getCategoryInfo(category: string | undefined | null): { name: string; color: string; icon: string } {
  if (!category) {
    return { name: 'Unknown', color: '#6B7280', icon: '📄' }
  }
  const key = category.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return aiCategoryInfo[key] || { 
    name: category, 
    color: '#6B7280', 
    icon: '📄' 
  }
}

// Difficulty display
export function getDifficultyInfo(difficulty: number): { label: string; color: string } {
  switch (difficulty) {
    case 1: return { label: 'Beginner', color: '#22C55E' }
    case 2: return { label: 'Easy', color: '#84CC16' }
    case 3: return { label: 'Intermediate', color: '#EAB308' }
    case 4: return { label: 'Advanced', color: '#F97316' }
    case 5: return { label: 'Expert', color: '#EF4444' }
    default: return { label: 'Unknown', color: '#6B7280' }
  }
}

// AI Primers Index
export interface AIPrimersIndex {
  domain: 'ai_primers'
  totalCards: number
  categories: Array<{
    id: string
    name: string
    cardCount: number
    file: string
  }>
  articles: Array<{
    slug: string
    title: string
    category: string
    cardCount: number
  }>
  generatedAt: string
}

