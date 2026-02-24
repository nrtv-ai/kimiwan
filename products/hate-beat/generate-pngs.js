// Generate PNG icons using sharp (Node.js image processing)
const fs = require('fs');
const path = require('path');

console.log('📦 Generating PNG icons from SVG...');
console.log('');
console.log('This requires the "sharp" npm package.');
console.log('Install with: npm install sharp');
console.log('');
console.log('Or use one of these alternatives:');
console.log('');
console.log('1. ONLINE (Easiest):');
console.log('   - Go to https://appicon.co/');
console.log('   - Upload resources/icon.svg');
console.log('   - Download iOS & Android icon sets');
console.log('   - Extract to android/app/src/main/res/ and ios/App/App/Assets.xcassets/');
console.log('');
console.log('2. ANDROID STUDIO:');
console.log('   - Open android/ folder in Android Studio');
console.log('   - Right-click app folder → New → Image Asset');
console.log('   - Select icon.svg as source');
console.log('   - Generate all sizes automatically');
console.log('');
console.log('3. XCODE (macOS):');
console.log('   - Open ios/App/App.xcworkspace in Xcode');
console.log('   - Select Assets.xcassets');
console.log('   - Drag icon.svg to AppIcon set');
console.log('   - Xcode generates all sizes');
console.log('');

// Create a summary file
const summary = `# Icon Generation Guide

## Source Files
- Icon: resources/icon.svg (1024x1024)
- Splash: resources/splash.svg (2732x2732)

## Required Sizes

### Android (in android/app/src/main/res/)
\`\`\`
mipmap-mdpi:     48x48
mipmap-hdpi:     72x72
mipmap-xhdpi:    96x96
mipmap-xxhdpi:   144x144
mipmap-xxxhdpi:  192x192
\`\`\`

### iOS (in ios/App/App/Assets.xcassets/AppIcon.appiconset/)
\`\`\`
20x20@2x    = 40x40
20x20@3x    = 60x60
29x29@2x    = 58x58
29x29@3x    = 87x87
40x40@2x    = 80x80
40x40@3x    = 120x120
60x60@2x    = 120x120
60x60@3x    = 180x180
1024x1024   = App Store
\`\`\`

## Quick Commands (with ImageMagick)
\`\`\`bash
# Android icons
convert resources/icon.svg -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert resources/icon.svg -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert resources/icon.svg -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert resources/icon.svg -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert resources/icon.svg -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Foreground icons (same sizes, in mipmap-*dpi-v26/)
# ...same commands with ic_launcher_foreground.png
\`\`\`
`;

fs.writeFileSync('resources/ICON_GUIDE.md', summary);
console.log('✅ Created resources/ICON_GUIDE.md');
