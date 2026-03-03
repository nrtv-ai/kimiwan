#!/bin/bash
# Hate Beat - Quick Deployment Script
# Usage: ./deploy.sh [android|ios|both]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check for device
 check_device() {
    if ! adb devices | grep -q "device$"; then
        print_error "No Android device connected"
        print_status "Connect a device or start an emulator"
        return 1
    fi
    return 0
}

# Deploy Android debug APK
deploy_android_debug() {
    print_status "Deploying Android Debug APK..."
    
    if ! check_device; then
        return 1
    fi
    
    local apk_path="android/app/build/outputs/apk/debug/app-debug.apk"
    
    if [ ! -f "$apk_path" ]; then
        print_error "Debug APK not found at $apk_path"
        print_status "Run: npm run android:build"
        return 1
    fi
    
    print_status "Installing APK..."
    adb install -r "$apk_path"
    
    print_success "Debug APK installed successfully!"
    print_status "Launching Hate Beat..."
    adb shell am start -n com.hatebeat.app/.MainActivity
}

# Deploy Android release AAB
deploy_android_release() {
    print_status "Android Release AAB Info..."
    
    local aab_path="android/app/build/outputs/bundle/release/app-release.aab"
    
    if [ ! -f "$aab_path" ]; then
        print_error "Release AAB not found at $aab_path"
        return 1
    fi
    
    local size=$(ls -lh "$aab_path" | awk '{print $5}')
    print_success "Release AAB ready for Play Store!"
    print_status "Location: $aab_path"
    print_status "Size: $size"
    print_status ""
    print_status "To upload to Play Store:"
    print_status "1. Go to https://play.google.com/console"
    print_status "2. Create new app or select existing"
    print_status "3. Go to Production → Create new release"
    print_status "4. Upload the AAB file"
}

# Open iOS project
open_ios() {
    print_status "Opening iOS project in Xcode..."
    
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "iOS builds require macOS"
        return 1
    fi
    
    npx cap open ios
}

# Sync web assets
sync_assets() {
    print_status "Syncing web assets to native projects..."
    npx cap sync
    print_success "Assets synced!"
}

# Show help
show_help() {
    echo "Hate Beat - Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  android-debug    Install debug APK on connected device"
    echo "  android-release  Show release AAB info for Play Store"
    echo "  ios              Open iOS project in Xcode (macOS only)"
    echo "  sync             Sync web assets to native projects"
    echo "  info             Show build artifacts info"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh android-debug    # Quick test on device"
    echo "  ./deploy.sh android-release  # Prepare for Play Store"
    echo "  ./deploy.sh ios              # Build for iOS"
}

# Show build info
show_info() {
    echo "Hate Beat - Build Artifacts"
    echo "============================"
    echo ""
    
    # Debug APK
    local debug_apk="android/app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$debug_apk" ]; then
        local debug_size=$(ls -lh "$debug_apk" | awk '{print $5}')
        print_success "Debug APK: $debug_size"
        print_status "  Location: $debug_apk"
        print_status "  Use for: Testing on device"
    else
        print_warning "Debug APK not found"
    fi
    echo ""
    
    # Release AAB
    local release_aab="android/app/build/outputs/bundle/release/app-release.aab"
    if [ -f "$release_aab" ]; then
        local release_size=$(ls -lh "$release_aab" | awk '{print $5}')
        print_success "Release AAB: $release_size"
        print_status "  Location: $release_aab"
        print_status "  Use for: Play Store submission"
    else
        print_warning "Release AAB not found"
    fi
    echo ""
    
    # iOS
    local ios_project="ios/App/App.xcodeproj"
    if [ -d "$ios_project" ]; then
        print_success "iOS Project: Ready"
        print_status "  Location: $ios_project"
        print_status "  Use for: App Store submission (requires macOS + Xcode)"
    else
        print_warning "iOS project not found"
    fi
}

# Main
case "${1:-info}" in
    android-debug)
        deploy_android_debug
        ;;
    android-release)
        deploy_android_release
        ;;
    ios)
        open_ios
        ;;
    sync)
        sync_assets
        ;;
    info)
        show_info
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
