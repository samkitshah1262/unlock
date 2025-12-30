#!/usr/bin/env node
/**
 * Math Content Generator
 * 
 * Uses Ollama to generate high-quality math content cards
 * for Linear Algebra, Probability, Statistics, and Calculus.
 * 
 * Usage:
 *   node generate-content.js --subject linear_algebra --chapter vectors_spaces
 *   node generate-content.js --subject probability --all
 *   node generate-content.js --topic gradient_descent
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  ollamaUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate',
  // Use a capable model for math content
  model: process.env.OLLAMA_MODEL || 'llama3:latest',
  // Alternative models: 'mistral:latest', 'codellama:latest', 'deepseek-math:latest'
  temperature: 0.3,
  maxTokens: 4000,
  outputDir: path.join(__dirname),
  batchSize: 3,  // Process 3 cards at a time
  delayBetweenRequests: 2000,  // 2 seconds between requests
};

// Subject emoji and colors
const SUBJECT_META = {
  linear_algebra: { emoji: '📐', color: '\x1b[36m' },
  probability: { emoji: '🎲', color: '\x1b[33m' },
  statistics: { emoji: '📊', color: '\x1b[32m' },
  calculus: { emoji: '∫', color: '\x1b[35m' },
};

// Card type prompts
const CARD_TYPE_PROMPTS = {
  concept: `Generate a CONCEPT card that explains a mathematical idea.
Include:
- Clear, intuitive explanation (2-3 paragraphs)
- Why this concept matters
- Geometric/visual intuition if applicable
- Connection to real-world applications (especially ML/AI)
- Common misconceptions to avoid`,

  formula: `Generate a FORMULA card presenting a key mathematical formula.
Include:
- The main formula in LaTeX
- What each symbol/variable represents
- When and why to use this formula
- Special cases or variations
- A quick example showing how to apply it`,

  theorem: `Generate a THEOREM card presenting a mathematical theorem.
Include:
- Formal statement of the theorem in LaTeX
- Intuitive explanation of what it means
- Key conditions/hypotheses required
- Brief proof sketch (optional but helpful)
- Important implications and applications`,

  problem: `Generate a PROBLEM card for practice.
Include:
- Clear problem statement
- 2-3 progressive hints
- Complete step-by-step solution
- Final answer clearly marked
- Common mistakes students make on this type of problem`,

  worked_example: `Generate a WORKED EXAMPLE card showing how to solve a problem step-by-step.
Include:
- The problem statement
- 4-6 clear solution steps
- For each step: what we're doing, the math, and WHY we did it
- Final answer
- Key takeaways or patterns to notice`,
};

// System prompt for math content generation
const SYSTEM_PROMPT = `You are an expert mathematics educator creating content for an interactive learning app.
Your audience is undergraduate and graduate students, plus ML/AI practitioners.

CRITICAL REQUIREMENTS:
1. Use LaTeX for ALL mathematical expressions, wrapped in \\( \\) for inline or \\[ \\] for display
2. Be precise but intuitive - explain the "why" not just the "what"
3. Keep content concise (1-2 minute read time)
4. Include ML/AI applications when relevant
5. Use concrete examples, not abstract hand-waving
6. Output valid JSON only - no markdown outside JSON strings

LaTeX examples:
- Inline: "The dot product \\(\\mathbf{a} \\cdot \\mathbf{b}\\) equals..."
- Display: "\\[\\det(A) = \\sum_{\\sigma} \\text{sgn}(\\sigma) \\prod_{i} a_{i,\\sigma(i)}\\]"`;

/**
 * Load curriculum for a subject
 */
function loadCurriculum(subject) {
  const curriculumPath = path.join(__dirname, 'curricula', `${subject.replace('_', '-')}.json`);
  if (!fs.existsSync(curriculumPath)) {
    throw new Error(`Curriculum not found: ${curriculumPath}`);
  }
  return JSON.parse(fs.readFileSync(curriculumPath, 'utf-8'));
}

/**
 * Generate a unique card ID
 */
function generateCardId(subject, type, topic, index) {
  const subjectPrefix = {
    linear_algebra: 'la',
    probability: 'prob',
    statistics: 'stat',
    calculus: 'calc',
  }[subject] || subject.slice(0, 4);
  
  const typePrefix = {
    concept: 'con',
    formula: 'for',
    theorem: 'thm',
    problem: 'prb',
    worked_example: 'wex',
  }[type] || type.slice(0, 3);
  
  return `${subjectPrefix}_${typePrefix}_${topic}_${String(index).padStart(3, '0')}`;
}

