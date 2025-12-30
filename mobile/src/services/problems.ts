// Codeforces Problems Service - Uses bundled data from codeforces-data

import type { ProblemCard } from '../types/codeforces'
import problemsData from '../data/problems.json'

// Type assertion for the imported JSON
const allProblems = problemsData as ProblemCard[]

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Get random problems
export function getRandomProblems(count: number = 30): ProblemCard[] {
  const shuffled = shuffleArray(allProblems)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

// Get all problems
export function getAllProblems(): ProblemCard[] {
  return allProblems
}

// Get total count
export function getTotalProblemsCount(): number {
  return allProblems.length
}
