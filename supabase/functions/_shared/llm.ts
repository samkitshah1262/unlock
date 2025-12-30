// Local LLM Integration using Ollama (MiniCPM-o2.6)
// Ollama running locally on port 11434

const OLLAMA_API_URL = Deno.env.get('OLLAMA_API_URL') || 'http://host.docker.internal:11434/api/generate'
const OLLAMA_MODEL = Deno.env.get('OLLAMA_MODEL') || 'openbmb/minicpm-o2.6:latest'

interface LLMResponse {
  title: string
  summary: string
  body: string
  key_points: string[]
  tags: string[]
  read_time_minutes: number
}

export async function parseContentWithLLM(
  content: string,
  contentType: 'tech' | 'finance' | 'book',
  groqApiKey?: string // Optional now, not used for Ollama
): Promise<LLMResponse> {
  const prompts = {
    tech: `You are a tech content curator. Extract and format the COMPLETE article content.

INPUT: ${content.slice(0, 8000)}

OUTPUT (JSON only, no other text):
{
  "title": "Engaging title (max 100 chars)",
  "summary": "2-3 sentence summary of main point",
  "body": "COMPLETE article content - include ALL paragraphs, details, examples. Preserve structure with markdown formatting (use **bold**, *italic*, lists, code blocks). Include all important information. Minimum 800 words, can be 1500+ words for long articles.",
  "key_points": ["Key insight 1", "Key insight 2", "Key insight 3", "Key insight 4"],
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "read_time_minutes": 5
}

Rules: 
- Include the ENTIRE article content, not just a summary
- Remove only ads, navigation, and footer/header cruft
- Keep all technical details, examples, and explanations
- Use markdown for formatting (headers, lists, code blocks, bold/italic)
- Preserve the article's structure and flow`,

    finance: `You are a finance content curator. Extract the COMPLETE article content.

INPUT: ${content.slice(0, 8000)}

OUTPUT (JSON only, no other text):
{
  "title": "Clear title without clickbait",
  "summary": "What happened and why it matters (2-3 sentences)",
  "body": "COMPLETE article content - include ALL paragraphs, explanations, examples, data. Preserve structure with markdown formatting. Explain jargon simply but include all details. Minimum 800 words, can be 1500+ words for long articles.",
  "key_points": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3", "Key takeaway 4"],
  "tags": ["stocks", "economy", "markets"],
  "read_time_minutes": 5
}

Rules:
- Include the ENTIRE article content
- Remove only ads and navigation
- Keep all financial data, explanations, and context
- Use markdown formatting for readability
- Explain technical terms but keep all content`,

    book: `You are a book summary curator. Extract the COMPLETE book summary with all key lessons.

INPUT: ${content.slice(0, 8000)}

OUTPUT (JSON only, no other text):
{
  "title": "Book Title by Author",
  "summary": "What this book is about (2-3 sentences)",
  "body": "COMPLETE summary with ALL main lessons, insights, examples, and actionable takeaways. Use markdown formatting. Include all key concepts the book covers. Minimum 1000 words, can be 2000+ words for comprehensive summaries.",
  "key_points": ["Key lesson 1", "Key lesson 2", "Key lesson 3", "Key lesson 4", "Key lesson 5"],
  "tags": ["self-help", "business", "psychology"],
  "read_time_minutes": 6
}

Rules:
- Include ALL lessons and insights from the summary
- Preserve examples and actionable takeaways
- Use markdown for formatting
- Make it comprehensive and memorable`
  }

  try {
    console.log(`🤖 Using Ollama (${OLLAMA_MODEL}) at ${OLLAMA_API_URL}`)
    
    // Simpler prompt that focuses on extraction, not generation
    const simplePrompt = `Extract the following information from this article and return ONLY valid JSON:

ARTICLE:
${content.slice(0, 6000)}

Return this exact JSON structure (no other text, no markdown, just JSON):
{
  "title": "article title here",
  "summary": "brief 2-3 sentence summary",
  "body": "full article text with key details",
  "key_points": ["point 1", "point 2", "point 3"],
  "tags": ["tag1", "tag2", "tag3"],
  "read_time_minutes": 5
}`
    
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: simplePrompt,
        stream: false,
        options: {
          temperature: 0.1,  // Lower temperature for more consistent JSON
          num_predict: 2000  // Reduced to speed up
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    let responseText = data.response || ''
    
    console.log(`📝 LLM Response (first 200 chars): ${responseText.slice(0, 200)}`)

    // Try multiple strategies to extract valid JSON
    let parsed = null
    
    // Strategy 1: Try direct parse
    try {
      parsed = JSON.parse(responseText)
    } catch (e) {
      // Strategy 2: Extract JSON between curly braces
      const jsonMatch = responseText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s)
      if (jsonMatch) {
        try {
          // Clean up common issues
          let cleaned = jsonMatch[0]
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
          parsed = JSON.parse(cleaned)
        } catch (e2) {
          console.error('Failed to parse extracted JSON:', e2.message)
        }
      }
    }
    
    if (!parsed) {
      throw new Error('Could not extract valid JSON from LLM response')
    }

    // Validate and return with defaults
    return {
      title: parsed.title || 'Content Title',
      summary: parsed.summary || content.slice(0, 200),
      body: parsed.body || content.slice(0, 2000),
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : ['See full content'],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [contentType],
      read_time_minutes: parsed.read_time_minutes || 5
    }
  } catch (error) {
    console.error('LLM parsing error:', error)
    // Return fallback with actual content
    return {
      title: content.split('\n')[0].slice(0, 100) || 'Content Title',
      summary: content.slice(0, 300),
      body: content.slice(0, 3000),
      key_points: ['See full content above'],
      tags: [contentType],
      read_time_minutes: 5
    }
  }
}