/**
 * Create generation prompt for a specific card
 */
function createPrompt(subject, chapter, topic, cardType, cardNumber, totalCards) {
  const curriculum = loadCurriculum(subject);
  const chapterData = curriculum.chapters.find(c => c.id === chapter);
  const topicData = chapterData?.topics.find(t => t.id === topic);
  
  if (!chapterData || !topicData) {
    throw new Error(`Topic not found: ${chapter}/${topic}`);
  }
  
  return `${CARD_TYPE_PROMPTS[cardType]}

SUBJECT: ${curriculum.title}
CHAPTER: ${chapterData.title}
TOPIC: ${topicData.title}
DESCRIPTION: ${topicData.description}
DIFFICULTY LEVEL: ${topicData.difficulty} (1=intro, 5=advanced)
ML RELEVANCE: ${topicData.mlRelevance || 'general'}
CARD NUMBER: ${cardNumber} of ${totalCards} for this topic

Generate the content as a JSON object with this EXACT structure:
{
  "title": "Clear, specific title",
  "subtitle": "One-line hook or intuition (optional)",
  "contentHtml": "Main explanation with LaTeX. Use <p>, <ul>, <li> tags.",
  "formula": {
    "latex": "Main formula if applicable (omit for concepts)",
    "name": "Named formula if it has one",
    "variants": [{"latex": "...", "description": "..."}]
  },
  "theorem": {
    "statement": "Formal statement in LaTeX (for theorem cards only)",
    "proofSketch": "Brief proof idea"
  },
  "problem": {
    "statementHtml": "Problem statement (for problem cards)",
    "hints": ["Hint 1", "Hint 2", "Hint 3"],
    "solutionHtml": "Full solution with steps",
    "answerShort": "Quick answer"
  },
  "workedExample": {
    "problemHtml": "The example problem",
    "steps": [
      {"stepNumber": 1, "description": "What we do", "mathHtml": "The math", "explanation": "Why"}
    ],
    "finalAnswer": "The answer"
  },
  "intuition": "Plain English explanation of the key insight",
  "visualDescription": "Description of a helpful diagram (for generating visuals later)",
  "commonMistakes": ["Mistake 1", "Mistake 2"],
  "realWorldApplications": ["Application 1 (ML/AI focused if possible)"],
  "tags": ["relevant", "tags"],
  "estimatedMinutes": 2
}

Only include the relevant sections for this card type. Output ONLY the JSON, no other text.`;
}

/**
 * Call Ollama API
 */
async function callOllama(prompt) {
  const response = await fetch(CONFIG.ollamaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CONFIG.model,
      prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
      stream: false,
      options: {
        temperature: CONFIG.temperature,
        num_predict: CONFIG.maxTokens,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.response;
}

/**
 * Parse JSON from LLM response - handles LaTeX and other escape issues
 */
function parseJsonResponse(response) {
  // Try direct parse first
  try {
    return JSON.parse(response);
  } catch (e) {
    // Extract JSON block from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    let jsonStr = jsonMatch[0];
    
    // Strategy 1: Replace control characters inside strings
    // This regex finds string content and fixes newlines/tabs
    try {
      jsonStr = jsonStr.replace(/"((?:[^"\\]|\\.)*)"/g, (match, content) => {
        const fixed = content
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')  
          .replace(/\t/g, '\\t');
        return `"${fixed}"`;
      });
      // Fix trailing commas
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      return JSON.parse(jsonStr);
    } catch (e2) {
      // Strategy 2: More aggressive - strip all control characters
      try {
        const aggressive = jsonMatch[0]
          .replace(/[\x00-\x1F\x7F]/g, ' ')  // Replace control chars with space
          .replace(/,(\s*[}\]])/g, '$1');    // Fix trailing commas
        return JSON.parse(aggressive);
      } catch (e3) {
        // Strategy 3: Extract key-value pairs manually
        try {
          const lines = jsonMatch[0].split('\n');
          const obj = {};
          let currentKey = null;
          let currentValue = '';
          
          for (const line of lines) {
            const keyMatch = line.match(/^\s*"(\w+)":\s*(.*)$/);
            if (keyMatch) {
              if (currentKey) {
                try {
                  obj[currentKey] = JSON.parse(currentValue.replace(/,\s*$/, ''));
                } catch { obj[currentKey] = currentValue.trim().replace(/^"|"$/g, ''); }
              }
              currentKey = keyMatch[1];
              currentValue = keyMatch[2];
            } else if (currentKey) {
              currentValue += ' ' + line.trim();
            }
          }
          if (currentKey && Object.keys(obj).length > 0) {
            return obj;
          }
        } catch (e4) {
          // Give up
        }
        console.error('JSON parse error:', e3.message);
        return null;
      }
    }
  }
}

