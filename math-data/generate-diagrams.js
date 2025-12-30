#!/usr/bin/env node
/**
 * Math Diagram SVG Generator
 * 
 * Generates simple SVG diagrams for math concepts.
 * Uses predefined templates for common diagram types.
 */

const fs = require('fs');
const path = require('path');

// SVG Template Library
const SVG_TEMPLATES = {
  // 2D Coordinate system with vectors
  vector_2d: (options = {}) => {
    const { vectors = [], gridSize = 200, labels = true } = options;
    const mid = gridSize / 2;
    const scale = gridSize / 10;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${gridSize} ${gridSize}" width="${gridSize}" height="${gridSize}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="currentColor"/>
    </marker>
  </defs>
  
  <!-- Grid -->
  <g stroke="#333" stroke-width="0.5" opacity="0.3">`;
    
    for (let i = 0; i <= 10; i++) {
      const pos = i * scale;
      svg += `\n    <line x1="${pos}" y1="0" x2="${pos}" y2="${gridSize}"/>`;
      svg += `\n    <line x1="0" y1="${pos}" x2="${gridSize}" y2="${pos}"/>`;
    }
    
    svg += `
  </g>
  
  <!-- Axes -->
  <line x1="0" y1="${mid}" x2="${gridSize}" y2="${mid}" stroke="#666" stroke-width="2"/>
  <line x1="${mid}" y1="0" x2="${mid}" y2="${gridSize}" stroke="#666" stroke-width="2"/>`;
    
    // Draw vectors
    const colors = ['#22D3EE', '#F472B6', '#A855F7', '#22C55E'];
    vectors.forEach((v, i) => {
      const x2 = mid + v.x * scale;
      const y2 = mid - v.y * scale;  // Flip y for SVG coordinates
      svg += `
  
  <!-- Vector ${v.label || i + 1} -->
  <line x1="${mid}" y1="${mid}" x2="${x2}" y2="${y2}" 
        stroke="${colors[i % colors.length]}" stroke-width="3" marker-end="url(#arrowhead)"/>`;
      
      if (labels && v.label) {
        svg += `
  <text x="${x2 + 5}" y="${y2 - 5}" fill="${colors[i % colors.length]}" font-size="14" font-weight="bold">${v.label}</text>`;
      }
    });
    
    svg += '\n</svg>';
    return svg;
  },

  // Matrix visualization
  matrix: (options = {}) => {
    const { values = [[1, 0], [0, 1]], cellSize = 50, showBrackets = true } = options;
    const rows = values.length;
    const cols = values[0].length;
    const width = cols * cellSize + (showBrackets ? 40 : 0);
    const height = rows * cellSize + 20;
    const offsetX = showBrackets ? 20 : 0;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
    
    if (showBrackets) {
      svg += `
  <!-- Brackets -->
  <path d="M 15 5 Q 5 5 5 15 L 5 ${height - 15} Q 5 ${height - 5} 15 ${height - 5}" 
        stroke="#22D3EE" stroke-width="3" fill="none"/>
  <path d="M ${width - 15} 5 Q ${width - 5} 5 ${width - 5} 15 L ${width - 5} ${height - 15} Q ${width - 5} ${height - 5} ${width - 15} ${height - 5}" 
        stroke="#22D3EE" stroke-width="3" fill="none"/>`;
    }
    
    // Draw cells
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const x = offsetX + j * cellSize + cellSize / 2;
        const y = 10 + i * cellSize + cellSize / 2 + 5;
        svg += `
  <text x="${x}" y="${y}" fill="#FFFFFF" font-size="16" text-anchor="middle" font-family="monospace">${values[i][j]}</text>`;
      }
    }
    
    svg += '\n</svg>';
    return svg;
  },

  // Normal distribution curve
  normal_distribution: (options = {}) => {
    const { mu = 0, sigma = 1, width = 300, height = 150, showAreas = false } = options;
    const padding = 20;
    
    // Generate curve points
    const points = [];
    for (let x = -4; x <= 4; x += 0.1) {
      const y = Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
      points.push({ x, y });
    }
    
    const maxY = Math.max(...points.map(p => p.y));
    const scaleX = (width - 2 * padding) / 8;
    const scaleY = (height - 2 * padding) / maxY;
    
    const pathData = points.map((p, i) => {
      const x = padding + (p.x + 4) * scaleX;
      const y = height - padding - p.y * scaleY;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Axis -->
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" 
        stroke="#666" stroke-width="2"/>
  
  <!-- Curve -->
  <path d="${pathData}" fill="none" stroke="#22D3EE" stroke-width="3"/>`;
    
    if (showAreas) {
      // Shaded area for 1 sigma
      const areaPoints = points.filter(p => p.x >= -1 && p.x <= 1);
      const areaPath = areaPoints.map((p, i) => {
        const x = padding + (p.x + 4) * scaleX;
        const y = height - padding - p.y * scaleY;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
      
      svg += `
  <!-- 68% area -->
  <path d="${areaPath} L ${padding + 5 * scaleX} ${height - padding} L ${padding + 3 * scaleX} ${height - padding} Z" 
        fill="#22D3EE" fill-opacity="0.3"/>`;
    }
    
    // Labels
    svg += `
  <text x="${width / 2}" y="${height - 3}" fill="#888" font-size="12" text-anchor="middle">μ</text>
  <text x="${padding + 3 * scaleX}" y="${height - 3}" fill="#888" font-size="10" text-anchor="middle">-σ</text>
  <text x="${padding + 5 * scaleX}" y="${height - 3}" fill="#888" font-size="10" text-anchor="middle">+σ</text>
</svg>`;
    
    return svg;
  },

  // Gradient descent path on contour
  gradient_descent: (options = {}) => {
    const { iterations = 8, width = 250, height = 250 } = options;
    const mid = width / 2;
    
    // Simulate gradient descent path
    let x = width * 0.85, y = height * 0.2;
    const path = [[x, y]];
    for (let i = 0; i < iterations; i++) {
      // Move toward center with some zigzag
      x = x * 0.7 + mid * 0.3 + (Math.random() - 0.5) * 20;
      y = y * 0.7 + mid * 0.3 + (Math.random() - 0.5) * 20;
      path.push([x, y]);
    }
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#F472B6"/>
    </marker>
  </defs>
  
  <!-- Contour ellipses -->
  <ellipse cx="${mid}" cy="${mid}" rx="110" ry="80" fill="none" stroke="#334" stroke-width="1.5"/>
  <ellipse cx="${mid}" cy="${mid}" rx="80" ry="55" fill="none" stroke="#445" stroke-width="1.5"/>
  <ellipse cx="${mid}" cy="${mid}" rx="50" ry="35" fill="none" stroke="#556" stroke-width="1.5"/>
  <ellipse cx="${mid}" cy="${mid}" rx="20" ry="15" fill="none" stroke="#667" stroke-width="1.5"/>
  
  <!-- Minimum point -->
  <circle cx="${mid}" cy="${mid}" r="5" fill="#22C55E"/>
  
  <!-- Descent path -->`;
    
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, y1] = path[i];
      const [x2, y2] = path[i + 1];
      svg += `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#F472B6" stroke-width="2" marker-end="url(#arrow)"/>
  <circle cx="${x1}" cy="${y1}" r="4" fill="#F472B6"/>`;
    }
    
    svg += `
  <circle cx="${path[path.length - 1][0]}" cy="${path[path.length - 1][1]}" r="4" fill="#F472B6"/>
  
  <!-- Labels -->
  <text x="${path[0][0] + 5}" y="${path[0][1] - 8}" fill="#F472B6" font-size="12">start</text>
  <text x="${mid + 10}" y="${mid - 10}" fill="#22C55E" font-size="12">min</text>
</svg>`;
    
    return svg;
  },

  // Eigenvalue/eigenvector visualization
  eigenvector: (options = {}) => {
    const { size = 200 } = options;
    const mid = size / 2;
    const scale = size / 8;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <marker id="arr1" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#22D3EE"/>
    </marker>
    <marker id="arr2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#A855F7"/>
    </marker>
    <marker id="arr3" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#666"/>
    </marker>
  </defs>
  
  <!-- Grid -->
  <g stroke="#333" stroke-width="0.5" opacity="0.2">
    ${Array.from({length: 9}, (_, i) => `
    <line x1="${i * scale}" y1="0" x2="${i * scale}" y2="${size}"/>
    <line x1="0" y1="${i * scale}" x2="${size}" y2="${i * scale}"/>`).join('')}
  </g>
  
  <!-- Axes -->
  <line x1="0" y1="${mid}" x2="${size}" y2="${mid}" stroke="#555" stroke-width="1.5"/>
  <line x1="${mid}" y1="0" x2="${mid}" y2="${size}" stroke="#555" stroke-width="1.5"/>
  
  <!-- Regular vector (gets rotated) -->
  <line x1="${mid}" y1="${mid}" x2="${mid + 2 * scale}" y2="${mid - 1 * scale}" 
        stroke="#666" stroke-width="2" marker-end="url(#arr3)" stroke-dasharray="5,3"/>
  <text x="${mid + 2.2 * scale}" y="${mid - 1.2 * scale}" fill="#666" font-size="11">Av (rotated)</text>
  
  <!-- Eigenvector 1 and its transformation -->
  <line x1="${mid}" y1="${mid}" x2="${mid + 2 * scale}" y2="${mid - 2 * scale}" 
        stroke="#22D3EE" stroke-width="2.5" marker-end="url(#arr1)" opacity="0.5"/>
  <line x1="${mid}" y1="${mid}" x2="${mid + 3 * scale}" y2="${mid - 3 * scale}" 
        stroke="#22D3EE" stroke-width="2.5" marker-end="url(#arr1)"/>
  <text x="${mid + 3.2 * scale}" y="${mid - 3 * scale}" fill="#22D3EE" font-size="12" font-weight="bold">λv₁</text>
  
  <!-- Eigenvector 2 and its transformation -->
  <line x1="${mid}" y1="${mid}" x2="${mid - 1.5 * scale}" y2="${mid - 1 * scale}" 
        stroke="#A855F7" stroke-width="2.5" marker-end="url(#arr2)" opacity="0.5"/>
  <line x1="${mid}" y1="${mid}" x2="${mid - 2.25 * scale}" y2="${mid - 1.5 * scale}" 
        stroke="#A855F7" stroke-width="2.5" marker-end="url(#arr2)"/>
  <text x="${mid - 2.5 * scale}" y="${mid - 1.8 * scale}" fill="#A855F7" font-size="12" font-weight="bold">λv₂</text>
  
  <!-- Legend -->
  <text x="10" y="${size - 10}" fill="#888" font-size="10">Eigenvectors only scale, don't rotate</text>
</svg>`;
  },

  // Bias-variance tradeoff visualization
  bias_variance: (options = {}) => {
    const size = 120;
    const gap = 20;
    const totalWidth = size * 2 + gap * 3;
    const totalHeight = size * 2 + gap * 3;
    
    const makeTarget = (cx, cy, hits, spread, biasX = 0, biasY = 0) => {
      let svg = `
    <circle cx="${cx}" cy="${cy}" r="50" fill="none" stroke="#444" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="35" fill="none" stroke="#444" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="20" fill="none" stroke="#444" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="5" fill="#22C55E"/>`;
      
      // Generate random points
      for (let i = 0; i < hits; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * spread;
        const hx = cx + biasX + Math.cos(angle) * r;
        const hy = cy + biasY + Math.sin(angle) * r;
        svg += `\n    <circle cx="${hx}" cy="${hy}" r="4" fill="#F472B6"/>`;
      }
      return svg;
    };
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth}" ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
  <!-- Low Bias, Low Variance -->
  <g>
    ${makeTarget(gap + size/2, gap + size/2, 8, 12)}
    <text x="${gap + size/2}" y="${gap + size + 15}" fill="#22C55E" font-size="10" text-anchor="middle">Low Bias</text>
    <text x="${gap + size/2}" y="${gap + size + 27}" fill="#22C55E" font-size="10" text-anchor="middle">Low Variance ✓</text>
  </g>
  
  <!-- Low Bias, High Variance -->
  <g>
    ${makeTarget(gap * 2 + size * 1.5, gap + size/2, 8, 40)}
    <text x="${gap * 2 + size * 1.5}" y="${gap + size + 15}" fill="#F59E0B" font-size="10" text-anchor="middle">Low Bias</text>
    <text x="${gap * 2 + size * 1.5}" y="${gap + size + 27}" fill="#F59E0B" font-size="10" text-anchor="middle">High Variance</text>
  </g>
  
  <!-- High Bias, Low Variance -->
  <g>
    ${makeTarget(gap + size/2, gap * 2 + size * 1.5, 8, 12, 25, 20)}
    <text x="${gap + size/2}" y="${gap * 2 + size * 2 + 15}" fill="#F59E0B" font-size="10" text-anchor="middle">High Bias</text>
    <text x="${gap + size/2}" y="${gap * 2 + size * 2 + 27}" fill="#F59E0B" font-size="10" text-anchor="middle">Low Variance</text>
  </g>
  
  <!-- High Bias, High Variance -->
  <g>
    ${makeTarget(gap * 2 + size * 1.5, gap * 2 + size * 1.5, 8, 35, 20, 25)}
    <text x="${gap * 2 + size * 1.5}" y="${gap * 2 + size * 2 + 15}" fill="#EF4444" font-size="10" text-anchor="middle">High Bias</text>
    <text x="${gap * 2 + size * 1.5}" y="${gap * 2 + size * 2 + 27}" fill="#EF4444" font-size="10" text-anchor="middle">High Variance ✗</text>
  </g>
</svg>`;
  }
};

/**
 * Generate SVG based on visual description
 */
function generateSvgFromDescription(description, topic) {
  const desc = description.toLowerCase();
  
  // Match description to template
  if (desc.includes('eigenvector') || desc.includes('eigenvalue')) {
    return SVG_TEMPLATES.eigenvector();
  }
  if (desc.includes('gradient descent') || desc.includes('optimization') || desc.includes('contour')) {
    return SVG_TEMPLATES.gradient_descent();
  }
  if (desc.includes('normal') || desc.includes('gaussian') || desc.includes('bell curve')) {
    return SVG_TEMPLATES.normal_distribution({ showAreas: desc.includes('68') || desc.includes('area') });
  }
  if (desc.includes('bias') && desc.includes('variance')) {
    return SVG_TEMPLATES.bias_variance();
  }
  if (desc.includes('vector') && (desc.includes('2d') || desc.includes('plot') || desc.includes('arrow'))) {
    return SVG_TEMPLATES.vector_2d({
      vectors: [
        { x: 3, y: 2, label: 'v₁' },
        { x: -1, y: 2, label: 'v₂' }
      ]
    });
  }
  if (desc.includes('matrix')) {
    return SVG_TEMPLATES.matrix({
      values: [[2, 1], [1, 3]]
    });
  }
  
  // Default: return null if no match
  return null;
}

/**
 * Process a card and generate SVG if applicable
 */
function processCard(card) {
  if (card.visualDescription && !card.visualSvg) {
    const svg = generateSvgFromDescription(card.visualDescription, card.topic);
    if (svg) {
      return { ...card, visualSvg: svg };
    }
  }
  return card;
}

/**
 * Process all cards in a file
 */
function processFile(inputPath, outputPath) {
  const cards = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const processedCards = cards.map(processCard);
  
  const withSvg = processedCards.filter(c => c.visualSvg);
  console.log(`  Generated ${withSvg.length}/${cards.length} SVG diagrams`);
  
  fs.writeFileSync(outputPath, JSON.stringify(processedCards, null, 2));
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--demo') {
    // Generate demo SVGs
    const demoDir = path.join(__dirname, 'demo-diagrams');
    fs.mkdirSync(demoDir, { recursive: true });
    
    console.log('🎨 Generating demo SVG diagrams...\n');
    
    const demos = [
      ['vector_2d', SVG_TEMPLATES.vector_2d({ vectors: [{ x: 3, y: 2, label: 'v₁' }, { x: -1, y: 2, label: 'v₂' }] })],
      ['matrix', SVG_TEMPLATES.matrix({ values: [[4, 1], [2, 3]] })],
      ['normal_distribution', SVG_TEMPLATES.normal_distribution({ showAreas: true })],
      ['gradient_descent', SVG_TEMPLATES.gradient_descent()],
      ['eigenvector', SVG_TEMPLATES.eigenvector()],
      ['bias_variance', SVG_TEMPLATES.bias_variance()],
    ];
    
    for (const [name, svg] of demos) {
      const filePath = path.join(demoDir, `${name}.svg`);
      fs.writeFileSync(filePath, svg);
      console.log(`  ✅ ${name}.svg`);
    }
    
    console.log(`\n📁 Saved to: ${demoDir}`);
  } else if (args[0] === '--process' && args[1]) {
    const inputPath = args[1];
    const outputPath = args[2] || inputPath.replace('.json', '-with-svg.json');
    processFile(inputPath, outputPath);
    console.log(`✅ Processed: ${outputPath}`);
  } else {
    console.log(`
SVG Diagram Generator

Usage:
  node generate-diagrams.js --demo              Generate demo SVGs
  node generate-diagrams.js --process <file>    Add SVGs to cards JSON

Examples:
  node generate-diagrams.js --demo
  node generate-diagrams.js --process samples/linear-algebra-samples.json
    `);
  }
}

module.exports = { SVG_TEMPLATES, generateSvgFromDescription, processCard };

