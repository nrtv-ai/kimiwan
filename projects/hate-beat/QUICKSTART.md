# Hate Beat - Quick Start Guide

## Prerequisites

```bash
# Node.js 18+ required
node --version

# Install Expo CLI globally
npm install -g expo-cli

# For Android builds: Android SDK
# For iOS builds: macOS + Xcode
```

## Installation

```bash
cd projects/hate-beat
npm install
```

## Development

```bash
# Start Expo dev server
npm start

# Press 'a' for Android emulator
# Press 'i' for iOS simulator
# Press 'w' for web
```

## Building for Production

### Option 1: EAS Build (Easiest - Cloud Builds)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK (for testing)
eas build --platform android --profile preview

# Build Android AAB (for Play Store)
eas build --platform android --profile production

# Build iOS (requires Apple Developer account)
eas build --platform ios
```

### Option 2: Local Build

**Android:**
```bash
# Ensure Android SDK is set up
export ANDROID_HOME=/path/to/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Generate native project
npx expo prebuild --platform android

# Build release APK
cd android
./gradlew assembleRelease

# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

**iOS:** (macOS only)
```bash
# Generate native project
npx expo prebuild --platform ios

# Open in Xcode
cd ios
open HateBeat.xcworkspace

# Or build via command line:
xcodebuild -workspace HateBeat.xcworkspace -scheme HateBeat -configuration Release
```

## Project Structure

```
src/
├── screens/
│   ├── HomeScreen.tsx       # Main menu
│   ├── SongSelectScreen.tsx # Song list
│   ├── GameScreen.tsx       # Gameplay
│   └── ResultsScreen.tsx    # Score display
├── store/
│   └── gameStore.ts         # Game state (Zustand)
├── constants/
│   └── songs.ts             # Song data
├── types/
│   └── index.ts             # TypeScript types
└── utils/
    └── gameHelpers.ts       # Utility functions
```

## Game Mechanics

- **4 lanes** - Tap notes as they fall
- **Timing windows:**
  - Perfect: ±50ms (100 points)
  - Good: ±120ms (50 points)
  - Miss: >200ms (0 points, lose health)
- **Combo system** - Build combos for score multipliers
- **Health bar** - Game ends at 0 health

## Adding New Songs

Edit `src/constants/songs.ts`:

```typescript
{
  id: 'my-song',
  title: 'My Song',
  artist: 'Artist Name',
  duration: 180,        // seconds
  bpm: 128,
  hateRating: 8.5,      // 1-10 scale
  difficulty: 'medium', // 'easy' | 'medium' | 'hard'
  color: '#FF6B9D',     // note color
  audioUrl: 'https://example.com/song.mp3',
}
```

## Troubleshooting

### Metro bundler issues
```bash
# Clear cache
npx expo start --clear
```

### Android build fails
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo prebuild --platform android --clean
```

### iOS build fails
```bash
# Clean pods
cd ios
pod deintegrate
pod install
cd ..
```

## License

MIT
