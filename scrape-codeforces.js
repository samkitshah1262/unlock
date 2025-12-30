#!/usr/bin/env node
/**
 * Codeforces Contest Scraper
 * Scrapes last N contests with problems and tutorials
 * Uses FlareSolverr for Cloudflare bypass
 */

const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const chalk = require('chalk');

// Configuration - can override via command line args
const args = process.argv.slice(2);
const contestCount = parseInt(args.find(a => a.match(/^\d+$/)) || '100');

const CONFIG = {
  FLARESOLVERR_URL: 'http://localhost:8191/v1',
  CONTESTS_TO_SCRAPE: contestCount,
  DELAY_BETWEEN_REQUESTS: 5000, // 5 seconds
  OUTPUT_DIR: './codeforces-data',
  CHECKPOINT_FILE: './codeforces-data/checkpoint.json',
  MAX_TIMEOUT: 60000,
};

// Progress bars
const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
  format: '{bar} | {task} | {value}/{total} | {status}',
}, cliProgress.Presets.shades_classic);

let contestBar, problemBar, imageBar;

// Stats
const stats = {
  contestsScraped: 0,
  problemsScraped: 0,
  tutorialsScraped: 0,
  imagesDownloaded: 0,
  errors: [],
  startTime: Date.now(),
};

// Checkpoint management
function loadCheckpoint() {
  try {
    if (fs.existsSync(CONFIG.CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.CHECKPOINT_FILE, 'utf8'));
    }
  } catch (e) {
    console.log(chalk.yellow('⚠️  Could not load checkpoint, starting fresh'));
  }
  return { completedContests: [], lastContestIndex: 0 };
}

function saveCheckpoint(checkpoint) {
  fs.mkdirSync(path.dirname(CONFIG.CHECKPOINT_FILE), { recursive: true });
  fs.writeFileSync(CONFIG.CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// FlareSolverr request
async function scrapeWithFlaresolverr(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(CONFIG.FLARESOLVERR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cmd: 'request.get',
          url: url,
          maxTimeout: CONFIG.MAX_TIMEOUT
        })
      });

      const data = await response.json();
      
      if (data.status === 'ok') {
        return {
          success: true,
          html: data.solution.response,
          cookies: data.solution.cookies,
        };
      } else {
        throw new Error(data.message || 'FlareSolverr error');
      }
    } catch (error) {
      if (attempt === retries) {
        return { success: false, error: error.message };
      }
      await sleep(2000 * attempt);
    }
  }
}

// Download image
async function downloadImage(imageUrl, localPath) {
  try {
    // Fix protocol-relative URLs
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    }
    
    const response = await fetch(imageUrl);
    if (!response.ok) return false;
    
    const buffer = await response.arrayBuffer();
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(buffer));
    return true;
  } catch (error) {
    return false;
  }
}

// Fetch contest list from Codeforces API
async function fetchContestList() {
  console.log(chalk.blue('📋 Fetching contest list from Codeforces API...'));
  
  const response = await fetch('https://codeforces.com/api/contest.list?gym=false');
  const data = await response.json();
  
  if (data.status !== 'OK') {
    throw new Error('Failed to fetch contest list');
  }
  
  // Filter finished contests only
  const finishedContests = data.result
    .filter(c => c.phase === 'FINISHED')
    .slice(0, CONFIG.CONTESTS_TO_SCRAPE);
  
  console.log(chalk.green(`✅ Found ${finishedContests.length} finished contests`));
  return finishedContests;
}

// Fetch problem ratings from Codeforces API
async function fetchProblemRatings() {
  console.log(chalk.blue('📊 Fetching problem ratings from Codeforces API...'));
  
  const response = await fetch('https://codeforces.com/api/problemset.problems');
  const data = await response.json();
  
  if (data.status !== 'OK') {
    throw new Error('Failed to fetch problem ratings');
  }
  
  // Create lookup map: "contestId-index" -> rating
  const ratings = {};
  for (const problem of data.result.problems) {
    const key = `${problem.contestId}-${problem.index}`;
    ratings[key] = {
      rating: problem.rating,
      tags: problem.tags,
      name: problem.name
    };
  }
  
  console.log(chalk.green(`✅ Loaded ratings for ${Object.keys(ratings).length} problems`));
  return ratings;
}

