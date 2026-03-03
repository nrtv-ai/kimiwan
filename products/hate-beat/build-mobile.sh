#!/bin/bash

# Hate Beat Mobile Build Script
# Usage: ./build-mobile.sh [android|ios|all] [debug|release]

set -e

PLATFORM=${1:-android}
BUILD_TYPE=${2:-debug}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================"
echo "Hate Beat Mobile Build"
echo "======================================"
echo "Platform: $PLATFORM"
echo "Build Type: $BUILD_TYPE"
echo "Project: $PROJECT_DIR"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_warn "Node.js version is $NODE_VERSION. Recommended: 18+"
    fi
    
    log_info "Node.js version: $(node -v)"
    
    if [ "$PLATFORM" == "android" ] || [ "$PLATFORM" == "all" ]; then
        if [ -z "$ANDROID_HOME" ]; then
            log_warn "ANDROID_HOME not set. Android builds may fail."
        else
            log_info "Android SDK: $ANDROID_HOME"
        fi
        
        if ! command -v java &> /dev/null; then
            log_warn "Java not found in PATH"
        else
            log_info "Java version: $(java -version 2>&1 | head -n 1)"
        fi
    fi
    
    if [ "$PLATFORM" == "ios" ] || [ "$PLATFORM" == "all" ]; then
        if ! command -v xcodebuild &> /dev/null; then
            log_warn "Xcode not found. iOS builds require macOS + Xcode."
        else
            log_info "Xcode version: $(xcodebuild -version | head -n 1)"
        fi
    fi
}

# Install dependencies
install_deps() {
    log_info "Installing Node.js dependencies..."
    cd "$PROJECT_DIR"
    
    if [ ! -d "node_modules" ]; then
        npm install
    else
        log_info "Dependencies already installed"
    fi
}

# Sync Capacitor
sync_capacitor() {
    local platform=$1
    log_info "Syncing Capacitor for $platform..."
    cd "$PROJECT_DIR"
    npx cap sync "$platform"
}

# Build Android
build_android() {
    log_info "Building Android ($BUILD_TYPE)..."
    cd "$PROJECT_DIR/android"
    
    # Make gradlew executable
    chmod +x ./gradlew
    
    if [ "$BUILD_TYPE" == "release" ]; then
        ./gradlew assembleRelease --console=plain
        APK_PATH="$PROJECT_DIR/android/app/build/outputs/apk/release/app-release-unsigned.apk"
    else
        ./gradlew assembleDebug --console=plain
        APK_PATH="$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
    fi
    
    if [ -f "$APK_PATH" ]; then
        log_info "Build successful!"
        log_info "APK location: $APK_PATH"
        ls -lh "$APK_PATH"
    else
        log_error "Build failed - APK not found"
        exit 1
    fi
}

# Build iOS
build_ios() {
    log_info "Building iOS ($BUILD_TYPE)..."
    cd "$PROJECT_DIR/ios/App"
    
    if [ "$BUILD_TYPE" == "release" ]; then
        xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -derivedDataPath build
    else
        xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug -derivedDataPath build
    fi
    
    log_info "iOS build completed"
}

# Main build process
main() {
    check_prerequisites
    install_deps
    
    case "$PLATFORM" in
        android)
            sync_capacitor android
            build_android
            ;;
        ios)
            sync_capacitor ios
            build_ios
            ;;
        all)
            sync_capacitor android
            build_android
            if command -v xcodebuild &> /dev/null; then
                sync_capacitor ios
                build_ios
            else
                log_warn "Skipping iOS build - Xcode not available"
            fi
            ;;
        *)
            log_error "Unknown platform: $PLATFORM"
            echo "Usage: $0 [android|ios|all] [debug|release]"
            exit 1
            ;;
    esac
    
    log_info "Build process completed!"
}

main
