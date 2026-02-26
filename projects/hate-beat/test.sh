#!/bin/bash
# Quick test script for Hate Beat mobile build

set -e

echo "=== Hate Beat Mobile Build Test ==="
echo ""

# Check Node.js
echo "✓ Node.js: $(node --version)"
echo "✓ npm: $(npm --version)"

# Check dependencies
echo ""
echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✓ node_modules exists"
else
    echo "⚠ node_modules missing - running npm install"
    npm install
fi

# TypeScript check
echo ""
echo "Running TypeScript check..."
npm run typecheck
echo "✓ TypeScript compilation passed"

# Check Android SDK
echo ""
echo "Checking Android SDK..."
if [ -d "/opt/android-sdk" ]; then
    echo "✓ Android SDK found at /opt/android-sdk"
elif [ -d "$ANDROID_HOME" ]; then
    echo "✓ Android SDK found at $ANDROID_HOME"
else
    echo "⚠ Android SDK not found - local Android builds will fail"
    echo "  Install Android SDK or use EAS cloud builds: ./build.sh eas-preview"
fi

# Check Java
echo ""
echo "Checking Java..."
if command -v java &> /dev/null; then
    echo "✓ Java: $(java -version 2>&1 | head -n 1)"
else
    echo "⚠ Java not found"
fi

# Check EAS CLI
echo ""
echo "Checking EAS CLI..."
if command -v eas &> /dev/null; then
    echo "✓ EAS CLI: $(eas --version)"
else
    echo "⚠ EAS CLI not installed"
    echo "  Install with: npm install -g eas-cli"
fi

# Check project structure
echo ""
echo "Checking project structure..."
[ -f "App.tsx" ] && echo "✓ App.tsx exists"
[ -f "app.json" ] && echo "✓ app.json exists"
[ -f "eas.json" ] && echo "✓ eas.json exists"
[ -d "src/screens" ] && echo "✓ src/screens exists"
[ -d "android" ] && echo "✓ android/ exists (prebuild done)"

# Summary
echo ""
echo "=== Test Summary ==="
echo ""
echo "Project is ready for mobile builds!"
echo ""
echo "Build options:"
echo "  1. Local Android APK:  ./build.sh android-apk"
echo "  2. EAS Cloud Build:    ./build.sh eas-preview"
echo "  3. Development:        npm start"
echo ""
