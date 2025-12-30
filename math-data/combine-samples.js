#!/usr/bin/env node
/**
 * Combine all sample cards into a single file for easy testing
 */

const fs = require('fs');
const path = require('path');

const samplesDir = path.join(__dirname, 'samples');
const outputFile = path.join(__dirname, 'all-samples.json');

const subjects = ['linear-algebra', 'probability', 'statistics', 'calculus'];
const allCards = [];

console.log('📚 Combining sample cards...\n');

for (const subject of subjects) {
  const filePath = path.join(samplesDir, `${subject}-samples.json`);
  
  if (fs.existsSync(filePath)) {
    const cards = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`  ${subject}: ${cards.length} cards`);
    allCards.push(...cards);
  } else {
    console.log(`  ${subject}: (not found)`);
  }
}

console.log(`\n📊 Total: ${allCards.length} sample cards`);

// Organize by subject and type
const summary = {
  totalCards: allCards.length,
  bySubject: {},
  byType: {},
  byDifficulty: {},
  lastUpdated: new Date().toISOString(),
  cards: allCards
};

for (const card of allCards) {
  summary.bySubject[card.subject] = (summary.bySubject[card.subject] || 0) + 1;
  summary.byType[card.type] = (summary.byType[card.type] || 0) + 1;
  summary.byDifficulty[card.difficulty] = (summary.byDifficulty[card.difficulty] || 0) + 1;
}

fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
console.log(`\n✅ Saved to: ${outputFile}`);

console.log('\n📈 Summary:');
console.log('  By Subject:', JSON.stringify(summary.bySubject));
console.log('  By Type:', JSON.stringify(summary.byType));
console.log('  By Difficulty:', JSON.stringify(summary.byDifficulty));

