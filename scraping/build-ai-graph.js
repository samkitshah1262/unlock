#!/usr/bin/env node
/**
 * AI Primers Knowledge Graph Builder
 * Creates graph structure from scraped cards with relationships
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const CONFIG = {
  CARDS_FILE: './output/cards/all-cards.json',
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

// Find related cards based on tags and content
function findRelatedCards(card, allCards, limit = 5) {
  const candidates = allCards
    .filter(c => c.id !== card.id && c.articleSlug !== card.articleSlug) // Different article
    .map(c => ({
      id: c.id,
      score: jaccardSimilarity(card.tags, c.tags) * 2 + // Tag similarity
             (c.category === card.category ? 0.5 : 0) +  // Same category bonus
             (Math.abs(c.difficulty - card.difficulty) <= 1 ? 0.3 : 0) // Similar difficulty
    }))
    .filter(c => c.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return candidates.map(c => c.id);
}

// Find sibling cards (same article, different sections)
function findSiblingCards(card, allCards) {
  return allCards
    .filter(c => c.id !== card.id && c.articleSlug === card.articleSlug)
    .sort((a, b) => a.order - b.order)
    .map(c => c.id);
}

// Find next cards (sequential in same article)
function findNextCards(card, allCards) {
  const sameArticle = allCards
    .filter(c => c.articleSlug === card.articleSlug && c.order > card.order)
    .sort((a, b) => a.order - b.order);
  
  // Return next 1-2 sections
  return sameArticle.slice(0, 2).map(c => c.id);
}

// Build the knowledge graph
function buildGraph(cards) {
  console.log(chalk.blue('🔗 Building knowledge graph...'));
  
  const graph = {
    domain: 'ai_primers',
    version: '1.0',
    generatedAt: new Date().toISOString(),
    nodes: {},
    edges: [],
    adjacencyList: {},
    stats: {
      totalNodes: 0,
      totalEdges: 0,
      edgesByType: {
        next: 0,
        related: 0,
        sibling: 0
      }
    }
  };
  
  // Create nodes
  cards.forEach(card => {
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
  console.log(chalk.gray('   Computing relationships...'));
  
  cards.forEach((card, i) => {
    if (i % 100 === 0) {
      process.stdout.write(chalk.gray(`   Processing card ${i + 1}/${cards.length}\r`));
    }
    
    // Next cards (sequential)
    const nextCards = findNextCards(card, cards);
    nextCards.forEach(targetId => {
      graph.edges.push({
        source: card.id,
        target: targetId,
        type: 'next',
        weight: 1.0
      });
      graph.adjacencyList[card.id].next.push(targetId);
      graph.stats.edgesByType.next++;
    });
    
    // Related cards (by similarity)
    const relatedCards = findRelatedCards(card, cards, 5);
    relatedCards.forEach(targetId => {
      graph.edges.push({
        source: card.id,
        target: targetId,
        type: 'related',
        weight: 0.8
      });
      graph.adjacencyList[card.id].related.push(targetId);
      graph.stats.edgesByType.related++;
    });
    
    // Sibling cards (same article)
    const siblingCards = findSiblingCards(card, cards);
    siblingCards.forEach(targetId => {
      // Only store a few to avoid bloat
      if (graph.adjacencyList[card.id].siblings.length < 5) {
        graph.adjacencyList[card.id].siblings.push(targetId);
        // Don't create edge for siblings, just adjacency (would create too many edges)
      }
    });
  });
  
  graph.stats.totalEdges = graph.edges.length;
  console.log(''); // Clear progress line
  
  return graph;
}

// Update cards with computed relationships
function updateCardsWithLinks(cards, graph) {
  return cards.map(card => ({
    ...card,
    nextCards: graph.adjacencyList[card.id]?.next || [],
    relatedCards: graph.adjacencyList[card.id]?.related || [],
    siblings: graph.adjacencyList[card.id]?.siblings || []
  }));
}

// Group cards by category for separate files
function groupByCategory(cards) {
  const groups = {};
  cards.forEach(card => {
    const key = card.category.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (!groups[key]) {
      groups[key] = {
        category: card.category,
        cards: []
      };
    }
    groups[key].cards.push(card);
  });
  return groups;
}

// Main
function main() {
  console.log(chalk.bold.cyan('\n🤖 AI PRIMERS GRAPH BUILDER\n'));
  
  // Load cards
  if (!fs.existsSync(CONFIG.CARDS_FILE)) {
    console.error(chalk.red('❌ Cards file not found! Run scrape-aman-articles.js first.'));
    process.exit(1);
  }
  
  const cards = JSON.parse(fs.readFileSync(CONFIG.CARDS_FILE, 'utf8'));
  console.log(chalk.green(`✅ Loaded ${cards.length} cards`));
  
  // Build graph
  const graph = buildGraph(cards);
  
  // Update cards with links
  const linkedCards = updateCardsWithLinks(cards, graph);
  
  // Create output directories
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(CONFIG.GRAPH_FILE), { recursive: true });
  
  // Save graph
  fs.writeFileSync(CONFIG.GRAPH_FILE, JSON.stringify(graph, null, 2));
  
  // Save all cards (with links)
  fs.writeFileSync(
    path.join(CONFIG.OUTPUT_DIR, 'all-cards.json'),
    JSON.stringify(linkedCards, null, 2)
  );
  
  // Save cards by category
  const grouped = groupByCategory(linkedCards);
  Object.entries(grouped).forEach(([key, data]) => {
    fs.writeFileSync(
      path.join(CONFIG.OUTPUT_DIR, `${key}.json`),
      JSON.stringify(data, null, 2)
    );
  });
  
  // Create index file
  const index = {
    domain: 'ai_primers',
    totalCards: linkedCards.length,
    categories: Object.entries(grouped).map(([key, data]) => ({
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
  
  // Print summary
  console.log(chalk.bold.green('\n✅ GRAPH BUILD COMPLETE!\n'));
  
  console.log(chalk.white('📊 Graph Statistics:'));
  console.log(chalk.gray(`   Nodes (cards): ${graph.stats.totalNodes}`));
  console.log(chalk.gray(`   Edges (links): ${graph.stats.totalEdges}`));
  console.log(chalk.gray(`     - Next: ${graph.stats.edgesByType.next}`));
  console.log(chalk.gray(`     - Related: ${graph.stats.edgesByType.related}`));
  
  console.log(chalk.white('\n📁 Output:'));
  console.log(chalk.gray(`   ${CONFIG.GRAPH_FILE}`));
  console.log(chalk.gray(`   ${CONFIG.OUTPUT_DIR}/`));
  console.log(chalk.gray(`     ├── index.json`));
  console.log(chalk.gray(`     ├── all-cards.json`));
  Object.keys(grouped).forEach(key => {
    console.log(chalk.gray(`     ├── ${key}.json`));
  });
  
  console.log(chalk.white('\n📊 Categories:'));
  Object.entries(grouped)
    .sort((a, b) => b[1].cards.length - a[1].cards.length)
    .forEach(([key, data]) => {
      console.log(chalk.gray(`   ${data.category}: ${data.cards.length} cards`));
    });
  
  console.log(chalk.cyan('\n💡 Next steps:'));
  console.log(chalk.gray('   1. Copy files to mobile/data/'));
  console.log(chalk.gray('   2. Create AIPrimerCard component'));
  console.log(chalk.gray('   3. Integrate with App.tsx'));
}

main();

