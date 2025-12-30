// Math Content Repository - Type Definitions
// Designed for undergraduate + graduate/ML-focused learning

export type Subject = 'linear_algebra' | 'probability' | 'statistics' | 'calculus';

export type CardType = 'concept' | 'formula' | 'theorem' | 'problem' | 'worked_example';

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
// 1 = Intro/Foundations
// 2 = Undergraduate basics
// 3 = Undergraduate advanced
// 4 = Graduate/Applied
// 5 = Advanced/Research-level

export interface MathCard {
  id: string;                    // Unique ID: subject_type_topic_number (e.g., "la_concept_eigenvalues_001")
  subject: Subject;
  type: CardType;
  
  // Topic hierarchy
  chapter: string;               // e.g., "eigenvalues_eigenvectors"
  topic: string;                 // e.g., "computing_eigenvalues"
  
  // Core content
  title: string;
  subtitle?: string;             // Intuitive hook or one-liner
  
  // Main content (HTML with LaTeX via KaTeX/MathJax)
  contentHtml: string;           // Primary explanation
  
  // Visual content
  visualType?: 'diagram' | 'graph' | 'animation' | 'matrix_viz' | 'geometric';
  visualDescription?: string;    // Alt text / description for generating visuals
  visualSvg?: string;            // Inline SVG for simple diagrams
  imageUrl?: string;             // External image reference
  
  // For formulas specifically
  formula?: {
    latex: string;               // Main formula in LaTeX
    name?: string;               // Named formula (e.g., "Bayes' Theorem")
    variants?: {                 // Alternative forms
      latex: string;
      description: string;
    }[];
  };
  
  // For theorems
  theorem?: {
    statement: string;           // Formal statement (LaTeX)
    proofHtml?: string;          // Proof (can be hidden/expandable)
    proofSketch?: string;        // Intuitive proof idea
  };
  
  // For problems
  problem?: {
    statementHtml: string;       // Problem statement
    hints?: string[];            // Progressive hints
    solutionHtml: string;        // Full solution
    answerShort?: string;        // Quick answer for checking
  };
  
  // For worked examples
  workedExample?: {
    problemHtml: string;         // The example problem
    steps: {
      stepNumber: number;
      description: string;       // What we're doing
      mathHtml: string;          // The math for this step
      explanation?: string;      // Why we did this
    }[];
    finalAnswer: string;
  };
  
  // Intuition builders
  intuition?: string;            // Plain English explanation
  commonMistakes?: string[];     // What students often get wrong
  realWorldApplications?: string[]; // Where this is used (especially ML applications)
  
  // Connections
  prerequisites?: string[];      // IDs of cards to understand first
  relatedCards?: string[];       // Related concepts
  nextCards?: string[];          // Natural progression
  
  // Metadata
  difficulty: DifficultyLevel;
  estimatedMinutes: number;      // 1-2 for most cards
  tags: string[];
  mlRelevance?: 'core' | 'important' | 'useful' | 'specialized'; // For ML-focused filtering
  
  // Generation metadata
  generatedAt?: string;
  generatedBy?: string;          // Model used
  reviewed?: boolean;
  version: number;
}

// Subject curriculum structure
export interface Chapter {
  id: string;
  title: string;
  description: string;
  topics: Topic[];
  order: number;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  cardTypes: CardType[];         // What types of cards this topic has
  estimatedCards: number;
  difficulty: DifficultyLevel;
  mlRelevance?: 'core' | 'important' | 'useful' | 'specialized';
}

export interface SubjectCurriculum {
  subject: Subject;
  title: string;
  description: string;
  targetAudience: string[];
  totalEstimatedCards: number;
  chapters: Chapter[];
}

// Index file structure
export interface SubjectIndex {
  subject: Subject;
  lastUpdated: string;
  totalCards: number;
  cardsByType: Record<CardType, number>;
  cardsByDifficulty: Record<DifficultyLevel, number>;
  chapters: {
    id: string;
    title: string;
    cardCount: number;
  }[];
  allCardIds: string[];
}

// Difficulty colors (similar to Codeforces rating colors)
export const getDifficultyColor = (level: DifficultyLevel): string => {
  switch (level) {
    case 1: return '#00CF00';  // Green - Foundations
    case 2: return '#03A89E';  // Cyan - Undergraduate basics
    case 3: return '#0000FF';  // Blue - Undergraduate advanced
    case 4: return '#AA00AA';  // Purple - Graduate
    case 5: return '#FF8C00';  // Orange - Advanced
    default: return '#808080';
  }
};

export const getDifficultyLabel = (level: DifficultyLevel): string => {
  switch (level) {
    case 1: return 'Foundations';
    case 2: return 'Undergraduate I';
    case 3: return 'Undergraduate II';
    case 4: return 'Graduate';
    case 5: return 'Advanced';
    default: return 'Unknown';
  }
};

export const getSubjectEmoji = (subject: Subject): string => {
  switch (subject) {
    case 'linear_algebra': return '📐';
    case 'probability': return '🎲';
    case 'statistics': return '📊';
    case 'calculus': return '∫';
    default: return '📚';
  }
};

export const getCardTypeEmoji = (type: CardType): string => {
  switch (type) {
    case 'concept': return '💡';
    case 'formula': return '📝';
    case 'theorem': return '📜';
    case 'problem': return '✏️';
    case 'worked_example': return '📖';
    default: return '📄';
  }
};

