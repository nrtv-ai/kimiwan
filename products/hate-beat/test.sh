#!/bin/bash
# Hate Beat Mobile Testing Script
# Installs and tests the APK on connected devices

set -e

echo "🧪 Hate Beat Mobile Testing Script"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check for ADB
if ! command -v adb &> /dev/null; then
    print_error "ADB not found. Please install Android SDK platform tools."
    exit 1
fi

# Check for connected devices
echo ""
echo "📱 Checking for connected devices..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    print_error "No Android devices connected!"
    echo ""
    echo "Please connect a device with:"
    echo "  1. USB debugging enabled (Settings > Developer options)"
    echo "  2. Authorized for debugging (check for popup on device)"
    echo ""
    echo "Or start an emulator:"
    echo "  emulator -avd <avd_name>"
    exit 1
fi

print_status "Found $DEVICES device(s)"

# Show device info
echo ""
echo "Device Info:"
adb devices -l | grep -v "List" | while read line; do
    if [ -n "$line" ]; then
        DEVICE=$(echo $line | awk '{print $1}')
        MODEL=$(adb -s $DEVICE shell getprop ro.product.model 2>/dev/null | tr -d '\r')
        ANDROID_VER=$(adb -s $DEVICE shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
        echo "  📱 $MODEL (Android $ANDROID_VER)"
    fi
done

# Determine which APK to install
APK_PATH=""
if [ "$1" == "--release" ] && [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    print_info "Using Release APK"
elif [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
    print_info "Using Debug APK"
else
    print_error "No APK found! Run ./build.sh first."
    exit 1
fi

# Uninstall existing version
echo ""
echo "🗑️  Uninstalling existing version..."
adb uninstall com.hatebeat.app 2>/dev/null || true
print_status "Uninstalled existing version"

# Install APK
echo ""
echo "📥 Installing APK..."
adb install "$APK_PATH"
print_status "APK installed successfully"

# Launch app
echo ""
echo "🚀 Launching Hate Beat..."
adb shell am start -n com.hatebeat.app/com.hatebeat.app.MainActivity
print_status "App launched"

# Show testing checklist
echo ""
echo "==================================="
echo "✅ App installed and launched!"
echo "==================================="
echo ""
echo "📋 Manual Testing Checklist:"
echo ""
echo "  Input Flow:"
echo "    [ ] Enter task you hate"
echo "    [ ] Select hate level (1-10)"
echo "    [ ] Enter hate words"
echo "    [ ] Continue buttons work"
echo ""
echo "  Gameplay:"
echo "    [ ] Enemies spawn correctly"
echo "    [ ] Tap to destroy enemies"
echo "    [ ] Rhythm timing (Perfect/Good/Miss)"
echo "    [ ] Score updates in real-time"
echo "    [ ] Combo system works"
echo "    [ ] Victory screen shows stats"
echo ""
echo "  Mobile Features:"
echo "    [ ] Sound effects play"
echo "    [ ] Haptic feedback on hits"
echo "    [ ] Back button pauses game"
echo "    [ ] App pauses when backgrounded"
echo "    [ ] High scores persist"
echo ""
echo "  Performance:"
echo "    [ ] Smooth 60fps gameplay"
echo "    [ ] No lag during intense moments"
echo "    [ ] Quick app launch"
echo ""
echo "To view logs: adb logcat -s "HateBeat:*""
echo ""
