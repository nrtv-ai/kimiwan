#!/bin/bash
# Hate Beat Mobile Build Script
# Supports: Android (APK/AAB), iOS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Enable colors
export TERM=xterm-color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
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
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm: $(npm --version)"
    
    # Check dependencies
    if [ ! -d "node_modules" ]; then
        log_warn "node_modules not found. Running npm install..."
        npm install
    fi
    
    log_success "Prerequisites check passed"
}

# TypeScript check
run_typecheck() {
    log_info "Running TypeScript type check..."
    npm run typecheck
    log_success "TypeScript check passed"
}

# Build Android APK
build_android_apk() {
    log_info "Building Android APK..."
    
    # Check Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        if [ -d "/opt/android-sdk" ]; then
            export ANDROID_HOME=/opt/android-sdk
        elif [ -d "$HOME/Android/Sdk" ]; then
            export ANDROID_HOME=$HOME/Android/Sdk
        else
            log_error "ANDROID_HOME not set and Android SDK not found"
            exit 1
        fi
        log_info "Set ANDROID_HOME to $ANDROID_HOME"
    fi
    
    export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
    
    # Prebuild
    log_info "Generating native Android project..."
    npx expo prebuild --platform android --clean
    
    # Build APK
    log_info "Building release APK (this may take a while)..."
    cd android
    ./gradlew assembleRelease
    cd ..
    
    # Check output
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        log_success "Android APK built successfully!"
        log_info "Location: $APK_PATH"
        log_info "Size: $APK_SIZE"
    else
        log_error "APK build failed - output not found"
        exit 1
    fi
}

# Build Android AAB (for Play Store)
build_android_aab() {
    log_info "Building Android App Bundle (AAB)..."
    
    # Check Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        if [ -d "/opt/android-sdk" ]; then
            export ANDROID_HOME=/opt/android-sdk
        elif [ -d "$HOME/Android/Sdk" ]; then
            export ANDROID_HOME=$HOME/Android/Sdk
        else
            log_error "ANDROID_HOME not set and Android SDK not found"
            exit 1
        fi
    fi
    
    export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
    
    # Prebuild
    log_info "Generating native Android project..."
    npx expo prebuild --platform android --clean
    
    # Build AAB
    log_info "Building release AAB (this may take a while)..."
    cd android
    ./gradlew bundleRelease
    cd ..
    
    # Check output
    AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
    if [ -f "$AAB_PATH" ]; then
        AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
        log_success "Android AAB built successfully!"
        log_info "Location: $AAB_PATH"
        log_info "Size: $AAB_SIZE"
    else
        log_error "AAB build failed - output not found"
        exit 1
    fi
}

# Build iOS (macOS only)
build_ios() {
    log_info "Building iOS..."
    
    # Check macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_error "iOS builds require macOS"
        exit 1
    fi
    
    # Check Xcode
    if ! command -v xcodebuild &> /dev/null; then
        log_error "Xcode not found"
        exit 1
    fi
    
    # Prebuild
    log_info "Generating native iOS project..."
    npx expo prebuild --platform ios --clean
    
    # Install pods
    log_info "Installing CocoaPods dependencies..."
    cd ios
    pod install
    cd ..
    
    # Build
    log_info "Building iOS release..."
    xcodebuild -workspace ios/HateBeat.xcworkspace \
        -scheme HateBeat \
        -configuration Release \
        -destination 'generic/platform=iOS' \
        clean build
    
    log_success "iOS build completed"
    log_info "Open ios/HateBeat.xcworkspace in Xcode to archive for App Store"
}

# EAS Cloud Build
eas_build() {
    local platform=$1
    local profile=$2
    
    log_info "Starting EAS cloud build for $platform ($profile)..."
    
    # Check EAS CLI
    if ! command -v eas &> /dev/null; then
        log_warn "EAS CLI not found. Installing..."
        npm install -g eas-cli
    fi
    
    # Check login
    if ! eas whoami &> /dev/null; then
        log_warn "Not logged into Expo. Please login:"
        eas login
    fi
    
    eas build --platform "$platform" --profile "$profile"
}

# Development server
start_dev() {
    log_info "Starting development server..."
    npm start
}

# Show help
show_help() {
    echo "Hate Beat Mobile Build Script"
    echo ""
    echo "Usage: ./build.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev              Start development server"
    echo "  check            Run type checking"
    echo "  android-apk      Build Android APK locally"
    echo "  android-aab      Build Android AAB (Play Store) locally"
    echo "  ios              Build iOS locally (macOS only)"
    echo "  eas-android      Build Android via EAS cloud"
    echo "  eas-ios          Build iOS via EAS cloud"
    echo "  eas-preview      Build Android preview APK via EAS"
    echo "  clean            Clean build artifacts"
    echo "  help             Show this help"
    echo ""
    echo "Examples:"
    echo "  ./build.sh dev              # Start development"
    echo "  ./build.sh android-apk      # Build APK locally"
    echo "  ./build.sh eas-preview      # Build via EAS cloud"
}

# Clean build artifacts
clean() {
    log_info "Cleaning build artifacts..."
    rm -rf android/build android/app/build ios/build
    rm -rf node_modules/.cache
    log_success "Clean complete"
}

# Main
main() {
    case "${1:-help}" in
        dev)
            start_dev
            ;;
        check)
            check_prerequisites
            run_typecheck
            ;;
        android-apk)
            check_prerequisites
            run_typecheck
            build_android_apk
            ;;
        android-aab)
            check_prerequisites
            run_typecheck
            build_android_aab
            ;;
        ios)
            check_prerequisites
            run_typecheck
            build_ios
            ;;
        eas-android)
            eas_build android production
            ;;
        eas-ios)
            eas_build ios production
            ;;
        eas-preview)
            eas_build android preview
            ;;
        clean)
            clean
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
