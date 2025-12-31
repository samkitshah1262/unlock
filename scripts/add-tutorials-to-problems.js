#!/usr/bin/env node
/**
 * Add tutorials to problem JSON files
 * Parses tutorial.html from each contest and extracts per-problem editorials
 */

const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')

const CODEFORCES_DATA = path.join(__dirname, '../codeforces-data/contests')

function extractTutorials(tutorialHtml) {
  const $ = cheerio.load(tutorialHtml)
  const tutorials = {}
  
  // Find all problem tutorial sections
  // Tutorial structure: h3 with problem link, followed by content until next h3
  $('h3').each((_, h3) => {
    const $h3 = $(h3)
    const link = $h3.find('a').attr('href')
    
    if (link && link.includes('/problem/')) {
      // Extract problem index from URL (e.g., /contest/2068/problem/A -> A)
      const match = link.match(/\/problem\/([A-Z]\d?)/)
      if (match) {
        const problemIndex = match[1]
        
        // Get all content after this h3 until the next h3 or spoiler end
        let content = ''
        const $parent = $h3.closest('.spoiler-content')
        if ($parent.length) {
          // Get inner HTML, excluding the h3 itself
          const $clone = $parent.clone()
          $clone.find('h3').first().remove()
          content = $clone.html() || ''
        }
        
        tutorials[problemIndex] = content.trim()
      }
    }
  })
  
  return tutorials
}

function processContest(contestDir) {
  const tutorialPath = path.join(contestDir, 'tutorial.html')
  const problemsDir = path.join(contestDir, 'problems')
  
  if (!fs.existsSync(tutorialPath)) {
    console.log(`  No tutorial.html found`)
    return 0
  }
  
  if (!fs.existsSync(problemsDir)) {
    console.log(`  No problems directory found`)
    return 0
  }
  
  const tutorialHtml = fs.readFileSync(tutorialPath, 'utf-8')
  const tutorials = extractTutorials(tutorialHtml)
  
  let updated = 0
  
  // Get all problem JSON files
  const problemFiles = fs.readdirSync(problemsDir).filter(f => f.endsWith('.json'))
  
  for (const file of problemFiles) {
    const problemPath = path.join(problemsDir, file)
    const problem = JSON.parse(fs.readFileSync(problemPath, 'utf-8'))
    
    const index = problem.index
    if (tutorials[index]) {
      problem.tutorialHtml = tutorials[index]
      fs.writeFileSync(problemPath, JSON.stringify(problem, null, 2))
      updated++
      console.log(`    Added tutorial for problem ${index}`)
    }
  }
  
  return updated
}

function main() {
  console.log('Adding tutorials to Codeforces problems...\n')
  
  if (!fs.existsSync(CODEFORCES_DATA)) {
    console.error(`Codeforces data directory not found: ${CODEFORCES_DATA}`)
    process.exit(1)
  }
  
  const contests = fs.readdirSync(CODEFORCES_DATA)
    .filter(d => fs.statSync(path.join(CODEFORCES_DATA, d)).isDirectory())
  
  console.log(`Found ${contests.length} contests\n`)
  
  let totalUpdated = 0
  
  for (const contest of contests) {
    console.log(`Contest ${contest}:`)
    const contestDir = path.join(CODEFORCES_DATA, contest)
    const updated = processContest(contestDir)
    totalUpdated += updated
  }
  
  console.log(`\nDone! Updated ${totalUpdated} problems with tutorials.`)
}

main()

