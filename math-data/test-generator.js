#!/usr/bin/env node
/**
 * Quick test of the content generator with Ollama
 * Generates a single concept card for eigenvalues
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  ollamaUrl: 'http://localhost:11434/api/generate',
  model: 'llama3:latest',
  temperature: 0.3,
  maxTokens: 3000,
};

const SYSTEM_PROMPT = `You are an expert mathematics educator creating content for an interactive learning app.
Your audience is undergraduate and graduate students, plus ML/AI practitioners.

CRITICAL REQUIREMENTS:
1. Use LaTeX for ALL mathematical expressions, wrapped in \\( \\) for inline or \\[ \\] for display
2. Be precise but intuitive - explain the "why" not just the "what"
3. Keep content concise (1-2 minute read time)
4. Include ML/AI applications when relevant
5. Use concrete examples, not abstract hand-waving
6. Output valid JSON only - no markdown outside JSON strings`;

const PROMPT = `Generate a CONCEPT card that explains eigenvalues and eigenvectors.

Include:
- Clear, intuitive explanation (2-3 paragraphs)
- Why this concept matters
- Geometric/visual intuition
- Connection to ML/AI applications
- Common misconceptions to avoid

SUBJECT: Linear Algebra
CHAPTER: Eigenvalues and Eigenvectors
TOPIC: Eigenvalue Fundamentals
DIFFICULTY LEVEL: 3 (1=intro, 5=advanced)
ML RELEVANCE: core

Generate the content as a JSON object with this structure:
{
  "title": "Clear, specific title",
  "subtitle": "One-line hook or intuition",
  "contentHtml": "Main explanation with LaTeX. Use <p> tags for paragraphs.",
  "intuition": "Plain English explanation of the key insight",
  "visualDescription": "Description of a helpful diagram",
  "commonMistakes": ["Mistake 1", "Mistake 2"],
  "realWorldApplications": ["Application 1", "Application 2"],
  "tags": ["relevant", "tags"],
  "estimatedMinutes": 2
}

Output ONLY the JSON, no other text.`;

async function testGenerator() {
  console.log('🧪 Testing Math Content Generator');
  console.log(`   Model: ${CONFIG.model}`);
  console.log(`   URL: ${CONFIG.ollamaUrl}\n`);
  
  console.log('⏳ Generating eigenvalue concept card...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(CONFIG.ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.model,
        prompt: `${SYSTEM_PROMPT}\n\n${PROMPT}`,
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
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Response received in ${elapsed}s\n`);
    console.log('─'.repeat(60));
    console.log('RAW RESPONSE:');
    console.log('─'.repeat(60));
    console.log(data.response);
    console.log('─'.repeat(60));
    
    // Try to parse JSON  
    let parsed = null;
    
    // Extract JSON block from response
    const jsonMatch = data.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('\n⚠️  No JSON found in response');
      return;
    }
    
    let jsonStr = jsonMatch[0];
    
    // Fix common JSON issues from LLM responses
    // 1. Replace literal newlines/tabs in string values with escaped versions
    jsonStr = jsonStr.replace(/"([^"]*(?:\\.[^"]*)*)"/g, (match, content) => {
      const fixed = content
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `"${fixed}"`;
    });
    
    // 2. Fix trailing commas
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.log('\n⚠️  JSON parse error:', e.message);
      // Try even more aggressive cleanup
      try {
        const aggressive = jsonStr
          .replace(/[\x00-\x1F]/g, ' ')  // Replace all control chars with space
          .replace(/\s+/g, ' ');  // Collapse whitespace
        parsed = JSON.parse(aggressive);
      } catch (e2) {
        console.log('❌ Could not parse even with aggressive cleanup');
        console.log('First 500 chars:', jsonStr.slice(0, 500));
      }
    }
    
    if (parsed) {
      console.log('\n✅ PARSED SUCCESSFULLY:');
      console.log('─'.repeat(60));
      console.log(JSON.stringify(parsed, null, 2));
      
      // Save to file
      const outputPath = path.join(__dirname, 'test-output.json');
      const fullCard = {
        id: 'la_con_eigen_basics_test',
        subject: 'linear_algebra',
        type: 'concept',
        chapter: 'eigenvalues_eigenvectors',
        topic: 'eigen_basics',
        ...parsed,
        difficulty: 3,
        mlRelevance: 'core',
        generatedAt: new Date().toISOString(),
        generatedBy: CONFIG.model,
        reviewed: false,
        version: 1,
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(fullCard, null, 2));
      console.log(`\n💾 Saved to: ${outputPath}`);
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testGenerator();

