const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
    <linearGradient id="heart" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560"/>
      <stop offset="100%" style="stop-color:#ff6b6b"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="15" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)" rx="180" ry="180"/>
  
  <!-- Broken heart / heart with lightning -->
  <g transform="translate(512, 512)" filter="url(#glow)">
    <!-- Main heart shape -->
    <path d="M0,-180 C-100,-280 -280,-180 -280,20 C-280,150 0,320 0,320 C0,320 280,150 280,20 C280,-180 100,-280 0,-180 Z" 
          fill="url(#heart)"/>
    
    <!-- Lightning bolt crack -->
    <path d="M-20,-100 L20,-40 L-10,-40 L30,40 L-10,40 L40,140 L0,80 L30,80 L-20,0 L10,0 Z" 
          fill="#1a1a2e"/>
    
    <!-- Musical note -->
    <g transform="translate(80, -80)" fill="#fff">
      <ellipse cx="0" cy="40" rx="25" ry="20"/>
      <rect x="20" y="-60" width="12" height="100" rx="2"/>
      <path d="M20,-60 Q60,-80 80,-40 L72,-35 Q55,-65 32,-50 Z"/>
    </g>
  </g>
  
  <!-- Beat rings -->
  <circle cx="512" cy="512" r="380" fill="none" stroke="#e94560" stroke-width="8" opacity="0.3"/>
  <circle cx="512" cy="512" r="420" fill="none" stroke="#e94560" stroke-width="4" opacity="0.15"/>
</svg>`;

// Save the SVG
fs.writeFileSync('resources/icon.svg', svgIcon);
console.log('✅ Created resources/icon.svg');

// Create a simple PNG using canvas (Node.js built-in approach)
// For now, we'll create placeholder instructions
const readme = `# App Icons

## Source Icon
- **File:** icon.svg (1024x1024)
- **Format:** SVG with gradients and glow effects

## Required Sizes

### Android
- mipmap-xxxhdpi: 192x192
- mipmap-xxhdpi: 144x144
- mipmap-xhdpi: 96x96
- mipmap-hdpi: 72x72
- mipmap-mdpi: 48x48

### iOS
- App Store: 1024x1024
- iPhone: 180x180, 120x120, 87x87, 80x80, 60x60, 58x58, 40x40
- iPad: 167x167, 152x152, 76x76, 40x40, 29x29, 20x20

## Generation

Use one of these tools:
1. **Capacitor Assets:** \`npx capacitor-assets generate\`
2. **Online:** https://appicon.co/
3. **Figma/Sketch:** Export from source

## Current Status
- SVG source created ✅
- PNG exports needed ⏳
`;

fs.writeFileSync('resources/README.md', readme);
console.log('✅ Created resources/README.md');

console.log('\n📦 Icon generation complete!');
console.log('To generate all platform icons, use:');
console.log('  npx capacitor-assets generate --icon resources/icon.svg');
