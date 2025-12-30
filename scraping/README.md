# Aman.ai AI Primers Scraper

This directory contains scripts to scrape AI primers from aman.ai and build a knowledge graph for the ContentReel app.

## Prerequisites

```bash
npm install
```

## Usage

### 1. Scrape the Index

First, scrape the main primers page to get all article URLs:

```bash
npm run scrape:index
# or
node scrape-aman-index.js
```

This creates `./output/primers-index.json` with all 140+ article URLs organized by category.

### 2. Scrape All Articles

Then, scrape each article and extract H3 sections as individual cards:

```bash
npm run scrape:articles
# or
node scrape-aman-articles.js
```

This creates:
- `./output/articles/{slug}/` - Raw HTML and processed cards for each article
- `./output/cards/all-cards.json` - All cards combined
- `./output/scrape-checkpoint.json` - Progress checkpoint (resume if interrupted)

The scraper:
- Respects a 2-second delay between requests
- Saves progress to checkpoint (can resume if interrupted)
- Extracts H3 sections as individual cards
- Converts HTML to Markdown
- Infers difficulty and tags from content

### 3. Build the Knowledge Graph

After scraping, build the graph structure with relationships:

```bash
npm run build:graph
# or
node build-ai-graph.js
```

This creates:
- `../mobile/data/ai-primers/` - Card data for the mobile app
- `../mobile/data/graphs/ai-primers-graph.json` - Knowledge graph

## Output Structure

```
output/
├── primers-index.json          # All article URLs by category
├── scrape-checkpoint.json      # Scraping progress
├── articles/
│   └── {slug}/
│       ├── raw.html           # Original page HTML
│       ├── sections.json      # Extracted sections
│       └── cards.json         # Processed cards
└── cards/
    ├── all-cards.json         # All cards combined
    └── {category}.json        # Cards by category

../mobile/data/
├── ai-primers/
│   ├── index.json            # Card index
│   ├── all-cards.json        # All cards with links
│   └── {category}.json       # Cards by category
└── graphs/
    └── ai-primers-graph.json # Knowledge graph
```

## Card Schema

Each card contains:

```typescript
{
  id: string                    // e.g., "ai-transformers-self-attention-5"
  domain: "ai_primers"
  category: string              // e.g., "Algorithms/Architecture"
  article: string               // e.g., "Transformers"
  articleSlug: string           // e.g., "transformers"
  chapter: string               // H2 heading
  title: string                 // H3 heading (section title)
  
  contentHtml: string           // Section content as HTML
  contentMarkdown: string       // Section content as Markdown
  
  difficulty: 1-5               // Inferred from content
  estimatedMinutes: number      // Based on word count
  tags: string[]                // Extracted ML/AI terms
  
  nextCards: string[]           // Sequential links
  relatedCards: string[]        // Similarity-based links
  siblings: string[]            // Same article sections
  
  metadata: {
    hasCode: boolean
    hasMath: boolean
    hasImages: boolean
    wordCount: number
  }
  
  sourceUrl: string
  scrapedAt: string
}
```

## Graph Schema

The knowledge graph enables navigation:

```typescript
{
  domain: "ai_primers"
  nodes: { [cardId]: GraphNode }
  edges: Array<{
    source: string
    target: string
    type: "next" | "related" | "sibling"
  }>
  adjacencyList: {
    [cardId]: {
      next: string[]      // Sequential cards
      related: string[]   // Similar cards (different articles)
      siblings: string[]  // Same article cards
    }
  }
}
```

## Categories

The primers are organized into these categories:
- Algorithms/Architecture (30 articles)
- Data/Training (25 articles)
- Models (22 articles)
- NLP/LLMs (20 articles)
- Miscellaneous (17 articles)
- On-Device AI (5 articles)
- Offline/Online Evaluation (4 articles)
- Vision (4 articles)
- Project Planning (4 articles)
- Multimodal AI/VLMs (3 articles)
- MLOps (3 articles)
- Hyperparameters (2 articles)
- Speech (1 article)
- Practice (1 article)

