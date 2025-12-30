#!/usr/bin/env node
/**
 * Aman.ai Index Scraper
 * Scrapes the main primers page to get all article URLs organized by category
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CONFIG = {
  BASE_URL: 'https://aman.ai',
  INDEX_URL: 'https://aman.ai/primers/ai/',
  OUTPUT_DIR: './output',
  INDEX_FILE: './output/primers-index.json',
};

async function scrapeIndex() {
  console.log(chalk.bold.cyan('\n🤖 AMAN.AI PRIMERS INDEX SCRAPER\n'));
  
  // Create output directory
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  
  console.log(chalk.blue('🚀 Launching browser...'));
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(chalk.blue(`📄 Navigating to ${CONFIG.INDEX_URL}...`));
    await page.goto(CONFIG.INDEX_URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for content to load
    await page.waitForSelector('article', { timeout: 30000 });
    
    console.log(chalk.blue('📊 Extracting article links...'));
    
    // Extract all categories and their articles
    const primers = await page.evaluate((baseUrl) => {
      const result = {
        categories: [],
        articles: [],
        scrapedAt: new Date().toISOString(),
        debug: {}
      };
      
      const article = document.querySelector('article');
      if (!article) {
        result.debug.error = 'No article element found';
        return result;
      }
      
      result.debug.articleFound = true;
      result.debug.articleHTML = article.innerHTML.substring(0, 500);
      
      // First pass: collect all headings to build category map
      const headings = article.querySelectorAll('h2, h3');
      result.debug.headingsCount = headings.length;
      
      // Build category list from headings
      let categoryOrder = 0;
      headings.forEach(h => {
        const text = h.textContent.trim();
        if (text && text !== 'Overview') { // Skip overview as it's not a category
          categoryOrder++;
          result.categories.push({
            name: text,
            order: categoryOrder
          });
        }
      });
      
      // Second pass: find all article links
      // First check all links in the article to see their formats
      const allLinksInArticle = article.querySelectorAll('a');
      result.debug.allLinksInArticle = allLinksInArticle.length;
      
      // Sample first 5 link hrefs for debugging
      result.debug.sampleLinks = [];
      for (let i = 0; i < Math.min(10, allLinksInArticle.length); i++) {
        result.debug.sampleLinks.push({
          href: allLinksInArticle[i].getAttribute('href'),
          text: allLinksInArticle[i].textContent.substring(0, 50)
        });
      }
      
      // Links are in format: ../ai/topic-name (relative paths)
      // Get all links that point to AI primers (contain '../ai/' or '/ai/')
      const allLinks = article.querySelectorAll('a[href*="/ai/"], a[href*="../ai/"]');
      result.debug.linksFound = allLinks.length;
      
      let articleOrder = 0;
      
      // Track which category we're in by walking through article children in order
      const articleChildren = Array.from(article.children);
      let currentCategory = 'Uncategorized';
      categoryOrder = 0;  // Reset the counter
      const categoryForListIndex = {};
      
      // Map each list element to its preceding category
      articleChildren.forEach((child, index) => {
        if (child.tagName === 'H2' || child.tagName === 'H3') {
          const catName = child.textContent.trim();
          if (catName !== 'Overview') {
            categoryOrder++;
            currentCategory = catName;
          }
        } else if (child.tagName === 'UL' || child.tagName === 'OL') {
          // Save the category for this list
          categoryForListIndex[index] = { name: currentCategory, order: categoryOrder };
        }
      });
      
      // Now process each list and its links
      articleChildren.forEach((child, index) => {
        if (child.tagName === 'UL' || child.tagName === 'OL') {
          const catInfo = categoryForListIndex[index] || { name: 'Uncategorized', order: 0 };
          
          const links = child.querySelectorAll('a[href*="/ai/"], a[href*="../ai/"]');
          links.forEach(link => {
            const href = link.getAttribute('href');
            const title = link.textContent.trim();
            
            // Skip empty or navigation links
            if (!title || title.length < 3) return;
            if (href === '../ai/' || href === '/ai/') return;
            
            articleOrder++;
            
            // Build full URL from relative path
            // ../ai/topic-name -> https://aman.ai/primers/ai/topic-name/
            let slug = href.replace('../ai/', '').replace('/ai/', '').replace(/\/$/, '');
            let fullUrl = baseUrl + '/primers/ai/' + slug + '/';
            
            result.articles.push({
              title: title,
              url: fullUrl,
              slug: slug,
              category: catInfo.name,
              categoryOrder: catInfo.order,
              orderInCategory: articleOrder
            });
          });
        }
      });
      
      return result;
    }, CONFIG.BASE_URL);
    
    // Debug output
    if (primers.debug) {
      console.log(chalk.yellow('\n📋 Debug info:'));
      console.log(chalk.gray(`   Article element found: ${primers.debug.articleFound}`));
      console.log(chalk.gray(`   Headings count: ${primers.debug.headingsCount}`));
      console.log(chalk.gray(`   All links in article: ${primers.debug.allLinksInArticle}`));
      console.log(chalk.gray(`   Links with /primers/ai/: ${primers.debug.linksFound}`));
      if (primers.debug.sampleLinks && primers.debug.sampleLinks.length > 0) {
        console.log(chalk.yellow('   Sample links:'));
        primers.debug.sampleLinks.forEach((l, i) => {
          console.log(chalk.gray(`     ${i+1}. href="${l.href}" text="${l.text}"`));
        });
      }
      if (primers.debug.error) {
        console.log(chalk.red(`   Error: ${primers.debug.error}`));
      }
    }
    
    // Deduplicate articles by URL
    const seen = new Set();
    primers.articles = primers.articles.filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });
    
    // Add summary stats
    primers.stats = {
      totalCategories: primers.categories.length,
      totalArticles: primers.articles.length,
      byCategory: {}
    };
    
    primers.categories.forEach(cat => {
      primers.stats.byCategory[cat.name] = primers.articles.filter(a => a.category === cat.name).length;
    });
    
    // Save to file
    fs.writeFileSync(CONFIG.INDEX_FILE, JSON.stringify(primers, null, 2));
    
    console.log(chalk.green('\n✅ INDEX SCRAPING COMPLETE!\n'));
    console.log(chalk.white('📊 Statistics:'));
    console.log(chalk.gray(`   Categories: ${primers.stats.totalCategories}`));
    console.log(chalk.gray(`   Articles: ${primers.stats.totalArticles}`));
    console.log('');
    
    console.log(chalk.white('📁 Categories breakdown:'));
    Object.entries(primers.stats.byCategory).forEach(([cat, count]) => {
      console.log(chalk.gray(`   ${cat}: ${count} articles`));
    });
    
    console.log(chalk.white('\n📄 Output:'));
    console.log(chalk.gray(`   ${CONFIG.INDEX_FILE}`));
    
    console.log(chalk.cyan('\n💡 Next step:'));
    console.log(chalk.gray('   Run: node scrape-aman-articles.js'));
    
    return primers;
    
  } finally {
    await browser.close();
  }
}

// Run
scrapeIndex().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});