/**
 * Generate a single card
 */
async function generateCard(subject, chapter, topic, cardType, cardNumber, totalCards) {
  const id = generateCardId(subject, cardType, topic, cardNumber);
  console.log(`  Generating: ${id}`);
  
  try {
    const prompt = createPrompt(subject, chapter, topic, cardType, cardNumber, totalCards);
    const response = await callOllama(prompt);
    const content = parseJsonResponse(response);
    
    if (!content) {
      console.error(`  ❌ Failed to parse response for ${id}`);
      return null;
    }
    
    // Build complete card
    const curriculum = loadCurriculum(subject);
    const chapterData = curriculum.chapters.find(c => c.id === chapter);
    const topicData = chapterData?.topics.find(t => t.id === topic);
    
    const card = {
      id,
      subject,
      type: cardType,
      chapter,
      topic,
      ...content,
      difficulty: topicData.difficulty,
      mlRelevance: topicData.mlRelevance,
      prerequisites: [],
      relatedCards: [],
      nextCards: [],
      generatedAt: new Date().toISOString(),
      generatedBy: CONFIG.model,
      reviewed: false,
      version: 1,
    };
    
    console.log(`  ✅ Generated: ${content.title}`);
    return card;
  } catch (error) {
    console.error(`  ❌ Error generating ${id}:`, error.message);
    return null;
  }
}

/**
 * Generate all cards for a topic
 */
async function generateTopicCards(subject, chapter, topic) {
  const curriculum = loadCurriculum(subject);
  const chapterData = curriculum.chapters.find(c => c.id === chapter);
  const topicData = chapterData?.topics.find(t => t.id === topic);
  
  if (!topicData) {
    throw new Error(`Topic not found: ${topic}`);
  }
  
  const { emoji, color } = SUBJECT_META[subject];
  const reset = '\x1b[0m';
  
  console.log(`\n${color}${emoji} Generating cards for: ${topicData.title}${reset}`);
  console.log(`   Types: ${topicData.cardTypes.join(', ')}`);
  console.log(`   Estimated cards: ${topicData.estimatedCards}`);
  
  const cards = [];
  let cardNumber = 1;
  
  // Distribute cards across types
  const cardsPerType = Math.ceil(topicData.estimatedCards / topicData.cardTypes.length);
  
  for (const cardType of topicData.cardTypes) {
    const numCards = cardType === 'concept' ? Math.min(3, cardsPerType) :
                     cardType === 'formula' ? Math.min(4, cardsPerType) :
                     cardType === 'theorem' ? Math.min(2, cardsPerType) :
                     cardsPerType;
    
    for (let i = 0; i < numCards; i++) {
      const card = await generateCard(
        subject, chapter, topic, cardType,
        cardNumber, topicData.estimatedCards
      );
      
      if (card) {
        cards.push(card);
        cardNumber++;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));
    }
  }
  
  return cards;
}

/**
 * Generate all cards for a chapter
 */
