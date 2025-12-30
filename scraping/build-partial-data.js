#!/usr/bin/env node
/**
 * Build partial AI primers data for testing
 * Run this while scraping is still in progress to test with available data
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CONFIG = {
  ARTICLES_DIR: './output/articles',
  OUTPUT_DIR: '../mobile/data/ai-primers',
  GRAPH_FILE: '../mobile/data/graphs/ai-primers-graph.json',
};

// Compute Jaccard similarity between two tag sets
function jaccardSimilarity(tags1, tags2) {
  const set1 = new Set(tags1);
  const set2 = new Set(tags2);
  const intersection = [...set1].filter(t => set2.has(t)).length;
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

function main() {
  console.log(chalk.bold.cyan('\n📦 BUILDING PARTIAL AI PRIMERS DATA\n'));
  
  // Find all scraped articles
  if (!fs.existsSync(CONFIG.ARTICLES_DIR)) {
    console.error(chalk.red('❌ No scraped articles found. Run scraper first.'));
    process.exit(1);
  }
  
  const articleDirs = fs.readdirSync(CONFIG.ARTICLES_DIR)
    .filter(d => fs.statSync(path.join(CONFIG.ARTICLES_DIR, d)).isDirectory());
  
  console.log(chalk.green(`✅ Found ${articleDirs.length} scraped articles`));
  
  // Load all cards
  const allCards = [];
  articleDirs.forEach(slug => {
    const cardsFile = path.join(CONFIG.ARTICLES_DIR, slug, 'cards.json');
    if (fs.existsSync(cardsFile)) {
      const cards = JSON.parse(fs.readFileSync(cardsFile, 'utf8'));
      allCards.push(...cards);
    }
  });
  
  console.log(chalk.green(`✅ Loaded ${allCards.length} cards`));
  
  // Build graph
  console.log(chalk.blue('🔗 Building knowledge graph...'));
  
  const graph = {
    domain: 'ai_primers',
    version: '1.0-partial',
    generatedAt: new Date().toISOString(),
    nodes: {},
    edges: [],
    adjacencyList: {},
    stats: {
      totalNodes: 0,
      totalEdges: 0,
      edgesByType: { next: 0, related: 0 }
    }
  };
  
  // Create nodes
  allCards.forEach(card => {
    graph.nodes[card.id] = {
      id: card.id,
      title: card.title,
      article: card.article,
      articleSlug: card.articleSlug,
      category: card.category,
      chapter: card.chapter,
      difficulty: card.difficulty,
      tags: card.tags,
      order: card.order,
      estimatedMinutes: card.estimatedMinutes
    };
    
    graph.adjacencyList[card.id] = {
      next: [],
      related: [],
      siblings: []
    };
  });
  
  graph.stats.totalNodes = Object.keys(graph.nodes).length;
  
  // Create edges
  allCards.forEach(card => {
    // Next cards (same article, next in order)
    const sameArticle = allCards
      .filter(c => c.articleSlug === card.articleSlug && c.order > card.order)
      .sort((a, b) => a.order - b.order);
    
    const nextCards = sameArticle.slice(0, 2).map(c => c.id);
    nextCards.forEach(targetId => {
      graph.edges.push({ source: card.id, target: targetId, type: 'next' });
      graph.adjacencyList[card.id].next.push(targetId);
      graph.stats.edgesByType.next++;
    });
    
    // Related cards (different article, similar tags)
    const related = allCards
      .filter(c => c.id !== card.id && c.articleSlug !== card.articleSlug)
      .map(c => ({ id: c.id, score: jaccardSimilarity(card.tags, c.tags) }))
      .filter(c => c.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    related.forEach(({ id }) => {
      graph.edges.push({ source: card.id, target: id, type: 'related' });
      graph.adjacencyList[card.id].related.push(id);
      graph.stats.edgesByType.related++;
    });
    
    // Siblings (same article)
    const siblings = allCards
      .filter(c => c.id !== card.id && c.articleSlug === card.articleSlug)
      .sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map(c => c.id);
    
    graph.adjacencyList[card.id].siblings = siblings;
  });
  
  graph.stats.totalEdges = graph.edges.length;
  
  // Update cards with links
  const linkedCards = allCards.map(card => ({
    ...card,
    nextCards: graph.adjacencyList[card.id]?.next || [],
    relatedCards: graph.adjacencyList[card.id]?.related || [],
    siblings: graph.adjacencyList[card.id]?.siblings || []
  }));
  
  // Create output directories
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(CONFIG.GRAPH_FILE), { recursive: true });
  
  // Save graph
  fs.writeFileSync(CONFIG.GRAPH_FILE, JSON.stringify(graph, null, 2));
  
  // Save all cards
  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, 'all-cards.json'),
    JSON.stringify(linkedCards, null, 2)
  );
  
  // Group by category
  const byCategory = {};
  linkedCards.forEach(card => {
    const key = card.category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (!byCategory[key]) byCategory[key] = { category: card.category, cards: [] };
    byCategory[key].cards.push(card);
  });
  
  Object.entries(byCategory).forEach(([key, data]) => {
    fs.writeFileSync(
      path.join(CONFIG.OUTPUT_DIR, `${key}.json`),
      JSON.stringify(data, null, 2)
    );
  });
  
  // Create index
  const index = {
    domain: 'ai_primers',
    totalCards: linkedCards.length,
    isPartial: true,
    categories: Object.entries(byCategory).map(([key, data]) => ({
      id: key,
      name: data.category,
      cardCount: data.cards.length,
      file: `${key}.json`
    })),
    articles: [...new Set(linkedCards.map(c => c.articleSlug))].map(slug => {
      const articleCards = linkedCards.filter(c => c.articleSlug === slug);
      return {
        slug,
        title: articleCards[0]?.article,
        category: articleCards[0]?.category,
        cardCount: articleCards.length
      };
    }),
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, 'index.json'),
    JSON.stringify(index, null, 2)
  );
  
  // Summary
  console.log(chalk.bold.green('\n✅ PARTIAL DATA BUILD COMPLETE!\n'));
  console.log(chalk.white('📊 Statistics:'));
  console.log(chalk.gray(`   Articles: ${articleDirs.length}`));
  console.log(chalk.gray(`   Cards: ${linkedCards.length}`));
  console.log(chalk.gray(`   Graph nodes: ${graph.stats.totalNodes}`));
  console.log(chalk.gray(`   Graph edges: ${graph.stats.totalEdges}`));
  
  console.log(chalk.white('\n📁 Output:'));
  console.log(chalk.gray(`   ${CONFIG.GRAPH_FILE}`));
  console.log(chalk.gray(`   ${CONFIG.OUTPUT_DIR}/index.json`));
  console.log(chalk.gray(`   ${CONFIG.OUTPUT_DIR}/all-cards.json`));
}

main();

