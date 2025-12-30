// Shared Scraper Service with Firecrawl
// Handles retries, captcha detection, checkpoints, and notifications

interface ScrapeOptions {
  url: string
  sourceName: string
  jobId?: string
  maxRetries?: number
  cookies?: string | Record<string, string>  // Cookie string or object
  headers?: Record<string, string>  // Additional headers
}

interface ScrapeResult {
  success: boolean
  content?: string
  markdown?: string
  html?: string
  error?: string
  errorCode?: 'CAPTCHA' | 'BLOCKED' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'UNKNOWN'
  retries?: number
}

interface Checkpoint {
  jobId: string
  sourceName: string
  currentUrl: string
  completedUrls: string[]
  failedUrls: Array<{ url: string; error: string }>
  status: 'running' | 'paused_captcha' | 'paused_blocked' | 'completed' | 'failed'
  lastUpdated: string
}

// Support both local and cloud Firecrawl
const FIRECRAWL_LOCAL_URL = Deno.env.get('FIRECRAWL_LOCAL_URL') || 'http://host.docker.internal:3002'
const FIRECRAWL_CLOUD_URL = 'https://api.firecrawl.dev/v1/scrape'
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY') || ''
const USE_LOCAL_FIRECRAWL = Deno.env.get('USE_LOCAL_FIRECRAWL') !== 'false' // Default to local (true unless explicitly false)

const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000,      // 1 second
  maxDelay: 60000,         // 60 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  captchaStatusCodes: [403, 401]
}

/**
 * Scrape a URL using Firecrawl with retry logic and captcha detection
 */
export async function scrapeWithRetry(
  options: ScrapeOptions,
  supabase: any
): Promise<ScrapeResult> {
  const { url, sourceName, jobId, maxRetries = RETRY_CONFIG.maxRetries, cookies, headers } = options
  
  // Use local Firecrawl if configured, otherwise cloud
  const firecrawlUrl = USE_LOCAL_FIRECRAWL 
    ? `${FIRECRAWL_LOCAL_URL}/v1/scrape`
    : FIRECRAWL_CLOUD_URL
  
  // Local Firecrawl doesn't need API key
  const needsAuth = !USE_LOCAL_FIRECRAWL && FIRECRAWL_API_KEY
  
  if (!USE_LOCAL_FIRECRAWL && !FIRECRAWL_API_KEY) {
    console.warn('FIRECRAWL_API_KEY not set and not using local, falling back to direct fetch')
    return await fallbackScrape(url)
  }

  let lastError: any = null
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (needsAuth) {
        headers['Authorization'] = `Bearer ${FIRECRAWL_API_KEY}`
      }
      
      // Prepare Firecrawl request body
      const requestBody: any = {
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        timeout: 30000
      }
      
      // Firecrawl v1 API expects cookies in headers, not as a separate field
      const requestHeaders: Record<string, string> = { ...(options.headers || {}) }
      
      // Add cookies if provided (via Cookie header)
      if (options.cookies) {
        if (typeof options.cookies === 'string') {
          requestHeaders['Cookie'] = options.cookies
        } else {
          // Convert object to cookie string format
          requestHeaders['Cookie'] = Object.entries(options.cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ')
        }
      }
      
      // Add headers to request body if we have any
      if (Object.keys(requestHeaders).length > 0) {
        requestBody.headers = requestHeaders
      }
      
      const response = await fetch(firecrawlUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      // Check content for verification pages even if no error
      const content = data.data?.markdown || data.data?.html || ''
      if (content.includes('Verifying you are human') || content.includes('security check')) {
        const errorCode = detectErrorType('', response.status, content)
        if (errorCode === 'CAPTCHA' && jobId) {
          await pauseJob(jobId, 'CAPTCHA', url, supabase)
          await sendNotification(sourceName, url, 'CAPTCHA', supabase)
        }
        return {
          success: false,
          error: 'Captcha/verification page detected',
          errorCode: 'CAPTCHA',
          retries: attempt
        }
      }

      // Check for captcha or blocking
      if (data.error) {
        const errorCode = detectErrorType(data.error, response.status, content)
        
        if (errorCode === 'CAPTCHA' || errorCode === 'BLOCKED') {
          // Pause job and notify
          if (jobId) {
            await pauseJob(jobId, errorCode, url, supabase)
            await sendNotification(sourceName, url, errorCode, supabase)
          }
          
          return {
            success: false,
            error: data.error,
            errorCode,
            retries: attempt
          }
        }

        // Retryable error
        if (RETRY_CONFIG.retryableStatusCodes.includes(response.status) && attempt < maxRetries - 1) {
          lastError = data.error
          attempt++
          const delay = calculateBackoff(attempt)
          console.log(`Retrying ${url} after ${delay}ms (attempt ${attempt}/${maxRetries})`)
          await sleep(delay)
          continue
        }

        return {
          success: false,
          error: data.error,
          errorCode: errorCode || 'UNKNOWN',
          retries: attempt
        }
      }

      // Success
      return {
        success: true,
        content: data.data?.markdown || data.data?.html || '',
        markdown: data.data?.markdown,
        html: data.data?.html,
        retries: attempt
      }

    } catch (error: any) {
      lastError = error.message
      
      if (attempt < maxRetries - 1) {
        attempt++
        const delay = calculateBackoff(attempt)
        console.log(`Network error, retrying ${url} after ${delay}ms (attempt ${attempt}/${maxRetries})`)
        await sleep(delay)
        continue
      }

      return {
        success: false,
        error: error.message,
        errorCode: 'NETWORK_ERROR',
        retries: attempt
      }
    }
  }

  return {
    success: false,
    error: lastError || 'Max retries exceeded',
    errorCode: 'UNKNOWN',
    retries: attempt
  }
}

