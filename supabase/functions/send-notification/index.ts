// Notification Service
// Sends alerts for captcha/blocking via email, webhook, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface NotificationRequest {
  sourceName: string
  url: string
  errorType: 'CAPTCHA' | 'BLOCKED' | 'RATE_LIMITED'
  message: string
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const notification: NotificationRequest = await req.json()
    
    // 1. Store in database (already done by scraper, but ensure it's there)
    const { error: dbError } = await supabase
      .from('scraping_notifications')
      .insert({
        source_name: notification.sourceName,
        url: notification.url,
        error_type: notification.errorType,
        message: notification.message,
        resolved: false
      })
    
    if (dbError) {
      console.error('Failed to save notification:', dbError)
    }
    
    // 2. Send email (if configured)
    const emailEnabled = Deno.env.get('EMAIL_ENABLED') === 'true'
    const emailTo = Deno.env.get('NOTIFICATION_EMAIL')
    
    if (emailEnabled && emailTo) {
      // Use Resend, SendGrid, or similar
      const emailService = Deno.env.get('EMAIL_SERVICE') || 'resend'
      const emailApiKey = Deno.env.get('EMAIL_API_KEY')
      
      if (emailApiKey) {
        try {
          if (emailService === 'resend') {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${emailApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'ContentReel <notifications@yourdomain.com>',
                to: emailTo,
                subject: `⚠️ Scraping Alert: ${notification.errorType} - ${notification.sourceName}`,
                html: `
                  <h2>Scraping Alert</h2>
                  <p><strong>Source:</strong> ${notification.sourceName}</p>
                  <p><strong>Error Type:</strong> ${notification.errorType}</p>
                  <p><strong>URL:</strong> <a href="${notification.url}">${notification.url}</a></p>
                  <p><strong>Message:</strong> ${notification.message}</p>
                  <p>Please resolve this issue and resume the scraping job.</p>
                `
              })
            })
          }
        } catch (emailError) {
          console.error('Failed to send email:', emailError)
        }
      }
    }
    
    // 3. Send webhook (if configured)
    const webhookUrl = Deno.env.get('WEBHOOK_URL')
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ *Scraping Alert*\n*Source:* ${notification.sourceName}\n*Error:* ${notification.errorType}\n*URL:* ${notification.url}\n*Message:* ${notification.message}`
          })
        })
      } catch (webhookError) {
        console.error('Failed to send webhook:', webhookError)
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Notification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})


