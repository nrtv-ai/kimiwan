const fs = require('fs');

// Create a simple SVG splash screen
const svgSplash = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
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
      <feGaussianBlur stdDeviation="30" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="2732" height="2732" fill="url(#bg)"/>
  
  <!-- Beat rings -->
  <circle cx="1366" cy="1366" r="1000" fill="none" stroke="#e94560" stroke-width="12" opacity="0.2"/>
  <circle cx="1366" cy="1366" r="1100" fill="none" stroke="#e94560" stroke-width="8" opacity="0.1"/>
  <circle cx="1366" cy="1366" r="1200" fill="none" stroke="#e94560" stroke-width="4" opacity="0.05"/>
  
  <!-- Main heart -->
  <g transform="translate(1366, 1266)" filter="url(#glow)">
    <path d="M0,-250 C-140,-390 -390,-250 -390,30 C-390,210 0,450 0,450 C0,450 390,210 390,30 C390,-250 140,-390 0,-250 Z" 
          fill="url(#heart)"/>
    
    <!-- Lightning bolt crack -->
    <path d="M-30,-140 L30,-60 L-15,-60 L40,60 L-15,60 L55,200 L0,110 L40,110 L-25,0 L15,0 Z" 
          fill="#1a1a2e"/>
    
    <!-- Musical note -->
    <g transform="translate(110, -110)" fill="#fff">
      <ellipse cx="0" cy="55" rx="35" ry="28"/>
      <rect x="28" y="-85" width="16" height="140" rx="3"/>
      <path d="M28,-85 Q85,-110 110,-55 L100,-48 Q75,-90 45,-70 Z"/>
    </g>
  </g>
  
  <!-- App name -->
  <text x="1366" y="1750" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="120" font-weight="bold" fill="#fff" filter="url(#glow)">HATE BEAT</text>
  
  <!-- Tagline -->
  <text x="1366" y="1850" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="48" fill="#888">Turn your hate into rhythm</text>
</svg>`;

fs.writeFileSync('resources/splash.svg', svgSplash);
console.log('✅ Created resources/splash.svg (2732x2732)');
