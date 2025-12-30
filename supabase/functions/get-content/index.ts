// Content Randomizer API
// Returns shuffled content cards for user session

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { deviceId, sessionId, count = 20 } = await req.json()

    if (!deviceId || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'deviceId and sessionId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Get or create session
    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('device_id', deviceId)
      .eq('session_id', sessionId)
      .single()

    if (!session) {
      await supabase
        .from('user_sessions')
        .insert(
          {
            device_id: deviceId,
            session_id: sessionId
          },
          { ignoreDuplicates: true, onConflict: 'session_id' }
        )
    }

    // 2. Get already viewed content in this session
    const { data: viewedContent } = await supabase
      .from('content_views')
      .select('content_id')
      .eq('session_id', sessionId)

    const viewedIds = viewedContent?.map(v => v.content_id) || []

    // 3. Get available content by type (weighted distribution)
    const types = [
      { type: 'problem', count: Math.ceil(count * 0.20) },
      { type: 'tech_article', count: Math.ceil(count * 0.40) },
      { type: 'finance_article', count: Math.ceil(count * 0.20) },
      { type: 'book_summary', count: Math.ceil(count * 0.20) }
    ]

    let allCards: any[] = []

    for (const { type, count: typeCount } of types) {
      let query = supabase
        .from('content_pool')
        .select('content_id, content_cards(*)')
        .eq('active', true)
        .eq('content_cards.type', type)
        .eq('content_cards.active', true)

      if (viewedIds.length > 0) {
        query = query.not('content_id', 'in', `(${viewedIds.join(',')})`)
      }

      const { data: cards } = await query.limit(Math.max(typeCount * 4, 50)) // pull wider set

      if (cards && cards.length > 0) {
        // Shuffle and take requested count
        const shuffled = cards
          .sort(() => Math.random() - 0.5)
          .slice(0, typeCount)
          .map(c => c.content_cards)
        
        allCards = [...allCards, ...shuffled]
      }
    }

    // 4. Final shuffle of all cards
    const finalCards = allCards
      .filter(c => c != null)
      .sort(() => Math.random() - 0.5)
      .slice(0, count)

    // 5. Mark as viewed
    for (const card of finalCards) {
      await supabase
        .from('content_views')
        .insert(
          {
            session_id: sessionId,
            content_id: card.id
          },
          { ignoreDuplicates: true, onConflict: 'session_id,content_id' }
        )
    }

    // 6. Update session stats
    await supabase
      .from('user_sessions')
      .update({
        cards_viewed: (session?.cards_viewed || 0) + finalCards.length
      })
      .eq('session_id', sessionId)

    return new Response(
      JSON.stringify({
        success: true,
        cards: finalCards,
        count: finalCards.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get content error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
