# Hate Beat - Mobile Development Guide

## Project Overview

**Game:** Hate Beat - A 4-lane rhythm game with a "hate" theme  
**Platform:** React Native with Expo SDK 54  
**Target Platforms:** Android (APK/AAB), iOS  
**Status:** ✅ Ready for production builds

---

## Quick Start

```bash
cd projects/hate-beat

# Install dependencies
npm install

# Start development server
npm start
# Press 'a' for Android emulator
# Press 'i' for iOS simulator
```

---

## Build Options

### Option 1: Local Build (Fastest for testing)

**Prerequisites:**
- Node.js 18+
- Java 17+ (OpenJDK)
- Android SDK (for Android builds)
- macOS + Xcode (for iOS builds)

**Build Commands:**

```bash
# Build Android APK (local)
./build.sh android-apk

# Build Android AAB for Play Store (local)
./build.sh android-aab

# Build iOS (macOS only)
./build.sh ios
```

### Option 2: EAS Cloud Build (Easiest, no local SDK needed)

**Prerequisites:**
- Node.js 18+
- Expo account (free)

**Build Commands:**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK (preview)
./build.sh eas-preview

# Build Android AAB (production)
./build.sh eas-android

# Build iOS (requires Apple Developer account)
./build.sh eas-ios
```

---

## Project Structure

```
hate-beat/
├── App.tsx                    # Navigation setup
├── app.json                   # Expo configuration
├── eas.json                   # EAS Build profiles
├── package.json               # Dependencies
├── build.sh                   # Build automation script
├── QUICKSTART.md              # Quick reference
├── MOBILE_BUILD_STATUS.md     # Detailed status report
├── android/                   # Native Android project (generated)
├── assets/                    # Icons, splash screen
│   ├── icon.png              # App icon (1024x1024)
│   ├── adaptive-icon.png     # Android adaptive icon
│   └── splash-icon.png       # Splash screen
└── src/
    ├── types/index.ts         # TypeScript definitions
    ├── constants/songs.ts     # Song data
    ├── screens/               # Game screens
    │   ├── HomeScreen.tsx     # Main menu
    │   ├── SongSelectScreen.tsx
    │   ├── GameScreen.tsx     # Gameplay
    │   └── ResultsScreen.tsx
    ├── store/gameStore.ts     # Zustand state management
    └── utils/gameHelpers.ts   # Utility functions
```

---

## Configuration Details

### Android (app.json)

```json
{
  "android": {
    "package": "com.hatebeat.game",
    "versionCode": 1,
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#1a1a2e"
    },
    "edgeToEdgeEnabled": true,
    "permissions": [
      "android.permission.INTERNET",
      "android.permission.WAKE_LOCK"
    ]
  }
}
```

### iOS (app.json)

```json
{
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "com.hatebeat.game",
    "buildNumber": "1.0.0",
    "infoPlist": {
      "UIBackgroundModes": ["audio"]
    }
  }
}
```

### EAS Build Profiles (eas.json)

| Profile | Use Case | Output |
|---------|----------|--------|
| `development` | Development with dev client | Debug build |
| `preview` | Internal testing | APK (Android) |
| `production` | App Store submission | AAB (Android), IPA (iOS) |

---

## Game Features

### Core Mechanics
- **4-lane rhythm gameplay** - Tap notes as they fall
- **Timing windows:**
  - Perfect: ±50ms (100 points)
  - Good: ±120ms (50 points)
  - Miss: >200ms (0 points, lose health)
- **Combo system** - Score multipliers for consecutive hits
- **Health system** - Game ends at 0 health
- **Letter grades** - S, A, B, C, D, F based on accuracy

### Songs Included
1. **Cyber Hate** (128 BPM, Hard) - Hate Rating: 9.2/10
2. **Neon Rage** (140 BPM, Medium) - Hate Rating: 7.5/10
3. **Dark Pulse** (110 BPM, Easy) - Hate Rating: 6.0/10

### Technical Stack
- **Framework:** Expo SDK 54.0.33
- **React Native:** 0.81.5
- **Navigation:** React Navigation v7
- **State:** Zustand 5.0.11
- **Audio:** expo-av 16.0.8
- **UI:** React Native + StyleSheet

---

## Build Outputs

### Android

| Format | Location | Use Case |
|--------|----------|----------|
| APK | `android/app/build/outputs/apk/release/app-release.apk` | Direct install/testing |
| AAB | `android/app/build/outputs/bundle/release/app-release.aab` | Play Store upload |

### iOS

| Format | Location | Use Case |
|--------|----------|----------|
| App | `ios/build/Release-iphoneos/HateBeat.app` | Device testing |
| Archive | Xcode Organizer | App Store submission |

---

## Testing Checklist

### Pre-Build
- [ ] TypeScript compilation passes (`npm run typecheck`)
- [ ] All dependencies installed (`npm install`)
- [ ] Assets (icons, splash) are correct sizes

### Post-Build
- [ ] APK/AAB installs successfully
- [ ] App launches without crashes
- [ ] Audio playback works
- [ ] All 4 lanes respond to touches
- [ ] Score/combo system functions
- [ ] Results screen displays correctly
- [ ] Navigation between screens works

### Device Testing
- [ ] Test on different screen sizes
- [ ] Test with different Android versions (8.0+)
- [ ] Test with different iOS versions (14+)
- [ ] Verify performance (target: 60 FPS)

---

## Troubleshooting

### Build Issues

**Gradle build fails:**
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo prebuild --platform android --clean
./build.sh android-apk
```

**Metro bundler issues:**
```bash
# Clear cache
npx expo start --clear
```

**TypeScript errors:**
```bash
# Check types
npm run typecheck
```

### Runtime Issues

**Audio not playing:**
- Check internet connection (audio loaded from URLs)
- Verify `UIBackgroundModes` includes "audio" (iOS)

**Touch not registering:**
- Ensure no other views are overlapping the game area
- Check that `pointerEvents` are set correctly

---

## App Store Preparation

### Google Play Store

1. Create developer account ($25 one-time)
2. Build AAB: `./build.sh android-aab`
3. Create app listing in Play Console
4. Upload AAB file
5. Fill in store listing details
6. Submit for review

### Apple App Store

1. Enroll in Apple Developer Program ($99/year)
2. Build iOS: `./build.sh ios`
3. Open Xcode and archive
4. Upload via Xcode or Transporter
5. Create app in App Store Connect
6. Submit for review

---

## Future Enhancements

- [ ] Haptic feedback on note hits
- [ ] Leaderboard integration (Firebase)
- [ ] Local song file support
- [ ] Hold notes (long press)
- [ ] Additional songs with "hate" theme
- [ ] Custom beatmaps (not random)
- [ ] Reanimated v4 for smoother animations

---

## Resources

- **Expo Documentation:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **React Native:** https://reactnative.dev
- **React Navigation:** https://reactnavigation.org

---

## Support

For issues or questions:
1. Check `MOBILE_BUILD_STATUS.md` for detailed status
2. Review `QUICKSTART.md` for quick reference
3. Check Expo/React Native documentation
