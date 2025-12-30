// Product Hunt Fetcher via RSS (popular today)
// Uses Firecrawl scraper service with checkpoint support

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseContentWithLLM } from '../_shared/llm.ts'
import { scrapeWithRetry, getOrCreateJob, updateJobProgress } from '../_shared/scraper.ts'

function extractItemsFromRss(xml: string): { title: string; link: string; description: string }[] {
  const items: { title: string; link: string; description: string }[] = []
  const regex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi
  let match
  while ((match = regex.exec(xml))) {
    const title = match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    const link = match[2].trim()
    const desc = match[3].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    items.push({ title, link, description: desc })
  }
  return items
}

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const groqKey = Deno.env.get('GROQ_API_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const rssUrl = 'https://www.producthunt.com/feed'
    const res = await fetch(rssUrl)
    const xml = await res.text()
    const items = extractItemsFromRss(xml).slice(0, 200).sort(() => Math.random() - 0.5).slice(0, 50)

    const urls = items.map(item => item.link).filter(Boolean)
    const { jobId, checkpoint } = await getOrCreateJob('producthunt', urls, supabase)
    const completedUrls = checkpoint?.completedUrls || []
    
    console.log(`Job ${jobId}: Processing ${urls.length - completedUrls.length} URLs`)

    let processed = 0
    let failed = 0
    
    for (const item of items) {
      if (completedUrls.includes(item.link)) continue
      
      try {
        const { data: existing } = await supabase
          .from('content_cards')
          .select('id')
          .eq('source_url', item.link)
          .single()
        if (existing) {
          await updateJobProgress(jobId, item.link, supabase)
          continue
        }

        // Scrape with Firecrawl
        const scrapeResult = await scrapeWithRetry({
          url: item.link,
          sourceName: 'producthunt',
          jobId: jobId
        }, supabase)

        if (!scrapeResult.success && (scrapeResult.errorCode === 'CAPTCHA' || scrapeResult.errorCode === 'BLOCKED')) {
          return new Response(
            JSON.stringify({
              success: false,
              paused: true,
              reason: scrapeResult.errorCode,
              processed,
              failed,
              jobId
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        }

        if (!scrapeResult.success) {
          failed++
          continue
        }

        const content = scrapeResult.markdown || scrapeResult.content || ''
        if (!content || content.length < 100) {
          failed++
          continue
        }

        const parsed = await parseContentWithLLM(content, 'tech', groqKey)
        const { data: card } = await supabase
          .from('content_cards')
          .insert({
            type: 'tech_article',
            title: parsed.title || item.title,
            summary: parsed.summary,
            body: parsed.body,
            key_points: parsed.key_points,
            tags: parsed.tags,
            read_time_minutes: parsed.read_time_minutes,
            source_name: 'producthunt',
            source_url: item.link,
            raw_data: item
          })
          .select()
          .single()
        if (card) {
          await supabase.from('content_pool').insert({ content_id: card.id, weight: 1 })
          await updateJobProgress(jobId, item.link, supabase)
          processed++
        }
      } catch (err) {
        console.error('ProductHunt item error:', err)
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
  } catch (error) {
    console.error('ProductHunt fetch error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})