// Parse problem HTML
function parseProblemHtml(html, contestId, problemIndex) {
  const result = {
    title: '',
    timeLimit: '',
    memoryLimit: '',
    statementHtml: '',
    inputSpecHtml: '',
    outputSpecHtml: '',
    noteHtml: '',
    samples: [],
    images: [],
  };

  // Extract title
  const titleMatch = html.match(/<div class="title">([^<]+)<\/div>/i);
  if (titleMatch) {
    result.title = titleMatch[1].replace(/^[A-Z]\d*\.\s*/, '').trim();
  }

  // Extract time limit
  const timeMatch = html.match(/time limit per test<\/div>([^<]+)/i);
  if (timeMatch) result.timeLimit = timeMatch[1].trim();

  // Extract memory limit
  const memoryMatch = html.match(/memory limit per test<\/div>([^<]+)/i);
  if (memoryMatch) result.memoryLimit = memoryMatch[1].trim();

  // Find problem-statement div
  const problemStart = html.indexOf('<div class="problem-statement">');
  const problemEnd = findMatchingDivEnd(html, problemStart);
  
  if (problemStart > -1 && problemEnd > problemStart) {
    const problemHtml = html.substring(problemStart, problemEnd);
    
    // Extract statement (paragraphs after header, before input-specification)
    const inputSpecStart = problemHtml.indexOf('<div class="input-specification">');
    if (inputSpecStart > -1) {
      const statementPart = problemHtml.substring(0, inputSpecStart);
      // Get paragraphs
      const paragraphs = statementPart.match(/<p>([\s\S]*?)<\/p>/gi) || [];
      result.statementHtml = paragraphs.join('\n');
    }

    // Extract input specification
    const inputMatch = problemHtml.match(/<div class="input-specification">([\s\S]*?)<\/div>\s*<div class="/i);
    if (inputMatch) {
      result.inputSpecHtml = inputMatch[1]
        .replace(/<div class="section-title">[^<]*<\/div>/i, '')
        .trim();
    }

    // Extract output specification
    const outputMatch = problemHtml.match(/<div class="output-specification">([\s\S]*?)<\/div>\s*<div class="/i);
    if (outputMatch) {
      result.outputSpecHtml = outputMatch[1]
        .replace(/<div class="section-title">[^<]*<\/div>/i, '')
        .trim();
    }

    // Extract samples
    const sampleSection = problemHtml.match(/<div class="sample-tests">([\s\S]*?)<\/div>\s*(<div class="note">|<\/div>\s*<\/div>)/i);
    if (sampleSection) {
      const samplesHtml = sampleSection[1];
      const inputs = [...samplesHtml.matchAll(/<div class="input">[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/gi)];
      const outputs = [...samplesHtml.matchAll(/<div class="output">[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/gi)];
      
      for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
        result.samples.push({
          input: cleanText(inputs[i][1]),
          output: cleanText(outputs[i][1])
        });
      }
    }

    // Extract note
    const noteMatch = problemHtml.match(/<div class="note">([\s\S]*?)<\/div>\s*<\/div>/i);
    if (noteMatch) {
      result.noteHtml = noteMatch[1]
        .replace(/<div class="section-title">[^<]*<\/div>/i, '')
        .trim();
    }

    // Extract images
    const imageMatches = [...problemHtml.matchAll(/<img[^>]+src="([^"]+)"/gi)];
    result.images = imageMatches
      .map(m => m[1])
      .filter(url => !url.includes('flags/') && !url.includes('icons/'));
  }

  return result;
}

// Find tutorial URL from contest page
function findTutorialUrl(html, contestId) {
  // Look for editorial/tutorial links
  const patterns = [
    /href="(\/blog\/entry\/\d+)"[^>]*>(?:[^<]*(?:Tutorial|Editorial|Разбор|解题报告))/gi,
    /href="(\/blog\/entry\/\d+)"[^>]*>.*?(?:Tutorial|Editorial)/gi,
  ];

  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      return `https://codeforces.com${matches[0][1]}`;
    }
  }

  // Check sidebar/announcement links
  const announcementMatch = html.match(/href="(\/blog\/entry\/\d+)"[^>]*class="[^"]*"[^>]*>/i);
  if (announcementMatch) {
    return `https://codeforces.com${announcementMatch[1]}`;
  }

  return null;
}

// Parse tutorial HTML
function parseTutorialHtml(html) {
  const result = {
    title: '',
    contentHtml: '',
    images: [],
  };

  // Extract title
  const titleMatch = html.match(/<p class="title"[^>]*>([\s\S]*?)<\/p>/i);
  if (titleMatch) {
    result.title = cleanText(titleMatch[1]);
  }

  // Extract content (blog entry content)
  const contentMatch = html.match(/<div class="ttypography">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="roundbox/i);
  if (contentMatch) {
    result.contentHtml = contentMatch[1];
  } else {
    // Try alternative pattern
    const altMatch = html.match(/<div class="content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<div/i);
    if (altMatch) {
      result.contentHtml = altMatch[1];
    }
  }

  // Extract images
  if (result.contentHtml) {
    const imageMatches = [...result.contentHtml.matchAll(/<img[^>]+src="([^"]+)"/gi)];
    result.images = imageMatches
      .map(m => m[1])
      .filter(url => !url.includes('userpic') && !url.includes('flags/'));
  }

  return result;
}

// Helper: Find matching closing div
function findMatchingDivEnd(html, startIndex) {
  if (startIndex === -1) return -1;
  
  let depth = 0;
  let i = startIndex;
  
  while (i < html.length) {
    if (html.substr(i, 4) === '<div') {
      depth++;
      i += 4;
    } else if (html.substr(i, 6) === '</div>') {
      depth--;
      if (depth === 0) {
        return i + 6;
      }
      i += 6;
    } else {
      i++;
    }
  }
  return html.length;
}

// Helper: Clean text from HTML entities
function cleanText(text) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
}

// Create self-contained HTML for problem
function createCleanProblemHtml(rawHtml, problem) {
  // Extract just the problem-statement div
  const problemStart = rawHtml.indexOf('<div class="problem-statement">');
  const problemEnd = findMatchingDivEnd(rawHtml, problemStart);
  
  let problemContent = '';
  if (problemStart > -1 && problemEnd > problemStart) {
    problemContent = rawHtml.substring(problemStart, problemEnd);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${problem.title || 'Problem'}</title>
  <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .problem-statement {
      background: #fff;
    }
    .header .title {
      font-size: 1.5em;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .time-limit, .memory-limit, .input-file, .output-file {
      color: #666;
      font-size: 0.9em;
      margin: 5px 0;
    }
    .property-title {
      display: inline;
      font-weight: normal;
    }
    .input-specification, .output-specification, .note {
      margin: 20px 0;
    }
    .section-title {
      font-weight: bold;
      font-size: 1.1em;
      margin-bottom: 10px;
      color: #1a1a1a;
    }
    .sample-tests {
      margin: 20px 0;
    }
    .sample-test {
      display: flex;
      gap: 20px;
      margin: 10px 0;
    }
    .input, .output {
      flex: 1;
    }
    pre {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 0.9em;
    }
    .MathJax {
      font-size: 1.1em;
    }
    p {
      margin: 10px 0;
    }
  </style>
</head>
<body>
  ${problemContent}
</body>
</html>`;
}

// Create self-contained HTML for tutorial with working spoilers
function createCleanTutorialHtml(rawHtml, tutorial) {
  // Extract the blog content - find ttypography div and extract properly
  let content = '';
  
  // Find the start of ttypography div
  const typoStart = rawHtml.indexOf('<div class="ttypography">');
  if (typoStart > -1) {
    // Find the end by looking for the comment section or next major div
    // The blog content usually ends before comments or voting section
    let typoEnd = rawHtml.indexOf('<div class="comments">', typoStart);
    if (typoEnd === -1) {
      typoEnd = rawHtml.indexOf('<div class="roundbox borderTopRound">', typoStart);
    }
    if (typoEnd === -1) {
      typoEnd = rawHtml.indexOf('<script type="text/javascript">', typoStart + 1000);
    }
    if (typoEnd === -1) {
      // Fallback: take a large chunk
      typoEnd = Math.min(typoStart + 500000, rawHtml.length);
    }
    
    content = rawHtml.substring(typoStart, typoEnd);
    
    // Clean up any unclosed divs at the end
    const openDivs = (content.match(/<div/g) || []).length;
    const closeDivs = (content.match(/<\/div>/g) || []).length;
    const diff = openDivs - closeDivs;
    if (diff > 0) {
      content += '</div>'.repeat(diff);
    }
  }

  // Make all spoilers visible by default and add toggle functionality
  content = content.replace(/style="display:\s*none;?"/gi, 'style="display: block;"');
  
  // Fix relative links to Codeforces
  content = content.replace(/href="\//g, 'href="https://codeforces.com/');
  content = content.replace(/src="\//g, 'src="https://codeforces.com/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tutorial.title || 'Tutorial'}</title>
  <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
      background: #fafafa;
    }
    .ttypography {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h3 {
      color: #1a1a1a;
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
    }
    h3 a {
      color: #0066cc;
      text-decoration: none;
    }
    h3 a:hover {
      text-decoration: underline;
    }
    .spoiler {
      margin: 15px 0;
      border: 1px solid #ddd;
      border-radius: 6px;
      overflow: hidden;
    }
    .spoiler-title {
      display: block;
      padding: 12px 15px;
      background: #f0f0f0;
      cursor: pointer;
      font-weight: 600;
      user-select: none;
      border-bottom: 1px solid #ddd;
    }
    .spoiler-title:hover {
      background: #e8e8e8;
    }
    .spoiler-title::before {
      content: '▶ ';
      font-size: 0.8em;
      transition: transform 0.2s;
      display: inline-block;
    }
    .spoiler.open .spoiler-title::before {
      content: '▼ ';
    }
    .spoiler-content {
      padding: 15px;
      background: #fff;
      display: none;
    }
    .spoiler.open .spoiler-content {
      display: block;
    }
    pre, code {
      background: #f5f5f5;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 0.85em;
    }
    pre {
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      padding: 2px 5px;
      border-radius: 3px;
    }
    p {
      margin: 10px 0;
    }
    .MathJax {
      font-size: 1.1em;
    }
  </style>
</head>
<body>
  <h1>${tutorial.title || 'Editorial'}</h1>
  <p><a href="${tutorial.url}" target="_blank">View on Codeforces →</a></p>
  
  ${content}

  <script>
    // Make all spoilers toggleable
    document.querySelectorAll('.spoiler-title').forEach(title => {
      title.addEventListener('click', function() {
        const spoiler = this.closest('.spoiler');
        spoiler.classList.toggle('open');
      });
    });
    
    // Open all spoilers by default for easier reading
    document.querySelectorAll('.spoiler').forEach(spoiler => {
      spoiler.classList.add('open');
    });
  </script>
</body>
</html>`;
}

// Get problem list from contest page
function getProblemList(html) {
  const problems = [];
  
  // Try multiple patterns
  const patterns = [
    /href="\/contest\/\d+\/problem\/([A-Z]\d?)"/gi,
    /href='\/contest\/\d+\/problem\/([A-Z]\d?)'/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    for (const match of matches) {
      problems.push(match[1]);
    }
  }
  
  return [...new Set(problems)].sort(); // Remove duplicates and sort
}

// Process a single contest
async function processContest(contest, problemRatings, checkpoint) {
  const contestId = contest.id;
  const contestDir = path.join(CONFIG.OUTPUT_DIR, 'contests', String(contestId));
  
  // Create contest directory
  fs.mkdirSync(contestDir, { recursive: true });
  fs.mkdirSync(path.join(contestDir, 'problems'), { recursive: true });
  fs.mkdirSync(path.join(contestDir, 'images'), { recursive: true });
  
  const contestData = {
    id: contestId,
    name: contest.name,
    startTime: contest.startTimeSeconds ? new Date(contest.startTimeSeconds * 1000).toISOString() : null,
    durationSeconds: contest.durationSeconds,
    type: contest.type,
    problems: [],
    tutorial: null,
    scrapedAt: new Date().toISOString(),
  };

  // Scrape contest page to get problem list and tutorial link
  problemBar.update({ status: 'Fetching contest page...' });
  const contestPageResult = await scrapeWithFlaresolverr(`https://codeforces.com/contest/${contestId}`);
  
  if (!contestPageResult.success) {
    stats.errors.push({ contestId, error: contestPageResult.error, type: 'contest_page' });
    return contestData;
  }

  await sleep(CONFIG.DELAY_BETWEEN_REQUESTS);

  // Get problem list
  const problemIndices = getProblemList(contestPageResult.html);
  problemBar.setTotal(problemIndices.length);
  
  // Find tutorial URL
  const tutorialUrl = findTutorialUrl(contestPageResult.html, contestId);
  
  // Scrape each problem
  for (let i = 0; i < problemIndices.length; i++) {
    const problemIndex = problemIndices[i];
    problemBar.update(i + 1, { status: `Problem ${problemIndex}` });
    
    const problemUrl = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
    const problemResult = await scrapeWithFlaresolverr(problemUrl);
    
    if (!problemResult.success) {
      stats.errors.push({ contestId, problemIndex, error: problemResult.error, type: 'problem' });
      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
      continue;
    }

    // Parse problem
    const parsed = parseProblemHtml(problemResult.html, contestId, problemIndex);
    
    // Get rating from API data
    const ratingKey = `${contestId}-${problemIndex}`;
    const ratingData = problemRatings[ratingKey] || {};
    
    const problemData = {
      contestId,
      index: problemIndex,
      title: parsed.title || ratingData.name || `Problem ${problemIndex}`,
      timeLimit: parsed.timeLimit,
      memoryLimit: parsed.memoryLimit,
      rating: ratingData.rating || null,
      tags: ratingData.tags || [],
      statementHtml: parsed.statementHtml,
      inputSpecHtml: parsed.inputSpecHtml,
      outputSpecHtml: parsed.outputSpecHtml,
      noteHtml: parsed.noteHtml,
      samples: parsed.samples,
      images: [],
      url: problemUrl,
    };

    // Download images
    for (let j = 0; j < parsed.images.length; j++) {
      const imageUrl = parsed.images[j];
      const imageName = `${problemIndex}_${j + 1}${path.extname(imageUrl) || '.png'}`;
      const localPath = path.join(contestDir, 'images', imageName);
      
      if (await downloadImage(imageUrl, localPath)) {
        problemData.images.push(`images/${imageName}`);
        stats.imagesDownloaded++;
        imageBar.increment();
      }
    }

    // Save clean, self-contained problem HTML
    fs.writeFileSync(
      path.join(contestDir, 'problems', `${problemIndex}.html`),
      createCleanProblemHtml(problemResult.html, problemData)
    );

    // Save raw HTML backup (compressed reference)
    fs.writeFileSync(
      path.join(contestDir, 'problems', `${problemIndex}_raw.html`),
      problemResult.html
    );

    // Save parsed problem JSON
    fs.writeFileSync(
      path.join(contestDir, 'problems', `${problemIndex}.json`),
      JSON.stringify(problemData, null, 2)
    );

    contestData.problems.push(problemData);
    stats.problemsScraped++;
    
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
  }

  // Scrape tutorial if available
  if (tutorialUrl) {
    problemBar.update({ status: 'Fetching tutorial...' });
    const tutorialResult = await scrapeWithFlaresolverr(tutorialUrl);
    
    if (tutorialResult.success) {
      const tutorialParsed = parseTutorialHtml(tutorialResult.html);
      
      contestData.tutorial = {
        url: tutorialUrl,
        title: tutorialParsed.title,
        contentHtml: tutorialParsed.contentHtml,
        images: [],
      };

      // Download tutorial images
      for (let j = 0; j < tutorialParsed.images.length; j++) {
        const imageUrl = tutorialParsed.images[j];
        const imageName = `tutorial_${j + 1}${path.extname(imageUrl) || '.png'}`;
        const localPath = path.join(contestDir, 'images', imageName);
        
        if (await downloadImage(imageUrl, localPath)) {
          contestData.tutorial.images.push(`images/${imageName}`);
          stats.imagesDownloaded++;
          imageBar.increment();
        }
      }

      // Save clean, self-contained tutorial HTML with working spoilers
      fs.writeFileSync(
        path.join(contestDir, 'tutorial.html'),
        createCleanTutorialHtml(tutorialResult.html, contestData.tutorial)
      );

      // Save raw HTML backup
      fs.writeFileSync(
        path.join(contestDir, 'tutorial_raw.html'),
        tutorialResult.html
      );

      stats.tutorialsScraped++;
    } else {
      stats.errors.push({ contestId, error: tutorialResult.error, type: 'tutorial' });
    }
    
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
  }

  // Save contest data
  fs.writeFileSync(
    path.join(contestDir, 'contest.json'),
    JSON.stringify(contestData, null, 2)
  );

  stats.contestsScraped++;
  return contestData;
}

// Check FlareSolverr
async function checkFlaresolverr() {
  try {
    const response = await fetch('http://localhost:8191/');
    const data = await response.json();
    console.log(chalk.green(`✅ FlareSolverr v${data.version} is ready`));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ FlareSolverr is not running!'));
    console.error(chalk.yellow('   Run: docker start flaresolverr'));
    console.error(chalk.yellow('   Or:  docker run -d --name flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest'));
    return false;
  }
}

// Main
async function main() {
  console.log(chalk.bold.cyan('\n🏆 CODEFORCES CONTEST SCRAPER\n'));
  console.log(chalk.gray(`Scraping last ${CONFIG.CONTESTS_TO_SCRAPE} contests...`));
  console.log(chalk.gray(`Output directory: ${CONFIG.OUTPUT_DIR}`));
  console.log(chalk.gray(`Delay between requests: ${CONFIG.DELAY_BETWEEN_REQUESTS / 1000}s\n`));

  // Check FlareSolverr
  if (!await checkFlaresolverr()) {
    process.exit(1);
  }

  // Create output directory
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });

  // Load checkpoint
  const checkpoint = loadCheckpoint();
  console.log(chalk.gray(`Checkpoint: ${checkpoint.completedContests.length} contests already scraped\n`));

  // Fetch data from API
  const contests = await fetchContestList();
  const problemRatings = await fetchProblemRatings();

  // Filter out already completed contests
  const remainingContests = contests.filter(c => !checkpoint.completedContests.includes(c.id));
  
  if (remainingContests.length === 0) {
    console.log(chalk.green('\n✅ All contests already scraped!'));
    return;
  }

  console.log(chalk.blue(`\n📥 Starting scrape of ${remainingContests.length} contests...\n`));

  // Calculate estimates
  const estimatedPages = remainingContests.length * 8; // ~7 problems + 1 tutorial avg
  const estimatedMinutes = Math.ceil((estimatedPages * CONFIG.DELAY_BETWEEN_REQUESTS) / 60000);
  console.log(chalk.gray(`Estimated time: ~${estimatedMinutes} minutes\n`));

  // Setup progress bars
  contestBar = multibar.create(remainingContests.length, 0, { task: 'Contests', status: 'Starting...' });
  problemBar = multibar.create(10, 0, { task: 'Problems', status: 'Waiting...' });
  imageBar = multibar.create(100, 0, { task: 'Images  ', status: '' });

  // Process each contest
  const allContestData = [];
  
  for (let i = 0; i < remainingContests.length; i++) {
    const contest = remainingContests[i];
    contestBar.update(i, { status: `${contest.name.substring(0, 40)}...` });
    problemBar.update(0);
    
    try {
      const contestData = await processContest(contest, problemRatings, checkpoint);
      allContestData.push(contestData);
      
      // Update checkpoint
      checkpoint.completedContests.push(contest.id);
      checkpoint.lastContestIndex = i + 1;
      saveCheckpoint(checkpoint);
      
    } catch (error) {
      stats.errors.push({ contestId: contest.id, error: error.message, type: 'fatal' });
      console.error(chalk.red(`\n❌ Error processing contest ${contest.id}: ${error.message}`));
    }
    
    contestBar.update(i + 1);
  }

  multibar.stop();

  // Save combined data
  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, 'all-contests.json'),
    JSON.stringify(allContestData, null, 2)
  );

  // Save index
  const index = allContestData.map(c => ({
    id: c.id,
    name: c.name,
    startTime: c.startTime,
    problemCount: c.problems.length,
    hasTutorial: !!c.tutorial,
    problems: c.problems.map(p => ({
      index: p.index,
      title: p.title,
      rating: p.rating,
      tags: p.tags,
    })),
  }));
  
  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, 'index.json'),
    JSON.stringify(index, null, 2)
  );

  // Print summary
  const duration = ((Date.now() - stats.startTime) / 60000).toFixed(1);
  
  console.log(chalk.bold.green('\n\n✅ SCRAPING COMPLETE!\n'));
  console.log(chalk.white('📊 Statistics:'));
  console.log(chalk.gray(`   Contests scraped: ${stats.contestsScraped}`));
  console.log(chalk.gray(`   Problems scraped: ${stats.problemsScraped}`));
  console.log(chalk.gray(`   Tutorials scraped: ${stats.tutorialsScraped}`));
  console.log(chalk.gray(`   Images downloaded: ${stats.imagesDownloaded}`));
  console.log(chalk.gray(`   Errors: ${stats.errors.length}`));
  console.log(chalk.gray(`   Duration: ${duration} minutes`));
  
  console.log(chalk.white('\n📁 Output:'));
  console.log(chalk.gray(`   ${CONFIG.OUTPUT_DIR}/`));
  console.log(chalk.gray(`   ├── index.json (contest index)`));
  console.log(chalk.gray(`   ├── all-contests.json (combined data)`));
  console.log(chalk.gray(`   └── contests/`));
  console.log(chalk.gray(`       └── {id}/`));
  console.log(chalk.gray(`           ├── contest.json`));
  console.log(chalk.gray(`           ├── problems/{A,B,C...}.json`));
  console.log(chalk.gray(`           └── images/`));

  if (stats.errors.length > 0) {
    console.log(chalk.yellow(`\n⚠️  ${stats.errors.length} errors occurred:`));
    stats.errors.slice(0, 10).forEach(e => {
      console.log(chalk.gray(`   - Contest ${e.contestId}${e.problemIndex ? ' Problem ' + e.problemIndex : ''}: ${e.error}`));
    });
    if (stats.errors.length > 10) {
      console.log(chalk.gray(`   ... and ${stats.errors.length - 10} more`));
    }
    
    // Save errors to file
    fs.writeFileSync(
      path.join(CONFIG.OUTPUT_DIR, 'errors.json'),
      JSON.stringify(stats.errors, null, 2)
    );
  }

  console.log(chalk.cyan('\n💡 Next steps:'));
  console.log(chalk.gray('   1. Review the scraped data in ./codeforces-data/'));
  console.log(chalk.gray('   2. Upload to Supabase storage'));
  console.log(chalk.gray('   3. Import index.json into database'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});

