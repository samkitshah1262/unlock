// Codeforces Problem Types

export interface Sample {
  input: string
  output: string
}

export interface ProblemCard {
  id: string
  contestId: number
  index: string
  title: string
  contestName: string
  rating: number | null
  tags: string[]
  timeLimit: string
  memoryLimit: string
  url: string
  // Full problem content
  statementHtml: string
  inputSpecHtml: string
  outputSpecHtml: string
  noteHtml?: string
  samples: Sample[]
  // Tutorial/Editorial (solution explanation)
  tutorialHtml?: string
}

// Difficulty color mapping based on Codeforces rating
export const getDifficultyColor = (rating: number | null): string => {
  if (!rating) return '#808080' // Gray for unrated
  if (rating < 1200) return '#808080' // Gray
  if (rating < 1400) return '#00CF00' // Green
  if (rating < 1600) return '#03A89E' // Cyan
  if (rating < 1900) return '#0000FF' // Blue
  if (rating < 2100) return '#AA00AA' // Purple
  if (rating < 2400) return '#FF8C00' // Orange
  return '#FF0000' // Red
}

export const getDifficultyLabel = (rating: number | null): string => {
  if (!rating) return 'Unrated'
  if (rating < 1200) return 'Newbie'
  if (rating < 1400) return 'Pupil'
  if (rating < 1600) return 'Specialist'
  if (rating < 1900) return 'Expert'
  if (rating < 2100) return 'Candidate Master'
  if (rating < 2400) return 'Master'
  return 'Grandmaster'
}