async function generateChapterCards(subject, chapterId) {
  const curriculum = loadCurriculum(subject);
  const chapter = curriculum.chapters.find(c => c.id === chapterId);
  
  if (!chapter) {
    throw new Error(`Chapter not found: ${chapterId}`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📚 Chapter: ${chapter.title}`);
  console.log(`${'='.repeat(60)}`);
  
  const allCards = [];
  
  for (const topic of chapter.topics) {
    const cards = await generateTopicCards(subject, chapterId, topic.id);
    allCards.push(...cards);
    
    // Save intermediate results
    saveCards(subject, chapterId, topic.id, cards);
  }
  
  return allCards;
}

/**
 * Generate all cards for a subject
 */
async function generateSubjectCards(subject) {
  const curriculum = loadCurriculum(subject);
  const { emoji, color } = SUBJECT_META[subject];
  const reset = '\x1b[0m';
  
  console.log(`\n${'#'.repeat(60)}`);
  console.log(`${color}${emoji} Subject: ${curriculum.title}${reset}`);
  console.log(`   ${curriculum.description}`);
  console.log(`   Estimated total cards: ${curriculum.totalEstimatedCards}`);
  console.log(`${'#'.repeat(60)}`);
  
  const allCards = [];
  
  for (const chapter of curriculum.chapters) {
    const cards = await generateChapterCards(subject, chapter.id);
    allCards.push(...cards);
  }
  
  // Save subject index
  saveSubjectIndex(subject, allCards);
  
  return allCards;
}

/**
 * Save generated cards to files
 */
function saveCards(subject, chapter, topic, cards) {
  const subjectDir = path.join(CONFIG.outputDir, subject.replace('_', '-'));
  const topicDir = path.join(subjectDir, chapter);
  
  // Ensure directory exists
  fs.mkdirSync(topicDir, { recursive: true });
  
  // Group cards by type
  const byType = {};
  for (const card of cards) {
    if (!byType[card.type]) byType[card.type] = [];
    byType[card.type].push(card);
  }
  
  // Save each type to its own file
  for (const [type, typeCards] of Object.entries(byType)) {
    const filename = `${topic}_${type}s.json`;
    const filepath = path.join(topicDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(typeCards, null, 2));
    console.log(`  💾 Saved: ${filepath} (${typeCards.length} cards)`);
  }
  
  // Also save combined topic file
  const combinedPath = path.join(topicDir, `${topic}.json`);
  fs.writeFileSync(combinedPath, JSON.stringify(cards, null, 2));
}

/**
 * Save subject index
 */
function saveSubjectIndex(subject, allCards) {
  const index = {
    subject,
    lastUpdated: new Date().toISOString(),
    totalCards: allCards.length,
    cardsByType: {},
    cardsByDifficulty: {},
    chapters: [],
    allCardIds: allCards.map(c => c.id),
  };
  
  // Count by type
  for (const card of allCards) {
    index.cardsByType[card.type] = (index.cardsByType[card.type] || 0) + 1;
    index.cardsByDifficulty[card.difficulty] = (index.cardsByDifficulty[card.difficulty] || 0) + 1;
  }
  
  // Group by chapter
  const chapterCounts = {};
  for (const card of allCards) {
    chapterCounts[card.chapter] = (chapterCounts[card.chapter] || 0) + 1;
  }
  
  const curriculum = loadCurriculum(subject);
  index.chapters = curriculum.chapters.map(ch => ({
    id: ch.id,
    title: ch.title,
    cardCount: chapterCounts[ch.id] || 0,
  }));
  
  const indexPath = path.join(CONFIG.outputDir, subject.replace('_', '-'), 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n📋 Subject index saved: ${indexPath}`);
}

/**
 * Main CLI
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let subject = null;
  let chapter = null;
  let topic = null;
  let all = false;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--subject':
      case '-s':
        subject = args[++i];
        break;
      case '--chapter':
      case '-c':
        chapter = args[++i];
        break;
      case '--topic':
      case '-t':
        topic = args[++i];
        break;
      case '--all':
      case '-a':
        all = true;
        break;
      case '--model':
      case '-m':
        CONFIG.model = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Math Content Generator

Usage:
  node generate-content.js --subject <subject> [options]

Subjects:
  linear_algebra, probability, statistics, calculus

Options:
  -s, --subject <name>   Subject to generate content for
  -c, --chapter <id>     Generate only this chapter
  -t, --topic <id>       Generate only this topic
  -a, --all              Generate all content for subject
  -m, --model <name>     Ollama model to use (default: llama3.2:latest)
  -h, --help             Show this help

Examples:
  node generate-content.js -s linear_algebra -c eigenvalues_eigenvectors
  node generate-content.js -s probability -t bayes_theorem
  node generate-content.js -s calculus --all
        `);
        process.exit(0);
    }
  }
  
  if (!subject) {
    console.error('Error: --subject is required');
    process.exit(1);
  }
  
  console.log(`\n🧮 Math Content Generator`);
  console.log(`   Model: ${CONFIG.model}`);
  console.log(`   Subject: ${subject}`);
  
  try {
    if (topic && chapter) {
      const cards = await generateTopicCards(subject, chapter, topic);
      // Save the generated cards
      if (cards.length > 0) {
        saveCards(subject, chapter, topic, cards);
        console.log(`\n📊 Generated ${cards.length} cards`);
      }
    } else if (chapter) {
      await generateChapterCards(subject, chapter);
    } else if (all) {
      await generateSubjectCards(subject);
    } else {
      console.log('\nSpecify --chapter, --topic, or --all');
      console.log('Use --help for more information');
    }
    
    console.log('\n✅ Generation complete!');
  } catch (error) {
    console.error('\n❌ Generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateCard,
  generateTopicCards,
  generateChapterCards,
  generateSubjectCards,
  loadCurriculum,
  CONFIG,
};

