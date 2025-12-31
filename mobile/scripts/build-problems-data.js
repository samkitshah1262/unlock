#!/usr/bin/env node

/**
 * Build script to process codeforces-data into a bundled JSON file for the mobile app
 */

const fs = require('fs')
const path = require('path')

const CODEFORCES_DATA_DIR = path.join(__dirname, '../../codeforces-data')
const OUTPUT_FILE = path.join(__dirname, '../src/data/problems.json')

// Strip MathJax HTML and simplify - aggressive cleanup
function cleanHtml(html) {
  if (!html) return ''
  
  let cleaned = html
  
  // First, extract and replace script tags with their content wrapped in <b>
  cleaned = cleaned.replace(/<script type="math\/tex[^>]*>([^<]+)<\/script>/g, (match, content) => {
    // Clean up the LaTeX content for display
    const readable = content
      .replace(/\\le/g, '≤')
      .replace(/\\ge/g, '≥')
      .replace(/\\ne/g, '≠')
      .replace(/\\ldots/g, '...')
      .replace(/\\cdot/g, '×')
      .replace(/\\oplus/g, '⊕')
      .replace(/\\times/g, '×')
      .replace(/\\mathtt\{([^}]+)\}/g, '$1')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\^\{([^}]+)\}/g, '^$1')
      .replace(/_\{([^}]+)\}/g, '_$1')
      .replace(/\\begin\{cases\}[\s\S]*?\\end\{cases\}/g, '[conditions]')
      .replace(/\\/g, '')
    return `<b>${readable}</b>`
  })
  
  // Remove all MathJax spans and related elements
  cleaned = cleaned.replace(/<span class="MathJax_Preview"[^>]*>.*?<\/span>/gs, '')
  cleaned = cleaned.replace(/<span class="MathJax"[^>]*>[\s\S]*?<\/span>(?=<b>|<script|<\/p>|<\/li>|\s|$)/g, '')
  cleaned = cleaned.replace(/<span class="MJX_Assistive_MathML"[^>]*>[\s\S]*?<\/span>/g, '')
  cleaned = cleaned.replace(/<math[^>]*>[\s\S]*?<\/math>/g, '')
  cleaned = cleaned.replace(/<nobr[^>]*>[\s\S]*?<\/nobr>/g, '')
  
  // Remove remaining orphaned MathJax spans
  cleaned = cleaned.replace(/<span class="math"[^>]*>[\s\S]*?<\/span>/g, '')
  cleaned = cleaned.replace(/<span class="mrow"[^>]*>[\s\S]*?<\/span>/g, '')
  cleaned = cleaned.replace(/<span class="mn"[^>]*>[\s\S]*?<\/span>/g, '')
  cleaned = cleaned.replace(/<span class="mi"[^>]*>[\s\S]*?<\/span>/g, '')
  cleaned = cleaned.replace(/<span class="mo"[^>]*>[\s\S]*?<\/span>/g, '')
  cleaned = cleaned.replace(/<span class="msubsup"[^>]*>[\s\S]*?<\/span>/g, '')
  cleaned = cleaned.replace(/<span class="texatom"[^>]*>[\s\S]*?<\/span>/g, '')
  cleaned = cleaned.replace(/<span class="mtable"[^>]*>[\s\S]*?<\/span>/g, '')
  cleaned = cleaned.replace(/<span class="mtd"[^>]*>[\s\S]*?<\/span>/g, '')
  
  // Remove any remaining spans with MathJax-related IDs or styles
  cleaned = cleaned.replace(/<span[^>]*(?:MathJax|style="[^"]*position: absolute)[^>]*>[\s\S]*?<\/span>/g, '')
  
  // Clean up remaining empty/broken spans
  cleaned = cleaned.replace(/<span[^>]*>\s*<\/span>/g, '')
  cleaned = cleaned.replace(/<span style="[^"]*">\s*<\/span>/g, '')
  
  // Remove display divs for math
  cleaned = cleaned.replace(/<div class="MathJax_Display"[^>]*>[\s\S]*?<\/div>/g, '')
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')
  cleaned = cleaned.replace(/>\s+</g, '><')
  cleaned = cleaned.replace(/\s+>/g, '>')
  cleaned = cleaned.replace(/<\s+/g, '<')
  
  // Remove empty paragraphs and list items
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '')
  cleaned = cleaned.replace(/<li>\s*<\/li>/g, '')
  
  // Remove non-standard HTML5 tags
  cleaned = cleaned.replace(/<center[^>]*>([\s\S]*?)<\/center>/gi, '$1')
  cleaned = cleaned.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1')
  
  return cleaned.trim()
}

// Format samples properly - split by newlines
function formatSamples(samples) {
  if (!samples || !Array.isArray(samples)) return []
  
  return samples.map(sample => {
    // The samples often have concatenated inputs/outputs, try to format them better
    let input = (sample.input || '').trim()
    let output = (sample.output || '').trim()
    
    // Add newlines between numbers for better readability if they're all concatenated
    // This is a heuristic - the data sometimes has formatting issues
    
    return {
      input: input,
      output: output
    }
  })
}

async function buildProblemsData() {
  console.log('Reading index.json...')
  const indexPath = path.join(CODEFORCES_DATA_DIR, 'index.json')
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  
  const problems = []
  let processedCount = 0
  let errorCount = 0
  
  console.log(`Processing ${index.length} contests...`)
  
  for (const contest of index) {
    const contestDir = path.join(CODEFORCES_DATA_DIR, 'contests', contest.id.toString())
    
    if (!fs.existsSync(contestDir)) {
      continue
    }
    
    for (const problemMeta of contest.problems) {
      const problemPath = path.join(contestDir, 'problems', `${problemMeta.index}.json`)
      
      if (!fs.existsSync(problemPath)) {
        continue
      }
      
      try {
        const problemData = JSON.parse(fs.readFileSync(problemPath, 'utf8'))
        
        const problem = {
          id: `${contest.id}-${problemMeta.index}`,
          contestId: contest.id,
          index: problemMeta.index,
          title: problemData.title || problemMeta.title,
          contestName: contest.name,
          rating: problemData.rating || problemMeta.rating,
          tags: problemData.tags || problemMeta.tags || [],
          timeLimit: problemData.timeLimit || '1 second',
          memoryLimit: (problemData.memoryLimit || '256 megabytes').replace('megabytes', 'MB'),
          url: problemData.url || `https://codeforces.com/contest/${contest.id}/problem/${problemMeta.index}`,
          statementHtml: cleanHtml(problemData.statementHtml),
          inputSpecHtml: cleanHtml(problemData.inputSpecHtml),
          outputSpecHtml: cleanHtml(problemData.outputSpecHtml),
          noteHtml: cleanHtml(problemData.noteHtml),
          samples: formatSamples(problemData.samples),
        }
        
        // Add tutorial if available
        if (problemData.tutorialHtml) {
          problem.tutorialHtml = cleanHtml(problemData.tutorialHtml)
        }
        
        problems.push(problem)
        
        processedCount++
      } catch (err) {
        errorCount++
      }
    }
  }
  
  console.log(`Processed ${processedCount} problems (${errorCount} errors)`)
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(problems, null, 2))
  console.log(`Written to ${OUTPUT_FILE}`)
  console.log(`Total problems: ${problems.length}`)
}

buildProblemsData().catch(console.error)
