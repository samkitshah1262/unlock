// HackerNews Fetcher v2 - Using Firecrawl Scraper Service
// Example implementation with checkpoint and retry logic

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

    // 1. Fetch top stories from HackerNews
    const topStoriesRes = await fetch(
      'https://hacker-news.firebaseio.com/v0/topstories.json'
    )
    const topStoryIds = await topStoriesRes.json()

    // 2. Get story details
    const stories = await Promise.all(
      topStoryIds.slice(0, 200).map(async (id: number) => {
        const res = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        )
        return res.json()
      })
    )

    // 3. Filter valid stories
    const validStories = stories.filter(
      (s) => s.url && s.score > 100 && s.type === 'story'
    )

    const toProcess = validStories
      .sort(() => Math.random() - 0.5)
      .slice(0, 50)

    const urls = toProcess.map(s => s.url).filter(Boolean)

    // 4. Create or resume job
    const { jobId, checkpoint } = await getOrCreateJob('hackernews', urls, supabase)
    
    // Determine which URLs to process
    const completedUrls = checkpoint?.completedUrls || []
    const urlsToProcess = urls.filter(url => !completedUrls.includes(url))
    
    console.log(`Job ${jobId}: Processing ${urlsToProcess.length} URLs (${completedUrls.length} already completed)`)

    let processed = 0
    let failed = 0

    // 5. Process each URL with scraper service
    for (const story of toProcess) {
      if (!story.url || completedUrls.includes(story.url)) continue
      
      try {
        // Check if already exists in database
        const { data: existing } = await supabase
          .from('content_cards')
          .select('id')
          .eq('source_url', story.url)
          .single()

        if (existing) {
          await updateJobProgress(jobId, story.url, supabase)
          continue
        }

        // Scrape with retry and captcha detection
        const scrapeResult = await scrapeWithRetry({
          url: story.url,
          sourceName: 'hackernews',
          jobId: jobId
        }, supabase)

        // Handle captcha/blocking
        if (!scrapeResult.success && (scrapeResult.errorCode === 'CAPTCHA' || scrapeResult.errorCode === 'BLOCKED')) {
          console.log(`⚠️  Job paused: ${scrapeResult.errorCode} at ${story.url}`)
          return new Response(
            JSON.stringify({
              success: false,
              paused: true,
              reason: scrapeResult.errorCode,
              message: `Job paused due to ${scrapeResult.errorCode}. Check notifications and resume when resolved.`,
              processed,
              failed
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        }

        if (!scrapeResult.success) {
          console.error(`Failed to scrape ${story.url}: ${scrapeResult.error}`)
          failed++
          continue
        }

        // Parse with LLM
        const content = scrapeResult.markdown || scrapeResult.content || ''
        if (!content || content.length < 100) {
          console.log(`Skipping ${story.url}: insufficient content`)
          failed++
          continue
        }

        const parsed = await parseContentWithLLM(content, 'tech', groqKey)

        // Insert into database
        const { data: card } = await supabase
          .from('content_cards')
          .insert({
            type: 'tech_article',
            title: parsed.title || story.title,
            summary: parsed.summary,
            body: parsed.body,
            key_points: parsed.key_points,
            tags: parsed.tags,
            read_time_minutes: parsed.read_time_minutes,
            source_name: 'hackernews',
            source_url: story.url,
            author: story.by,
            published_at: new Date(story.time * 1000).toISOString(),
            raw_data: story
          })
          .select()
          .single()

        if (card) {
          await supabase.from('content_pool').insert({
            content_id: card.id,
            weight: 1
          })
          
          // Update job progress
          await updateJobProgress(jobId, story.url, supabase)
          processed++
          
          console.log(`✅ Processed: ${parsed.title}`)
        }
      } catch (error) {
        console.error(`Error processing story ${story.id}:`, error)
        failed++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        jobId,
        message: `Processed ${processed} articles, ${failed} failed`
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('HackerNews fetch error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})


