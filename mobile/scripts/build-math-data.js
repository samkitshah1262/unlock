#!/usr/bin/env node
/**
 * Build script to process math-data into a single JSON for the mobile app
 */

const fs = require('fs')
const path = require('path')

const MATH_DATA_DIR = path.join(__dirname, '../../math-data')
const OUTPUT_FILE = path.join(__dirname, '../src/data/math-cards.json')

// Subject directories to scan
const SUBJECTS = ['linear-algebra', 'probability', 'statistics', 'calculus']

function getAllJsonFiles(dir) {
  const files = []
  
  function scan(currentDir) {
    if (!fs.existsSync(currentDir)) return
    
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        // Skip images directories
        if (entry.name !== 'images') {
          scan(fullPath)
        }
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Skip index files and combined topic files (we want the specific type files)
        if (!entry.name.startsWith('index') && 
            !['concepts', 'formulas', 'problems', 'theorems', 'worked_examples'].some(t => 
              entry.name === `${entry.name.split('_').slice(0, -1).join('_')}.json`
            )) {
          // Include files like *_concepts.json, *_formulas.json, etc.
          if (entry.name.includes('_concepts') || 
              entry.name.includes('_formulas') || 
              entry.name.includes('_problems') || 
              entry.name.includes('_theorems') || 
              entry.name.includes('_worked_examples')) {
            files.push(fullPath)
          }
        }
      }
    }
  }
  
  scan(dir)
  return files
}

function processCards(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const cards = JSON.parse(content)
    
    if (!Array.isArray(cards)) {
      return []
    }
    
    return cards.filter(card => 
      card && 
      card.id && 
      card.title && 
      card.contentHtml
    ).map(card => ({
      id: card.id,
      subject: card.subject,
      type: card.type,
      chapter: card.chapter,
      topic: card.topic,
      title: card.title,
      subtitle: card.subtitle || null,
      contentHtml: card.contentHtml,
      formula: card.formula || null,
      workedExample: card.workedExample || null,
      intuition: card.intuition || null,
      visualDescription: card.visualDescription || null,
      commonMistakes: card.commonMistakes || [],
      realWorldApplications: card.realWorldApplications || [],
      tags: card.tags || [],
      difficulty: card.difficulty || 2,
      mlRelevance: card.mlRelevance || 'useful',
      estimatedMinutes: card.estimatedMinutes || 2,
    }))
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`)
    return []
  }
}

function main() {
  console.log('Building math cards for mobile...')
  
  const allCards = []
  const stats = {
    bySubject: {},
    byType: {},
    byDifficulty: {},
  }
  
  // Also include the samples files which have high-quality content
  const samplesDir = path.join(MATH_DATA_DIR, 'samples')
  if (fs.existsSync(samplesDir)) {
    const sampleFiles = fs.readdirSync(samplesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(samplesDir, f))
    
    for (const file of sampleFiles) {
      const cards = processCards(file)
      allCards.push(...cards)
    }
  }
  
  // Process all subject directories
  for (const subject of SUBJECTS) {
    const subjectDir = path.join(MATH_DATA_DIR, subject)
    const files = getAllJsonFiles(subjectDir)
    
    console.log(`Found ${files.length} files in ${subject}`)
    
    for (const file of files) {
      const cards = processCards(file)
      allCards.push(...cards)
    }
  }
  
  // Deduplicate by ID
  const uniqueCards = []
  const seenIds = new Set()
  for (const card of allCards) {
    if (!seenIds.has(card.id)) {
      seenIds.add(card.id)
      uniqueCards.push(card)
      
      // Update stats
      stats.bySubject[card.subject] = (stats.bySubject[card.subject] || 0) + 1
      stats.byType[card.type] = (stats.byType[card.type] || 0) + 1
      stats.byDifficulty[card.difficulty] = (stats.byDifficulty[card.difficulty] || 0) + 1
    }
  }
  
  // Sort by subject, then by difficulty
  uniqueCards.sort((a, b) => {
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject)
    return a.difficulty - b.difficulty
  })
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueCards, null, 2))
  
  console.log(`\nProcessed ${uniqueCards.length} unique math cards`)
  console.log('\nBy Subject:', stats.bySubject)
  console.log('By Type:', stats.byType)
  console.log('By Difficulty:', stats.byDifficulty)
  console.log(`\nWritten to ${OUTPUT_FILE}`)
}

main()

