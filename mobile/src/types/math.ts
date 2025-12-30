// Math Card Types

export type CardType = 'concept' | 'formula' | 'theorem' | 'problem' | 'worked_example'
export type Subject = 'linear_algebra' | 'probability' | 'statistics' | 'calculus'
export type MLRelevance = 'core' | 'important' | 'useful' | 'specialized'

export interface FormulaVariant {
  latex: string
  description: string
}

export interface Formula {
  latex: string
  name: string
  variants?: FormulaVariant[]
}

export interface WorkedExampleStep {
  stepNumber: number
  description: string
  mathHtml: string
  explanation: string
}

export interface WorkedExample {
  problemHtml: string
  steps: WorkedExampleStep[]
  finalAnswer: string
}

export interface MathCard {
  id: string
  subject: Subject
  type: CardType
  chapter: string
  topic: string
  title: string
  subtitle?: string
  contentHtml: string
  formula?: Formula
  workedExample?: WorkedExample
  intuition?: string
  visualDescription?: string
  commonMistakes?: string[]
  realWorldApplications?: string[]
  tags: string[]
  difficulty: number
  mlRelevance: MLRelevance
  estimatedMinutes: number
  prerequisites?: string[]
  relatedCards?: string[]
  nextCards?: string[]
}

// Subject display info
export const subjectInfo: Record<Subject, { name: string; color: string; icon: string }> = {
  linear_algebra: { name: 'Linear Algebra', color: '#6366F1', icon: '🔢' },
  probability: { name: 'Probability', color: '#8B5CF6', icon: '🎲' },
  statistics: { name: 'Statistics', color: '#EC4899', icon: '📊' },
  calculus: { name: 'Calculus', color: '#14B8A6', icon: '∫' },
}

// Card type display info
export const cardTypeInfo: Record<CardType, { name: string; color: string; icon: string }> = {
  concept: { name: 'Concept', color: '#3B82F6', icon: '💡' },
  formula: { name: 'Formula', color: '#10B981', icon: '📐' },
  theorem: { name: 'Theorem', color: '#F59E0B', icon: '📜' },
  problem: { name: 'Problem', color: '#EF4444', icon: '❓' },
  worked_example: { name: 'Worked Example', color: '#8B5CF6', icon: '✏️' },
}

// Difficulty display
export const getDifficultyInfo = (difficulty: number): { label: string; color: string } => {
  switch (difficulty) {
    case 1:
      return { label: 'Beginner', color: '#22C55E' }
    case 2:
      return { label: 'Easy', color: '#84CC16' }
    case 3:
      return { label: 'Intermediate', color: '#EAB308' }
    case 4:
      return { label: 'Advanced', color: '#F97316' }
    case 5:
      return { label: 'Expert', color: '#EF4444' }
    default:
      return { label: 'Unknown', color: '#6B7280' }
  }
}

// ML Relevance display
export const mlRelevanceInfo: Record<MLRelevance, { label: string; color: string }> = {
  core: { label: 'Core ML', color: '#22C55E' },
  important: { label: 'Important', color: '#3B82F6' },
  useful: { label: 'Useful', color: '#A855F7' },
  specialized: { label: 'Specialized', color: '#6B7280' },
}
