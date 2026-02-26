#!/bin/bash
# Hate Beat Mobile Build Script
# Builds Android APKs and AAB for distribution

set -e

echo "🎮 Hate Beat Mobile Build Script"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "capacitor.config.json" ]; then
    echo -e "${RED}Error: capacitor.config.json not found${NC}"
    echo "Please run this script from the hate-beat directory"
    exit 1
fi

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Sync web assets to native projects
echo ""
echo "📦 Step 1: Syncing web assets to native projects..."
npx cap sync
print_status "Web assets synced"

# Build Android Debug APK
echo ""
echo "🔨 Step 2: Building Android Debug APK..."
cd android
./gradlew assembleDebug --quiet

if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    DEBUG_SIZE=$(du -h app/build/outputs/apk/debug/app-debug.apk | cut -f1)
    print_status "Debug APK built: $DEBUG_SIZE"
else
    print_error "Debug APK build failed"
    exit 1
fi

# Build Android Release APK
echo ""
echo "🔨 Step 3: Building Android Release APK..."
./gradlew assembleRelease --quiet

if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    RELEASE_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
    print_status "Release APK built: $RELEASE_SIZE"
else
    print_error "Release APK build failed"
    exit 1
fi

# Build Android Release AAB (Play Store)
echo ""
echo "🔨 Step 4: Building Android Release AAB (Play Store)..."
./gradlew bundleRelease --quiet

if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
    AAB_SIZE=$(du -h app/build/outputs/bundle/release/app-release.aab | cut -f1)
    print_status "Release AAB built: $AAB_SIZE"
else
    print_error "Release AAB build failed"
    exit 1
fi

cd ..

# Summary
echo ""
echo "================================"
echo "✅ Build Complete!"
echo "================================"
echo ""
echo "Output files:"
echo "  📱 Debug APK:   android/app/build/outputs/apk/debug/app-debug.apk ($DEBUG_SIZE)"
echo "  📱 Release APK: android/app/build/outputs/apk/release/app-release.apk ($RELEASE_SIZE)"
echo "  📦 Release AAB: android/app/build/outputs/bundle/release/app-release.aab ($AAB_SIZE)"
echo ""
echo "Next steps:"
echo "  1. Test debug APK on device: adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo "  2. Sign release APK for distribution"
echo "  3. Upload AAB to Google Play Console"
echo ""

# Optional: Copy to dist folder
if [ "$1" == "--dist" ]; then
    echo "📂 Creating dist folder..."
    mkdir -p dist
    cp android/app/build/outputs/apk/debug/app-debug.apk dist/hate-beat-debug.apk
    cp android/app/build/outputs/apk/release/app-release.apk dist/hate-beat-release.apk
    cp android/app/build/outputs/bundle/release/app-release.aab dist/hate-beat-release.aab
    print_status "Files copied to dist/"
fi

exit 0
