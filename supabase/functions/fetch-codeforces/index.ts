// Codeforces Problem Fetcher (recent problems)
// Fetches and parses actual problem statements, test cases, and constraints
// Uses Firecrawl scraper service with checkpoint support

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { scrapeWithRetry, getOrCreateJob, updateJobProgress } from '../_shared/scraper.ts'

interface ParsedProblem {
  title: string
  statement: string
  inputFormat: string
  outputFormat: string
  testCases: Array<{ input: string; output: string; explanation?: string }>
  constraints: string
  timeLimit: string
  memoryLimit: string
  tags: string[]
  difficulty?: string
}

function parseCodeforcesProblem(html: string): ParsedProblem | null {
  try {
    // Extract the entire problem-statement div (it contains nested divs, so we need to match carefully)
    let problemHtml = ''
    const problemStart = html.indexOf('<div class="problem-statement">')
    if (problemStart === -1) {
      console.log('No problem-statement div found')
      return null
    }
    
    // Find the matching closing div by counting opening/closing tags
    let depth = 0
    let inProblemDiv = false
    let problemEnd = problemStart
    
    for (let i = problemStart; i < html.length; i++) {
      if (html.substr(i, 4) === '<div') {
        if (inProblemDiv) depth++
        if (!inProblemDiv && html.substr(i, 24) === '<div class="problem-statement"') {
          inProblemDiv = true
          depth = 1
        }
      } else if (html.substr(i, 6) === '</div>') {
        if (inProblemDiv) {
          depth--
          if (depth === 0) {
            problemEnd = i + 6
            break
          }
        }
      }
    }
    
    problemHtml = html.substring(problemStart, problemEnd)
    
    // Extract title (usually in div.title within header)
    const titleMatch = problemHtml.match(/<div class="title">([^<]+)<\/div>/i) || 
                       html.match(/<div class="header">[\s\S]*?<div class="title">([^<]+)<\/div>/i)
    let title = titleMatch ? titleMatch[1].trim() : 'Untitled Problem'
    // Remove problem index if present (e.g., "A. Problem Name" -> "Problem Name")
    title = title.replace(/^[A-Z]\.\s*/, '').trim()

    // Extract time limit and memory limit
    const timeLimitMatch = html.match(/time limit per test[^<]*<span[^>]*>([^<]+)<\/span>/i) ||
                            problemHtml.match(/time limit per test[^<]*<span[^>]*>([^<]+)<\/span>/i)
    const timeLimit = timeLimitMatch ? timeLimitMatch[1].trim() : 'Unknown'
    
    const memoryLimitMatch = html.match(/memory limit per test[^<]*<span[^>]*>([^<]+)<\/span>/i) ||
                            problemHtml.match(/memory limit per test[^<]*<span[^>]*>([^<]+)<\/span>/i)
    const memoryLimit = memoryLimitMatch ? memoryLimitMatch[1].trim() : 'Unknown'

    // Extract problem statement - it's usually the first div after the header
    // Find where header ends and statement begins
    let statement = ''
    const headerEnd = problemHtml.indexOf('</div>', problemHtml.indexOf('<div class="header">')) + 6
    if (headerEnd > 5) {
      const statementSection = problemHtml.substring(headerEnd)
      // Remove input/output/sample sections to get just the statement
      const cleaned = statementSection
        .replace(/<div class="input-specification">[\s\S]*?<\/div>/gi, '')
        .replace(/<div class="output-specification">[\s\S]*?<\/div>/gi, '')
        .replace(/<div class="sample-tests">[\s\S]*?<\/div>/gi, '')
        .replace(/<div class="note">[\s\S]*?<\/div>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<div[^>]*class="[^"]*header[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      
      // Extract text from paragraphs and divs
      const pMatches = cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)
      const statements: string[] = []
      for (const match of pMatches) {
        const text = match[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim()
        if (text.length > 10) statements.push(text)
      }
      
      if (statements.length > 0) {
        statement = statements.join('\n\n').slice(0, 3000)
      } else {
        // Fallback: extract any text content
        statement = cleaned
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 2000)
      }
    }

    // Extract input specification
    const inputSpecMatch = problemHtml.match(/<div class="input-specification">[\s\S]*?<div class="section-title">[^<]*Input[^<]*<\/div>([\s\S]*?)<\/div>\s*<\/div>/i) ||
                          problemHtml.match(/<div class="input-specification">([\s\S]*?)<\/div>\s*<\/div>/i)
    let inputFormat = ''
    if (inputSpecMatch) {
      inputFormat = inputSpecMatch[1]
        .replace(/<div class="section-title">[^<]*Input[^<]*<\/div>/i, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 800)
    }

    // Extract output specification
    const outputSpecMatch = problemHtml.match(/<div class="output-specification">[\s\S]*?<div class="section-title">[^<]*Output[^<]*<\/div>([\s\S]*?)<\/div>\s*<\/div>/i) ||
                           problemHtml.match(/<div class="output-specification">([\s\S]*?)<\/div>\s*<\/div>/i)
    let outputFormat = ''
    if (outputSpecMatch) {
      outputFormat = outputSpecMatch[1]
        .replace(/<div class="section-title">[^<]*Output[^<]*<\/div>/i, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 800)
    }

    // Extract test cases/examples
    const testCases: Array<{ input: string; output: string; explanation?: string }> = []
    const sampleTestsMatch = problemHtml.match(/<div class="sample-tests">([\s\S]*?)<\/div>\s*<\/div>/i) ||
                            problemHtml.match(/<div class="sample-tests">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i)
    
    if (sampleTestsMatch) {
      const samplesHtml = sampleTestsMatch[1]
      // Match input/output pairs - Codeforces uses specific structure
      const inputMatches = Array.from(samplesHtml.matchAll(/<div class="input">[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/gi))
      const outputMatches = Array.from(samplesHtml.matchAll(/<div class="output">[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/gi))
      
      const inputs = inputMatches.map(m => {
        return m[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .trim()
      })
      
      const outputs = outputMatches.map(m => {
        return m[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .trim()
      })
      
      for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
        if (inputs[i] && outputs[i]) {
          testCases.push({
            input: inputs[i].slice(0, 2000),
            output: outputs[i].slice(0, 2000)
          })
        }
      }
    }

    // Extract constraints/note
    let constraints = ''
    const noteMatch = problemHtml.match(/<div class="note">([\s\S]*?)<\/div>\s*<\/div>/i) ||
                     problemHtml.match(/<div class="note">([\s\S]*?)<\/div>/i)
    if (noteMatch) {
      constraints = noteMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1000)
    }

    return {
      title,
      statement: statement || 'Problem statement not found',
      inputFormat: inputFormat || 'See problem statement',
      outputFormat: outputFormat || 'See problem statement',
      testCases,
      constraints,
      timeLimit,
      memoryLimit,
      tags: [],
      difficulty: undefined
    }
  } catch (error) {
    console.error('Error parsing problem HTML:', error)
    return null
  }
}

function formatProblemBody(parsed: ParsedProblem, apiTags: string[]): string {
  let body = `**Problem Statement:**\n\n${parsed.statement}\n\n`
  
  if (parsed.inputFormat && parsed.inputFormat !== 'See problem statement') {
    body += `**Input Format:**\n${parsed.inputFormat}\n\n`
  }
  
  if (parsed.outputFormat && parsed.outputFormat !== 'See problem statement') {
    body += `**Output Format:**\n${parsed.outputFormat}\n\n`
  }
  
  if (parsed.testCases.length > 0) {
    body += `**Examples:**\n\n`
    parsed.testCases.forEach((testCase, idx) => {
      body += `**Example ${idx + 1}:**\n`
      body += `Input:\n\`\`\`\n${testCase.input}\n\`\`\`\n`
      body += `Output:\n\`\`\`\n${testCase.output}\n\`\`\`\n\n`
    })
  }
  
  if (parsed.constraints) {
    body += `**Note:** ${parsed.constraints}\n\n`
  }
  
  body += `**Constraints:**\n`
  body += `- Time Limit: ${parsed.timeLimit}\n`
  body += `- Memory Limit: ${parsed.memoryLimit}\n`
  
  if (apiTags.length > 0) {
    body += `- Tags: ${apiTags.join(', ')}\n`
  }
  
  return body
}

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const res = await fetch('https://codeforces.com/api/problemset.problems')
    const json = await res.json()
    if (json.status !== 'OK') throw new Error('Codeforces API error')

    const problems = json.result.problems as Array<{ contestId: number; index: string; name: string; tags: string[] }>
    const random50 = problems.filter(p => p.contestId && p.index).slice(0, 500).sort(() => Math.random() - 0.5).slice(0, 50)

    const urls = random50.map(p => `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`)
    
    // Create or resume job
    const { jobId, checkpoint } = await getOrCreateJob('codeforces', urls, supabase)
    const completedUrls = checkpoint?.completedUrls || []
    
    console.log(`Job ${jobId}: Processing ${urls.length - completedUrls.length} problems`)

    let processed = 0
    let failed = 0

    for (const p of random50) {
      const url = `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`
      
      if (completedUrls.includes(url)) continue
      
      try {
        const { data: existing } = await supabase
          .from('content_cards')
          .select('id')
          .eq('source_url', url)
          .single()
        if (existing) {
          await updateJobProgress(jobId, url, supabase)
          continue
        }

        console.log(`Fetching problem: ${url}`)
        
        // Get cookies from environment if available
        const codeforcesCookies = Deno.env.get('CODEFORCES_COOKIES') || ''
        const codeforcesHeaders = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://codeforces.com/'
        }
        
        // Scrape with Firecrawl
        const scrapeResult = await scrapeWithRetry({
          url: url,
          sourceName: 'codeforces',
          jobId: jobId,
          cookies: codeforcesCookies || undefined,
          headers: codeforcesHeaders
        }, supabase)

        // Handle captcha/blocking
        if (!scrapeResult.success && (scrapeResult.errorCode === 'CAPTCHA' || scrapeResult.errorCode === 'BLOCKED')) {
          console.log(`⚠️  Cloudflare challenge detected at ${url}`)
          console.log(`💡 Job paused. To resume:`)
          console.log(`   1. Open Codeforces in your browser and solve Cloudflare challenge`)
          console.log(`   2. Get fresh cookies from browser DevTools`)
          console.log(`   3. Set CODEFORCES_COOKIES environment variable`)
          console.log(`   4. Resume job: node monitor-jobs.js resume ${jobId}`)
          
          return new Response(
            JSON.stringify({
              success: false,
              paused: true,
              reason: scrapeResult.errorCode,
              message: `Job paused due to Cloudflare ${scrapeResult.errorCode} at ${url}. This is expected - Cloudflare uses IP-bound cookies. See CODEFORCES_CLOUDFLARE_SOLUTION.md for details.`,
              processed,
              failed,
              jobId,
              instructions: [
                '1. Open Codeforces in your browser and solve Cloudflare challenge',
                '2. Get fresh cookies from browser DevTools (Application > Cookies)',
                '3. Set CODEFORCES_COOKIES environment variable with fresh cookies',
                `4. Resume job: node monitor-jobs.js resume ${jobId}`
              ]
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        }

        if (!scrapeResult.success) {
          console.error(`Failed to scrape ${url}: ${scrapeResult.error}`)
          failed++
          continue
        }

        // Parse HTML from Firecrawl
        const html = scrapeResult.html || scrapeResult.content || ''
        if (!html || html.length < 100) {
          failed++
          continue
        }

        const parsed = parseCodeforcesProblem(html)

        if (!parsed) {
          console.error(`Failed to parse problem ${url}`)
          failed++
          continue
        }

        const body = formatProblemBody(parsed, p.tags)
        const summary = parsed.statement.slice(0, 200) + (parsed.statement.length > 200 ? '...' : '')
        
        // Estimate read time (5 min base + 1 min per test case)
        const readTime = Math.max(5, 5 + parsed.testCases.length)

        const keyPoints = [
          'Algorithmic challenge',
          'Competitive programming',
          ...parsed.testCases.length > 0 ? [`${parsed.testCases.length} example(s) provided`] : [],
          parsed.timeLimit !== 'Unknown' ? `Time limit: ${parsed.timeLimit}` : '',
          parsed.memoryLimit !== 'Unknown' ? `Memory limit: ${parsed.memoryLimit}` : ''
        ].filter(Boolean)

        const { data: card } = await supabase
          .from('content_cards')
          .insert({
            type: 'problem',
            title: parsed.title || p.name,
            summary: summary,
            body: body,
            key_points: keyPoints,
            tags: p.tags.slice(0, 5),
            read_time_minutes: readTime,
            source_name: 'codeforces',
            source_url: url,
            raw_data: {
              ...p,
              parsed: {
                timeLimit: parsed.timeLimit,
                memoryLimit: parsed.memoryLimit,
                testCaseCount: parsed.testCases.length
              }
            }
          })
          .select()
          .single()

        if (card) {
          await supabase.from('content_pool').insert({ content_id: card.id, weight: 1 })
          await updateJobProgress(jobId, url, supabase)
          processed++
          console.log(`✅ Processed: ${parsed.title}`)
        }
      } catch (err) {
        console.error(`Codeforces item error (${p.contestId}/${p.index}):`, err)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        failed,
        message: `Processed ${processed} problems, ${failed} failed`
      }), 
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Codeforces fetch error:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})





