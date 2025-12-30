// Book Summaries Fetcher
// Scrapes Four Minute Books and parses with LLM
// Uses Firecrawl scraper service with checkpoint support

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseContentWithLLM } from '../_shared/llm.ts'
import { scrapeWithRetry, getOrCreateJob, updateJobProgress } from '../_shared/scraper.ts'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const groqKey = Deno.env.get('GROQ_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch popular book summaries page
    const res = await fetch('https://fourminutebooks.com/book-summaries/')
    const html = await res.text()

    // Extract book summary URLs
    const bookMatches = html.matchAll(
      /href="(https:\/\/fourminutebooks\.com\/[^"\/]+\-summary\/)"/g
    )
    
    const bookUrls = Array.from(new Set(
      Array.from(bookMatches, m => m[1])
    )).slice(0, 5)

    console.log(`Found ${bookUrls.length} book summaries`)

    // Create or resume job
    const { jobId, checkpoint } = await getOrCreateJob('fourminutebooks', bookUrls, supabase)
    const completedUrls = checkpoint?.completedUrls || []
    
    console.log(`Job ${jobId}: Processing ${bookUrls.length - completedUrls.length} URLs`)

    let processedCount = 0
    let failed = 0

    for (const url of bookUrls) {
      if (completedUrls.includes(url)) continue
      
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('content_cards')
          .select('id')
          .eq('source_url', url)
          .single()

        if (existing) {
          await updateJobProgress(jobId, url, supabase)
          continue
        }

        // Scrape with Firecrawl
        const scrapeResult = await scrapeWithRetry({
          url: url,
          sourceName: 'fourminutebooks',
          jobId: jobId
        }, supabase)

        if (!scrapeResult.success && (scrapeResult.errorCode === 'CAPTCHA' || scrapeResult.errorCode === 'BLOCKED')) {
          return new Response(
            JSON.stringify({
              success: false,
              paused: true,
              reason: scrapeResult.errorCode,
              processed: processedCount,
              failed,
              jobId
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        }

        if (!scrapeResult.success) {
          console.error(`Failed to scrape ${url}: ${scrapeResult.error}`)
          failed++
          continue
        }

        const content = scrapeResult.markdown || scrapeResult.content || ''
        if (!content || content.length < 200) {
          failed++
          continue
        }

        // Extract title and author from content
        const titleMatch = content.match(/#\s+(.+?)\s+by\s+(.+)/) || content.match(/by\s+([^\n]+)/)
        const title = titleMatch ? titleMatch[1]?.replace(' Summary', '').trim() || 'Book Summary' : 'Book Summary'
        const author = titleMatch?.[2] || titleMatch?.[1] || 'Unknown'

        // Parse with LLM
        const parsed = await parseContentWithLLM(content, 'book', groqKey)

        // Insert into database
        const { data: card } = await supabase
          .from('content_cards')
          .insert({
            type: 'book_summary',
            title: `${title} by ${author}`,
            summary: parsed.summary,
            body: parsed.body,
            key_points: parsed.key_points,
            tags: parsed.tags,
            read_time_minutes: parsed.read_time_minutes,
            source_name: 'fourminutebooks',
            source_url: url,
            author: author,
            raw_data: { title, author, url }
          })
          .select()
          .single()

        // Add to content pool
        if (card) {
          await supabase.from('content_pool').insert({
            content_id: card.id,
            weight: 1
          })
          await updateJobProgress(jobId, url, supabase)
          processedCount++
        }

        console.log(`✅ Processed: ${title} by ${author}`)
      } catch (error) {
        console.error(`Error processing book ${url}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        failed,
        jobId,
        message: `Processed ${processedCount} book summaries, ${failed} failed`
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Book summaries fetch error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
