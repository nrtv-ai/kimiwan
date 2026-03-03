# Hate Beat Mobile Build Guide

## Project Status Overview

**Date:** 2026-03-03  
**Status:** ✅ Android & iOS projects configured, ready for builds

### Two Project Versions

1. **`/projects/hate-beat/`** - React Native/Expo version (more complex, full native)
2. **`/products/hate-beat/`** - Capacitor version (web-based, simpler builds) ← **RECOMMENDED**

This guide focuses on the **Capacitor version** in `/products/hate-beat/` as it's more suitable for rapid mobile deployment.

---

## Quick Start

### Prerequisites

```bash
# Install Node.js dependencies
cd /products/hate-beat
npm install

# Install Capacitor CLI globally (optional)
npm install -g @capacitor/cli
```

### Build Android APK

```bash
cd /products/hate-beat

# 1. Sync web assets to Android project
npx cap sync android

# 2. Build debug APK
cd android && ./gradlew assembleDebug

# 3. Build release APK (unsigned)
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
# Release APK: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Build iOS

```bash
cd /products/hate-beat

# 1. Sync web assets
npx cap sync ios

# 2. Open in Xcode (requires macOS)
npx cap open ios

# 3. Build via Xcode or command line:
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug
```

---

## Project Structure

```
/products/hate-beat/
├── web/                    # Web game assets (HTML/CSS/JS)
│   ├── index.html         # Main game file
│   └── mobile-bridge.js   # Capacitor native bridge
├── android/               # Android native project
│   ├── app/
│   │   ├── build.gradle   # App build config
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/com/hatebeat/app/
│   └── build.gradle       # Project build config
├── ios/                   # iOS native project
│   └── App/
│       ├── App.xcodeproj
│       └── App/
│           ├── Info.plist
│           └── AppDelegate.swift
├── resources/             # App icons & splash screens
│   ├── icon.png
│   └── splash.svg
└── capacitor.config.json  # Capacitor configuration
```

---

## Configuration Details

### Android Configuration

**Package Name:** `com.hatebeat.app`  
**Version:** 1.0.0 (versionCode: 1)  
**Target SDK:** 34  
**Min SDK:** 22

**Key Files:**
- `android/app/build.gradle` - App-level build configuration
- `android/app/src/main/AndroidManifest.xml` - App permissions & components
- `android/variables.gradle` - SDK versions and dependencies

**Permissions:**
- INTERNET
- VIBRATE (for haptic feedback)

**Features:**
- Touchscreen required
- Portrait orientation (primary)
- Hardware acceleration enabled
- Large heap for web content

### iOS Configuration

**Bundle ID:** `com.hatebeat.app`  
**Version:** 1.0.0  
**Deployment Target:** iOS 14.0

**Key Files:**
- `ios/App/App/Info.plist` - App configuration
- `ios/App/App.xcodeproj/project.pbxproj` - Xcode project

**Capabilities:**
- Portrait orientation
- Status bar style: Dark
- Safe area insets supported

---

## Build Configurations

### Debug Build (Development)

```bash
cd /products/hate-beat/android
./gradlew assembleDebug
```

**Output:** `app/build/outputs/apk/debug/app-debug.apk`  
**Features:** Debug symbols, no optimization, installable on any device

### Release Build (Production)

```bash
cd /products/hate-beat/android
./gradlew assembleRelease
```

**Output:** `app/build/outputs/apk/release/app-release-unsigned.apk`  
**Note:** Unsigned APK cannot be installed directly. Requires signing.

### Signed Release Build

1. **Create keystore** (one-time setup):
```bash
keytool -genkey -v -keystore hatebeat.keystore -alias hatebeat -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure signing** in `android/keystore.properties`:
```properties
storeFile=hatebeat.keystore
storePassword=your_password
keyAlias=hatebeat
keyPassword=your_password
```

3. **Build signed APK**:
```bash
./gradlew assembleRelease
```

**Output:** `app/build/outputs/apk/release/app-release.apk`

### App Bundle (Play Store)

```bash
./gradlew bundleRelease
```

**Output:** `app/build/outputs/bundle/release/app-release.aab`

---

## Testing

### Android Testing

```bash
# Install on connected device/emulator
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or with Android Studio:
# 1. Open android/ folder in Android Studio
# 2. Click "Run" button
```

### iOS Testing

```bash
# Open in Xcode
npx cap open ios

# Build and run on simulator
# Or connect device and select it as target
```

---

## Responsive Design Features

The game includes mobile-optimized CSS:

```css
/* Safe area support for notched devices */
.safe-area {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
}

/* Dynamic viewport height */
min-height: 100dvh;

/* Touch optimization */
touch-action: none;
user-select: none;
-webkit-user-select: none;
```

---

## Native Plugins

Current Capacitor plugins configured:

| Plugin | Purpose |
|--------|---------|
| `@capacitor/preferences` | Local storage |
| `@capacitor/haptics` | Vibration feedback |
| `@capacitor/keyboard` | Keyboard handling |
| `@capacitor/status-bar` | Status bar styling |
| `@capacitor/app` | App lifecycle |

---

## Troubleshooting

### Android Build Issues

**Issue:** `gradlew permission denied`
```bash
chmod +x android/gradlew
```

**Issue:** `JAVA_HOME not set`
```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export PATH=$PATH:$JAVA_HOME/bin
```

**Issue:** Android SDK not found
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### iOS Build Issues

**Issue:** Xcode command line tools not found
```bash
xcode-select --install
```

**Issue:** CocoaPods dependencies
```bash
cd ios/App
pod install
```

---

## Next Steps

### Immediate
1. ✅ Android project configured
2. ✅ iOS project configured
3. ⏳ Test APK build on emulator
4. ⏳ Test iOS build on simulator

### Short Term
1. Add app icons for all densities
2. Add splash screen assets
3. Configure app signing for release
4. Test on physical devices

### Long Term
1. Google Play Store submission
2. Apple App Store submission
3. CI/CD pipeline setup

---

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/studio/build)
- [iOS App Distribution](https://developer.apple.com/documentation/xcode/distributing-your-app)