/**
 * Detect error type from Firecrawl response
 */
function detectErrorType(error: string, statusCode: number, content?: string): ScrapeResult['errorCode'] {
  const errorLower = error.toLowerCase()
  const contentLower = (content || '').toLowerCase()
  
  // Check content for verification/captcha pages
  if (contentLower.includes('verifying you are human') || 
      contentLower.includes('security check') ||
      contentLower.includes('captcha') ||
      contentLower.includes('challenge')) {
    return 'CAPTCHA'
  }
  
  if (errorLower.includes('captcha') || errorLower.includes('challenge')) {
    return 'CAPTCHA'
  }
  
  if (errorLower.includes('blocked') || errorLower.includes('forbidden') || statusCode === 403) {
    return 'BLOCKED'
  }
  
  if (errorLower.includes('rate limit') || errorLower.includes('too many') || statusCode === 429) {
    return 'RATE_LIMITED'
  }
  
  if (statusCode >= 500) {
    return 'NETWORK_ERROR'
  }
  
  return 'UNKNOWN'
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1)
  return Math.min(delay, RETRY_CONFIG.maxDelay)
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fallback to direct fetch if Firecrawl not available
 */
async function fallbackScrape(url: string): Promise<ScrapeResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        errorCode: response.status === 403 ? 'BLOCKED' : 'NETWORK_ERROR'
      }
    }
    
    const html = await response.text()
    
    // Simple text extraction
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000)
    
    return {
      success: true,
      content: text,
      html: html
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      errorCode: 'NETWORK_ERROR'
    }
  }
}

/**
 * Pause a scraping job due to captcha or blocking
 */
async function pauseJob(
  jobId: string,
  reason: 'CAPTCHA' | 'BLOCKED',
  currentUrl: string,
  supabase: any
): Promise<void> {
  const status = reason === 'CAPTCHA' ? 'paused_captcha' : 'paused_blocked'
  
  const { error } = await supabase
    .from('scraping_jobs')
    .update({
      status,
      current_url: currentUrl,
      last_updated: new Date().toISOString(),
      pause_reason: reason
    })
    .eq('id', jobId)
  
  if (error) {
    console.error('Failed to pause job:', error)
  } else {
    console.log(`Job ${jobId} paused: ${reason}`)
  }
}

/**
 * Send notification about captcha/blocking
 */
async function sendNotification(
  sourceName: string,
  url: string,
  errorCode: 'CAPTCHA' | 'BLOCKED',
  supabase: any
): Promise<void> {
  const notification = {
    source_name: sourceName,
    url: url,
    error_type: errorCode,
    message: errorCode === 'CAPTCHA' 
      ? `Captcha detected for ${sourceName} at ${url}. Please solve manually.`
      : `IP blocked for ${sourceName} at ${url}. Check Firecrawl dashboard.`,
    created_at: new Date().toISOString(),
    resolved: false
  }
  
  // Store in database
  const { error: dbError } = await supabase
    .from('scraping_notifications')
    .insert(notification)
  
  if (dbError) {
    console.error('Failed to save notification:', dbError)
  }
  
  // TODO: Send email/webhook notification
  // This would call another Edge Function or external service
  console.log(`⚠️  NOTIFICATION: ${notification.message}`)
  
  // For now, log to console - you can extend this to:
  // - Send email via SendGrid/Resend
  // - Send webhook to Slack/Discord
  // - Send SMS via Twilio
}

/**
 * Create or resume a scraping job
 */
export async function getOrCreateJob(
  sourceName: string,
  urls: string[],
  supabase: any
): Promise<{ jobId: string; checkpoint: Checkpoint | null }> {
  // Check for existing paused job
  const { data: existingJob } = await supabase
    .from('scraping_jobs')
    .select('*')
    .eq('source_name', sourceName)
    .in('status', ['running', 'paused_captcha', 'paused_blocked'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (existingJob) {
    return {
      jobId: existingJob.id,
      checkpoint: {
        jobId: existingJob.id,
        sourceName: existingJob.source_name,
        currentUrl: existingJob.current_url || urls[0],
        completedUrls: existingJob.completed_urls || [],
        failedUrls: existingJob.failed_urls || [],
        status: existingJob.status,
        lastUpdated: existingJob.last_updated
      }
    }
  }
  
  // Create new job
  const { data: newJob, error } = await supabase
    .from('scraping_jobs')
    .insert({
      source_name: sourceName,
      urls: urls,
      current_url: urls[0],
      completed_urls: [],
      failed_urls: [],
      status: 'running',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create job: ${error.message}`)
  }
  
  return {
    jobId: newJob.id,
    checkpoint: null
  }
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  completedUrl: string,
  supabase: any
): Promise<void> {
  const { data: job } = await supabase
    .from('scraping_jobs')
    .select('completed_urls, urls')
    .eq('id', jobId)
    .single()
  
  if (!job) return
  
  const completedUrls = [...(job.completed_urls || []), completedUrl]
  const allUrls = job.urls || []
  const isComplete = completedUrls.length >= allUrls.length
  
  await supabase
    .from('scraping_jobs')
    .update({
      completed_urls: completedUrls,
      status: isComplete ? 'completed' : 'running',
      last_updated: new Date().toISOString()
    })
    .eq('id', jobId)
}

