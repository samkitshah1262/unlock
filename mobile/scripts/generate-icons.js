#!/usr/bin/env node
/**
 * Icon Generator for Unlock App
 * Creates app icons with white "U" on black background
 * 
 * Usage: node scripts/generate-icons.js
 * Requires: npm install canvas
 */

const fs = require('fs');
const path = require('path');

// Try to use canvas if available, otherwise create SVG
async function generateIcons() {
  try {
    const { createCanvas } = require('canvas');
    
    const sizes = [
      { name: 'icon.png', size: 1024 },
      { name: 'adaptive-icon.png', size: 1024 },
      { name: 'favicon.png', size: 48 },
      { name: 'splash-icon.png', size: 288 },
    ];
    
    const assetsDir = path.join(__dirname, '..', 'assets');
    
    for (const { name, size } of sizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Black background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, size, size);
      
      // White "U" letter
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${size * 0.6}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('U', size / 2, size / 2 + size * 0.05);
      
      // Save to file
      const buffer = canvas.toBuffer('image/png');
      const filePath = path.join(assetsDir, name);
      fs.writeFileSync(filePath, buffer);
      console.log(`✓ Generated ${name} (${size}x${size})`);
    }
    
    console.log('\n✅ All icons generated successfully!');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Canvas module not found. Creating SVG instead...\n');
      createSVGIcon();
    } else {
      throw error;
    }
  }
}

function createSVGIcon() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#0a0a0a"/>
  <text x="512" y="560" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="614" 
        font-weight="bold" 
        fill="#FFFFFF" 
        text-anchor="middle">U</text>
</svg>`;

  const assetsDir = path.join(__dirname, '..', 'assets');
  const svgPath = path.join(assetsDir, 'icon.svg');
  fs.writeFileSync(svgPath, svg);
  
  console.log('✓ Created icon.svg');
  console.log('\nTo generate PNG icons:');
  console.log('1. Install canvas: npm install canvas');
  console.log('2. Run this script again');
  console.log('\nOR use an online converter:');
  console.log('- Upload icon.svg to https://cloudconvert.com/svg-to-png');
  console.log('- Export at 1024x1024, 288x288, and 48x48');
}

generateIcons();

