# Hate Beat - Mobile Rhythm Game

A mobile rhythm game where you play along to songs you love to hate. Built with React Native and Expo.

## Features

- 🎵 Rhythm-based gameplay with 4 lanes
- 📱 Cross-platform (iOS & Android)
- 🎨 Dark theme with neon accents
- 🏆 Score tracking with combo system
- 📊 Results screen with letter grades

## Screens

1. **Home Screen** - Main menu with play, leaderboard, and settings options
2. **Song Select** - Choose from songs with different difficulty levels and "hate ratings"
3. **Game Screen** - Tap notes as they fall to the hit line
4. **Results Screen** - View your score, accuracy, and rank

## Tech Stack

- **Framework**: React Native 0.81.5 + Expo ~54.0.33
- **Language**: TypeScript 5.9
- **Navigation**: React Navigation v7
- **State Management**: Zustand
- **Audio**: Expo AV
- **Animation**: React Native Animated API

## Project Structure

```
projects/hate-beat/
├── App.tsx                 # Main app entry with navigation
├── index.ts                # Expo root component registration
├── app.json                # Expo configuration
├── package.json            # Dependencies
├── assets/                 # Images, icons, splash screen
└── src/
    ├── types/
    │   └── index.ts        # TypeScript type definitions
    ├── constants/
    │   └── songs.ts        # Song data and game constants
    ├── screens/
    │   ├── HomeScreen.tsx
    │   ├── SongSelectScreen.tsx
    │   ├── GameScreen.tsx
    │   └── ResultsScreen.tsx
    ├── store/
    │   └── gameStore.ts    # Zustand game state
    └── utils/
        └── gameHelpers.ts  # Utility functions
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- For iOS: macOS with Xcode
- For Android: Android Studio with SDK

### Install Dependencies

```bash
cd projects/hate-beat
npm install
```

### Run Development Server

```bash
# Start Expo development server
npm start

# Or use Expo CLI directly
expo start
```

### Run on Device/Simulator

```bash
# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android

# Web
npm run web
```

## Building for Production

### iOS Build

```bash
# Create iOS native project
cd projects/hate-beat
npx expo prebuild --platform ios

# Open in Xcode and build
cd ios
open HateBeat.xcworkspace

# Or build via command line
xcodebuild -workspace HateBeat.xcworkspace -scheme HateBeat -configuration Release
```

### Android Build

```bash
# Create Android native project
npx expo prebuild --platform android

# Build release APK
cd android
./gradlew assembleRelease

# Or build AAB for Play Store
./gradlew bundleRelease
```

### EAS Build (Recommended)

Expo Application Services (EAS) provides cloud builds:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure builds
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both
eas build --platform all
```

## Game Controls

- **Tap lanes** at the bottom of the screen when notes reach the hit line
- **Timing matters**: Hit within the window for PERFECT (±50ms) or GOOD (±120ms)
- **Combo system**: Build combos for higher scores
- **Health bar**: Missing notes reduces health

## Configuration

### Adding New Songs

Edit `src/constants/songs.ts`:

```typescript
{
  id: 'your-song-id',
  title: 'Song Title',
  artist: 'Artist Name',
  duration: 180,  // seconds
  bpm: 128,
  hateRating: 8.5,  // 1-10 scale
  difficulty: 'medium',  // 'easy' | 'medium' | 'hard'
  color: '#FF6B9D',  // note color
  audioUrl: 'https://example.com/song.mp3',
}
```

### Adjusting Game Difficulty

Edit `src/constants/songs.ts`:

```typescript
export const HIT_WINDOW = {
  perfect: 0.05,  // 50ms window
  good: 0.12,     // 120ms window
  miss: 0.2,      // 200ms window
};

export const NOTE_SPEED = 300;  // pixels per second
```

## License

MIT