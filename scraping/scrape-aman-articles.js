#!/usr/bin/env node
/**
 * Aman.ai Article Scraper
 * Scrapes each primer article and extracts H3 sections as individual cards
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

const CONFIG = {
  INDEX_FILE: './output/primers-index.json',
  OUTPUT_DIR: './output/articles',
  CARDS_DIR: './output/cards',
  CHECKPOINT_FILE: './output/scrape-checkpoint.json',
  DELAY_BETWEEN_REQUESTS: 2000, // 2 seconds
  MAX_RETRIES: 3,
};

// Initialize Turndown for HTML to Markdown conversion
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// Stats
const stats = {
  articlesScraped: 0,
  sectionsExtracted: 0,
  cardsCreated: 0,
  errors: [],
  startTime: Date.now()
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load checkpoint
function loadCheckpoint() {
  try {
    if (fs.existsSync(CONFIG.CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.CHECKPOINT_FILE, 'utf8'));
    }
  } catch (e) {
    console.log(chalk.yellow('⚠️  Could not load checkpoint, starting fresh'));
  }
  return { completedArticles: [] };
}

// Save checkpoint
function saveCheckpoint(checkpoint) {
  fs.writeFileSync(CONFIG.CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

// Generate card ID from article and section
function generateCardId(articleSlug, sectionTitle, index) {
  const cleanSection = sectionTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  return `ai-${articleSlug}-${cleanSection}-${index}`;
}

// Extract sections from article HTML
function extractSections(html, articleInfo) {
  const $ = cheerio.load(html);
  const sections = [];
  
  // Find the main article content
  const article = $('article').first();
  if (!article.length) {
    console.log(chalk.yellow('   ⚠️  No article element found'));
    return sections;
  }
  
  // Get all content children in order
  let currentH2 = '';
  let currentH3 = '';
  let sectionContent = [];
  let sectionOrder = 0;
  let h3Order = 0;
  
  // Process the article tree
  const processNode = (el) => {
    const $el = $(el);
    const tagName = el.tagName?.toLowerCase();
    
    if (tagName === 'h2') {
      // Save previous section if exists
      if (currentH3 && sectionContent.length > 0) {
        sections.push(createSection());
      }
      currentH2 = $el.text().trim();
      currentH3 = '';
      sectionContent = [];
      h3Order = 0;
    } 
    else if (tagName === 'h3') {
      // Save previous H3 section if exists
      if (currentH3 && sectionContent.length > 0) {
        sections.push(createSection());
      }
      currentH3 = $el.text().trim();
      sectionContent = [];
      h3Order++;
      sectionOrder++;
    }
    else if (tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
      // Include subheadings in current section
      sectionContent.push($.html($el));
    }
    else if (tagName === 'p' || tagName === 'ul' || tagName === 'ol' || 
             tagName === 'pre' || tagName === 'blockquote' || 
             tagName === 'table' || tagName === 'figure' || tagName === 'div') {
      // Content elements - only add if we have an H3 context
      if (currentH3) {
        sectionContent.push($.html($el));
      }
    }
  };
  
  const createSection = () => {
    const contentHtml = sectionContent.join('\n');
    const contentMarkdown = turndown.turndown(contentHtml);
    
    return {
      id: generateCardId(articleInfo.slug, currentH3, sectionOrder),
      articleSlug: articleInfo.slug,
      articleTitle: articleInfo.title,
      category: articleInfo.category,
      chapter: currentH2 || articleInfo.title,
      title: currentH3,
      order: sectionOrder,
      orderInChapter: h3Order,
      contentHtml: contentHtml,
      contentMarkdown: contentMarkdown,
      contentLength: contentHtml.length,
      wordCount: contentMarkdown.split(/\s+/).length,
      hasCode: contentHtml.includes('<pre') || contentHtml.includes('<code'),
      hasMath: contentHtml.includes('MathJax') || contentHtml.includes('\\(') || contentHtml.includes('$$'),
      hasImages: contentHtml.includes('<img'),
      url: `${articleInfo.url}#${currentH3.toLowerCase().replace(/\s+/g, '-')}`
    };
  };
  
  // Walk through immediate children of article
  article.children().each((i, el) => {
    processNode(el);
    
    // Also process nested content in divs
    $(el).find('h2, h3, h4, h5, h6, p, ul, ol, pre, blockquote, table, figure').each((j, nested) => {
      processNode(nested);
    });
  });
  
  // Don't forget the last section
  if (currentH3 && sectionContent.length > 0) {
    sections.push(createSection());
  }
  
  return sections;
}

// Infer difficulty from section content and position
function inferDifficulty(section, articleOrder, totalArticles) {
  let difficulty = 2; // Default: beginner-friendly
  
  // Position in article (later = more advanced)
  if (section.order > 15) difficulty += 1;
  if (section.order > 30) difficulty += 1;
  
  // Content complexity indicators
  const advancedTerms = [
    'theorem', 'proof', 'derivation', 'optimization', 'convergence',
    'gradient', 'jacobian', 'hessian', 'eigenvalue', 'manifold',
    'attention mechanism', 'transformer', 'backpropagation',
    'regularization', 'hyperparameter', 'architecture'
  ];
  
  const contentLower = section.contentMarkdown.toLowerCase();
  const matchCount = advancedTerms.filter(term => contentLower.includes(term)).length;
  if (matchCount >= 3) difficulty += 1;
  if (matchCount >= 6) difficulty += 1;
  
  // Has math = slightly more advanced
  if (section.hasMath) difficulty += 0.5;
  
  // Has code = practical application level
  if (section.hasCode) difficulty += 0.5;
  
  return Math.min(5, Math.max(1, Math.round(difficulty)));
}

// Extract tags from section content
function extractTags(section) {
  const tags = new Set();
  const contentLower = section.contentMarkdown.toLowerCase();
  
  // Category-based tags
  tags.add(section.category.toLowerCase().replace(/[^a-z\s]/g, '').trim());
  
  // Common ML/AI terms
  const mlTerms = [
    'neural network', 'deep learning', 'machine learning', 'transformer',
    'attention', 'embedding', 'convolution', 'cnn', 'rnn', 'lstm', 'gru',
    'bert', 'gpt', 'llm', 'nlp', 'computer vision', 'reinforcement learning',
    'supervised learning', 'unsupervised learning', 'optimization',
    'gradient descent', 'backpropagation', 'loss function', 'activation',
    'regularization', 'dropout', 'batch normalization', 'fine-tuning',
    'transfer learning', 'data augmentation', 'cross-validation'
  ];
  
  mlTerms.forEach(term => {
    if (contentLower.includes(term)) {
      tags.add(term);
    }
  });
  
  return Array.from(tags).slice(0, 8); // Limit to 8 tags
}

// Convert section to card format
function sectionToCard(section, articleInfo, totalSections) {
  const difficulty = inferDifficulty(section, articleInfo.orderInCategory, 100);
  const tags = extractTags(section);
  
  return {
    id: section.id,
    domain: 'ai_primers',
    category: section.category,
    article: section.articleTitle,
    articleSlug: section.articleSlug,
    chapter: section.chapter,
    title: section.title,
    subtitle: section.chapter !== section.articleTitle ? section.chapter : null,
    
    contentHtml: section.contentHtml,
    contentMarkdown: section.contentMarkdown,
    
    order: section.order,
    orderInChapter: section.orderInChapter,
    
    difficulty: difficulty,
    estimatedMinutes: Math.max(1, Math.ceil(section.wordCount / 200)), // ~200 wpm reading
    
    tags: tags,
    
    metadata: {
      hasCode: section.hasCode,
      hasMath: section.hasMath,
      hasImages: section.hasImages,
      wordCount: section.wordCount,
      contentLength: section.contentLength
    },
    
    // Links (to be populated in graph building phase)
    nextCards: [],
    relatedCards: [],
    prerequisites: [],
    
    sourceUrl: section.url,
    scrapedAt: new Date().toISOString()
  };
}

// Scrape a single article
async function scrapeArticle(page, articleInfo) {
  const result = {
    article: articleInfo,
    sections: [],
    cards: [],
    error: null
  };
  
  try {
    await page.goto(articleInfo.url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for content
    await page.waitForSelector('article', { timeout: 30000 });
    
    // Extra wait for dynamic content
    await sleep(1000);
    
    // Get full page HTML
    const html = await page.content();
    
    // Save raw HTML
    const articleDir = path.join(CONFIG.OUTPUT_DIR, articleInfo.slug);
    fs.mkdirSync(articleDir, { recursive: true });
    fs.writeFileSync(path.join(articleDir, 'raw.html'), html);
    
    // Extract sections
    result.sections = extractSections(html, articleInfo);
    
    // Convert sections to cards
    result.cards = result.sections.map((section, i) => 
      sectionToCard(section, articleInfo, result.sections.length)
    );
    
    // Save article data
    fs.writeFileSync(
      path.join(articleDir, 'sections.json'),
      JSON.stringify(result.sections, null, 2)
    );
    
    fs.writeFileSync(
      path.join(articleDir, 'cards.json'),
      JSON.stringify(result.cards, null, 2)
    );
    
    stats.sectionsExtracted += result.sections.length;
    stats.cardsCreated += result.cards.length;
    
  } catch (error) {
    result.error = error.message;
    stats.errors.push({
      article: articleInfo.slug,
      error: error.message
    });
  }
  
  return result;
}

// Main scraper
async function scrapeArticles() {
  console.log(chalk.bold.cyan('\n🤖 AMAN.AI ARTICLE SCRAPER\n'));
  
  // Load index
  if (!fs.existsSync(CONFIG.INDEX_FILE)) {
    console.error(chalk.red('❌ Index file not found! Run scrape-aman-index.js first.'));
    process.exit(1);
  }
  
  const index = JSON.parse(fs.readFileSync(CONFIG.INDEX_FILE, 'utf8'));
  console.log(chalk.green(`✅ Loaded index with ${index.articles.length} articles`));
  
  // Load checkpoint
  const checkpoint = loadCheckpoint();
  console.log(chalk.gray(`   Already scraped: ${checkpoint.completedArticles.length} articles`));
  
  // Filter remaining articles
  const remaining = index.articles.filter(a => !checkpoint.completedArticles.includes(a.slug));
  
  if (remaining.length === 0) {
    console.log(chalk.green('\n✅ All articles already scraped!'));
    return;
  }
  
  console.log(chalk.blue(`\n📥 Scraping ${remaining.length} articles...\n`));
  
  // Create directories
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(CONFIG.CARDS_DIR, { recursive: true });
  
  // Progress bar
  const progressBar = new cliProgress.SingleBar({
    format: '{bar} | {percentage}% | {value}/{total} articles | {article}',
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  
  progressBar.start(remaining.length, 0, { article: 'Starting...' });
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  
  // All cards collection
  const allCards = [];
  
  try {
    for (let i = 0; i < remaining.length; i++) {
      const article = remaining[i];
      progressBar.update(i, { article: article.title.substring(0, 40) });
      
      const result = await scrapeArticle(page, article);
      
      if (!result.error) {
        allCards.push(...result.cards);
        checkpoint.completedArticles.push(article.slug);
        saveCheckpoint(checkpoint);
        stats.articlesScraped++;
      }
      
      progressBar.update(i + 1);
      
      // Delay between requests
      if (i < remaining.length - 1) {
        await sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
      }
    }
  } finally {
    await browser.close();
    progressBar.stop();
  }
  
  // Save all cards to single file
  fs.writeFileSync(
    path.join(CONFIG.CARDS_DIR, 'all-cards.json'),
    JSON.stringify(allCards, null, 2)
  );
  
  // Save cards grouped by category
  const cardsByCategory = {};
  allCards.forEach(card => {
    const cat = card.category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (!cardsByCategory[cat]) {
      cardsByCategory[cat] = [];
    }
    cardsByCategory[cat].push(card);
  });
  
  Object.entries(cardsByCategory).forEach(([cat, cards]) => {
    fs.writeFileSync(
      path.join(CONFIG.CARDS_DIR, `${cat}.json`),
      JSON.stringify(cards, null, 2)
    );
  });
  
  // Print summary
  const duration = ((Date.now() - stats.startTime) / 60000).toFixed(1);
  
  console.log(chalk.bold.green('\n\n✅ ARTICLE SCRAPING COMPLETE!\n'));
  console.log(chalk.white('📊 Statistics:'));
  console.log(chalk.gray(`   Articles scraped: ${stats.articlesScraped}`));
  console.log(chalk.gray(`   Sections extracted: ${stats.sectionsExtracted}`));
  console.log(chalk.gray(`   Cards created: ${stats.cardsCreated}`));
  console.log(chalk.gray(`   Errors: ${stats.errors.length}`));
  console.log(chalk.gray(`   Duration: ${duration} minutes`));
  
  console.log(chalk.white('\n📁 Output:'));
  console.log(chalk.gray(`   ${CONFIG.OUTPUT_DIR}/ (raw articles)`));
  console.log(chalk.gray(`   ${CONFIG.CARDS_DIR}/ (processed cards)`));
  console.log(chalk.gray(`   ${CONFIG.CARDS_DIR}/all-cards.json (${allCards.length} cards)`));
  
  if (stats.errors.length > 0) {
    console.log(chalk.yellow(`\n⚠️  ${stats.errors.length} errors:`));
    stats.errors.forEach(e => {
      console.log(chalk.gray(`   - ${e.article}: ${e.error}`));
    });
  }
  
  console.log(chalk.cyan('\n💡 Next step:'));
  console.log(chalk.gray('   Run: node build-ai-graph.js'));
}

// Run
scrapeArticles().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});

