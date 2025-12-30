// Investopedia Content Fetcher
// Scrapes finance articles and parses with LLM
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

    // Investopedia news sections
    const sections = [
      'https://www.investopedia.com/news',
      'https://www.investopedia.com/markets-news-4427704'
    ]

    const allArticleUrls: string[] = []

    for (const sectionUrl of sections) {
      try {
        // Fetch section page
        const res = await fetch(sectionUrl)
        const html = await res.text()

        // Extract article URLs (simplified regex)
        const articleMatches = html.matchAll(
          /href="(https:\/\/www\.investopedia\.com\/[^"]+?)"/g
        )
        
        const articleUrls = Array.from(articleMatches, m => m[1])
          .filter(url => 
            url.includes('/news/') || 
            url.includes('/markets/') ||
            url.includes('/economy/')
          )
          .sort(() => Math.random() - 0.5)
          .slice(0, 50)

        console.log(`Found ${articleUrls.length} articles in ${sectionUrl}`)
        
        // Collect all URLs for job creation
        allArticleUrls.push(...articleUrls)
      } catch (error) {
        console.error(`Error fetching section ${sectionUrl}:`, error)
      }
    }

    // Create or resume job for all articles
    const uniqueUrls = Array.from(new Set(allArticleUrls))
    const { jobId, checkpoint } = await getOrCreateJob('investopedia', uniqueUrls, supabase)
    const completedUrls = checkpoint?.completedUrls || []
    
    console.log(`Job ${jobId}: Processing ${uniqueUrls.length - completedUrls.length} URLs`)

    let processedCount = 0
    let failed = 0

    // Process each article
    for (const url of uniqueUrls) {
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
          sourceName: 'investopedia',
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
        if (!content || content.length < 100) {
          failed++
          continue
        }

        // Extract title from content or HTML
        const titleMatch = content.match(/#\s+(.+)/) || content.match(/<h1[^>]*>([^<]+)<\/h1>/)
        const title = titleMatch ? titleMatch[1].trim() : 'Finance Article'

        // Parse with LLM
        const parsed = await parseContentWithLLM(content, 'finance', groqKey)

        // Insert into database
        const { data: card } = await supabase
          .from('content_cards')
          .insert({
            type: 'finance_article',
            title: parsed.title || title,
            summary: parsed.summary,
            body: parsed.body,
            key_points: parsed.key_points,
            tags: parsed.tags,
            read_time_minutes: parsed.read_time_minutes,
            source_name: 'investopedia',
            source_url: url,
            raw_data: { title, url }
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

        console.log(`✅ Processed: ${parsed.title}`)
      } catch (error) {
        console.error(`Error processing article ${url}:`, error)
        failed++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        failed,
        jobId,
        message: `Processed ${processedCount} articles, ${failed} failed`
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Investopedia fetch error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
