# 🧮 Math Content Repository

A comprehensive collection of math learning content covering Linear Algebra, Probability, Statistics, and Calculus—with a focus on ML/AI applications.

## 📚 Subjects

| Subject | Cards | Chapters | ML Relevance |
|---------|-------|----------|--------------|
| 📐 Linear Algebra | ~320 | 8 | Core for ML |
| 🎲 Probability | ~310 | 7 | Core for ML |
| 📊 Statistics | ~320 | 8 | Core for ML |
| ∫ Calculus | ~350 | 8 | Core for ML |

**Total: ~1,300 cards**

## 🎯 Target Audience

- Undergraduate students
- Graduate students  
- ML practitioners
- Data scientists

## 📁 Repository Structure

```
math-data/
├── index.json              # Main index with metadata
├── types.ts                # TypeScript type definitions
├── generate-content.js     # AI content generation script
├── README.md               # This file
├── curricula/              # Subject curricula (topics, chapters)
│   ├── linear-algebra.json
│   ├── probability.json
│   ├── statistics.json
│   └── calculus.json
├── samples/                # Hand-crafted sample cards
│   ├── linear-algebra-samples.json
│   ├── probability-samples.json
│   ├── statistics-samples.json
│   └── calculus-samples.json
├── linear-algebra/         # Generated content
│   ├── index.json          # Subject index
│   ├── vectors_spaces/     # Chapter folder
│   │   ├── vector_basics.json
│   │   ├── vector_basics_concepts.json
│   │   └── ...
│   └── ...
├── probability/
├── statistics/
└── calculus/
```

## 📝 Card Types

| Type | Emoji | Purpose |
|------|-------|---------|
| **Concept** | 💡 | Core ideas and intuitions |
| **Formula** | 📝 | Key formulas with when/why to use |
| **Theorem** | 📜 | Important theorems with proofs |
| **Problem** | ✏️ | Practice problems with hints |
| **Worked Example** | 📖 | Step-by-step solutions |

## 🎚️ Difficulty Levels

1. 🟢 **Foundations** - Prerequisites, basic definitions
2. 🔵 **Undergraduate I** - Standard undergrad material
3. 🔷 **Undergraduate II** - Advanced undergrad
4. 🟣 **Graduate** - Grad-level, ML applications
5. 🟠 **Advanced** - Research-level, specialized

## 🚀 Generating Content

### Prerequisites

1. **Ollama** running locally:
   ```bash
   ollama serve
   ollama pull llama3.2:latest
   ```

2. **Node.js** 18+

### Generate Content

```bash
cd math-data

# Generate a single topic
node generate-content.js -s linear_algebra -c eigenvalues_eigenvectors -t eigen_basics

# Generate a chapter
node generate-content.js -s probability -c foundations

# Generate an entire subject
node generate-content.js -s calculus --all

# Use a different model
node generate-content.js -s statistics -c estimation --model mistral:latest
```

### Options

| Flag | Description |
|------|-------------|
| `-s, --subject` | Subject: `linear_algebra`, `probability`, `statistics`, `calculus` |
| `-c, --chapter` | Chapter ID from curriculum |
| `-t, --topic` | Specific topic ID |
| `-a, --all` | Generate all content for subject |
| `-m, --model` | Ollama model to use |

## 📐 Card Schema

```typescript
interface MathCard {
  id: string;                    // Unique ID
  subject: Subject;
  type: CardType;
  chapter: string;
  topic: string;
  
  title: string;
  subtitle?: string;             // One-line hook
  contentHtml: string;           // Main explanation (HTML + LaTeX)
  
  formula?: {
    latex: string;
    name?: string;
    variants?: { latex: string; description: string }[];
  };
  
  theorem?: {
    statement: string;
    proofSketch?: string;
  };
  
  problem?: {
    statementHtml: string;
    hints?: string[];
    solutionHtml: string;
    answerShort?: string;
  };
  
  workedExample?: {
    problemHtml: string;
    steps: { stepNumber, description, mathHtml, explanation }[];
    finalAnswer: string;
  };
  
  intuition?: string;
  visualDescription?: string;
  commonMistakes?: string[];
  realWorldApplications?: string[];
  
  difficulty: 1 | 2 | 3 | 4 | 5;
  mlRelevance?: 'core' | 'important' | 'useful' | 'specialized';
  estimatedMinutes: number;
  tags: string[];
  
  prerequisites?: string[];
  relatedCards?: string[];
  nextCards?: string[];
}
```

## 🔢 LaTeX Conventions

All math uses LaTeX wrapped in delimiters:

- **Inline**: `\\(x^2 + y^2 = r^2\\)`
- **Display**: `\\[\\int_0^\\infty e^{-x} dx = 1\\]`

Common patterns:
- Matrices: `\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}`
- Vectors: `\\mathbf{v}` (bold)
- Sets: `\\mathbb{R}^n`
- Greek: `\\alpha, \\beta, \\lambda, \\sigma`

## 🧪 Sample Cards

The `samples/` folder contains hand-crafted example cards showing the quality and format we're aiming for. Use these as reference when reviewing generated content.

## 📱 Integration with Mobile App

The generated content follows the same patterns as the Codeforces problem data. To use in the mobile app:

1. Bundle the JSON files into `mobile/src/data/`
2. Create a service similar to `problems.ts`
3. Create a `MathCard` component similar to `ProblemCard`

## 🔄 Content Review Workflow

1. **Generate** content using `generate-content.js`
2. **Review** generated cards for accuracy
3. **Mark** as `reviewed: true` once verified
4. **Bundle** into mobile app

## 📊 Estimated Generation Time

With Ollama (llama3.2) on a modern Mac:
- ~20-30 seconds per card
- ~10-15 minutes per topic
- ~2-3 hours per chapter
- ~1 day per subject (running in batches)

**Total for all 1,300 cards: ~4 days of generation time**

## 🤝 Contributing

1. Review generated content for mathematical accuracy
2. Improve prompts in `generate-content.js` for better output
3. Add more visual descriptions for diagram generation
4. Expand ML/AI application examples

