// Math Cards Service

import type { MathCard } from '../types/math'
import mathCardsData from '../data/math-cards.json'

const allCards: MathCard[] = mathCardsData as MathCard[]

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function fetchMathCards(): Promise<MathCard[]> {
  // Shuffle and return all cards
  return shuffle(allCards)
}

export function getMathCardCount(): number {
  return allCards.length
}
