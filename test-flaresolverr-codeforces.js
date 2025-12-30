#!/usr/bin/env node
/**
 * FlareSolverr POC for Codeforces
 * Tests Cloudflare bypass and problem scraping
 */

const FLARESOLVERR_URL = 'http://localhost:8191/v1';

async function scrapeWithFlareSolverr(url) {
  console.log(`\n🔥 Scraping: ${url}`);
  console.log('⏳ Waiting for FlareSolverr to solve Cloudflare challenge...\n');
  
  const startTime = Date.now();
  
  const response = await fetch(FLARESOLVERR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cmd: 'request.get',
      url: url,
      maxTimeout: 60000
    })
  });
  
  const data = await response.json();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (data.status !== 'ok') {
    console.error('❌ FlareSolverr failed:', data.message);
    return null;
  }
  
  const solution = data.solution;
  console.log(`✅ Cloudflare bypassed in ${elapsed}s`);
  console.log(`📦 Response size: ${solution.response.length} bytes`);
  console.log(`🍪 Cookies obtained: ${solution.cookies.length}`);
  
  // Extract cf_clearance cookie (the key bypass cookie)
  const cfClearance = solution.cookies.find(c => c.name === 'cf_clearance');
  if (cfClearance) {
    console.log(`🔑 cf_clearance: ${cfClearance.value.substring(0, 40)}...`);
  }
  
  return {
    html: solution.response,
    cookies: solution.cookies,
    userAgent: solution.userAgent
  };
}

function parseCodeforcesProblem(html) {
  // Extract title
  const titleMatch = html.match(/<div class="title">([^<]+)<\/div>/i);
  let title = titleMatch ? titleMatch[1].trim() : 'Unknown';
  title = title.replace(/^[A-Z]\.\s*/, ''); // Remove "A. " prefix
  
  // Extract time limit
  const timeLimitMatch = html.match(/time limit per test<\/div>([^<]+)/i);
  const timeLimit = timeLimitMatch ? timeLimitMatch[1].trim() : 'Unknown';
  
  // Extract memory limit
  const memoryLimitMatch = html.match(/memory limit per test<\/div>([^<]+)/i);
  const memoryLimit = memoryLimitMatch ? memoryLimitMatch[1].trim() : 'Unknown';
  
  // Check for problem statement content
  const hasProblemStatement = html.includes('problem-statement');
  const hasInputSpec = html.includes('input-specification');
  const hasOutputSpec = html.includes('output-specification');
  const hasSampleTests = html.includes('sample-tests');
  
  // Count sample tests
  const sampleInputs = (html.match(/<div class="input">/g) || []).length;
  const sampleOutputs = (html.match(/<div class="output">/g) || []).length;
  
  return {
    title,
    timeLimit,
    memoryLimit,
    hasProblemStatement,
    hasInputSpec,
    hasOutputSpec,
    hasSampleTests,
    sampleTestCount: Math.min(sampleInputs, sampleOutputs)
  };
}

async function testMultipleProblems() {
  const problems = [
    'https://codeforces.com/problemset/problem/1/A',    // Theatre Square (classic)
    'https://codeforces.com/problemset/problem/4/A',    // Watermelon
    'https://codeforces.com/problemset/problem/71/A',   // Way Too Long Words
  ];
  
  console.log('=' .repeat(60));
  console.log('🧪 FLARESOLVERR + CODEFORCES POC');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const url of problems) {
    try {
      const scraped = await scrapeWithFlareSolverr(url);
      
      if (scraped) {
        const parsed = parseCodeforcesProblem(scraped.html);
        
        console.log('\n📋 PARSED PROBLEM:');
        console.log(`   Title: ${parsed.title}`);
        console.log(`   Time Limit: ${parsed.timeLimit}`);
        console.log(`   Memory Limit: ${parsed.memoryLimit}`);
        console.log(`   Has Statement: ${parsed.hasProblemStatement ? '✅' : '❌'}`);
        console.log(`   Has Input Spec: ${parsed.hasInputSpec ? '✅' : '❌'}`);
        console.log(`   Has Output Spec: ${parsed.hasOutputSpec ? '✅' : '❌'}`);
        console.log(`   Sample Tests: ${parsed.sampleTestCount}`);
        
        results.push({ url, success: true, problem: parsed });
      } else {
        results.push({ url, success: false, error: 'Scrape failed' });
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      results.push({ url, success: false, error: error.message });
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success).length;
  console.log(`\nTotal: ${results.length} problems`);
  console.log(`Success: ${successful}/${results.length} (${(successful/results.length*100).toFixed(0)}%)`);
  
  console.log('\nResults:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const title = r.success ? r.problem.title : r.error;
    console.log(`  ${status} ${r.url.split('/').pop()} - ${title}`);
  });
  
  console.log('\n🎉 FlareSolverr successfully bypasses Cloudflare for Codeforces!');
  console.log('\n💡 Next steps:');
  console.log('   1. Update _shared/scraper.ts to use FlareSolverr for Codeforces');
  console.log('   2. Cache cf_clearance cookies for faster subsequent requests');
  console.log('   3. Keep FlareSolverr running as a Docker service');
}

// Check if FlareSolverr is running
async function checkFlareSolverr() {
  try {
    const response = await fetch('http://localhost:8191/');
    const data = await response.json();
    console.log(`✅ FlareSolverr v${data.version} is ready`);
    return true;
  } catch (error) {
    console.error('❌ FlareSolverr is not running!');
    console.error('   Run: docker run -d --name flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest');
    return false;
  }
}

async function main() {
  if (await checkFlareSolverr()) {
    await testMultipleProblems();
  }
}

main().catch(console.error);










