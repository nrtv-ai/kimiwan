#!/bin/bash
# Setup script for generating app icons
# This script creates the icon structure for Android and iOS

echo "📦 Setting up app icons for Hate Beat..."

# Android icon directories
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi
mkdir -p android/app/src/main/res/drawable

# Copy SVG as placeholder (Android Studio can convert these)
cp resources/icon.svg android/app/src/main/res/mipmap-mdpi/ic_launcher.svg 2>/dev/null || echo "Note: Using default icons until PNGs generated"
cp resources/splash.svg android/app/src/main/res/drawable/splash.svg 2>/dev/null

echo "✅ Icon directories created"
echo ""
echo "To generate proper PNG icons:"
echo "1. Use Android Studio's Image Asset Studio"
echo "2. Or use an online converter like: https://appicon.co/"
echo "3. Or install ImageMagick and run:"
echo "   convert resources/icon.svg -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
echo ""
echo "📱 Current status:"
echo "   - Source SVG: resources/icon.svg ✅"
echo "   - Source Splash: resources/splash.svg ✅"
echo "   - Android icons: Need PNG conversion ⏳"
echo "   - iOS icons: Need PNG conversion ⏳"
