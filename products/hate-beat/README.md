# Hate Beat 🎮💢

A mobile rhythm game where you beat tasks you hate by tapping them into oblivion. Think Guitar Hero meets stress relief!

## Concept

1. **Describe a task you hate** (e.g., "doing taxes")
2. **Rate your hate** on a scale of 1-10
3. **Describe your hate with words** (e.g., "boring tedious painful")
4. **Battle**: Each word becomes a floating enemy - tap to destroy!
5. **Rhythm mechanic**: Time your taps with the beat for bonus points
6. **Victory**: Clear all words, the task is "defeated"

## Features

- 🎵 **Rhythm-based tapping** - Time hits with the beat for perfect scores
- 🔥 **Combo system** - Chain hits for massive score multipliers
- 📊 **Score tracking** - Perfect hits, combos, and accuracy stats
- 🎨 **Visual feedback** - Particle effects, floating text, screen shake
- 📱 **Cross-platform** - Web, Android, and iOS support
- 🎮 **Difficulty scaling** - Hate level affects enemy speed and beat tempo
- 🌙 **Dark theme** - Easy on the eyes, perfect for late-night stress relief
- 🔊 **Sound effects** - Web Audio API synthesized sounds (no external files)
- 🏆 **High scores** - Local storage for top 10 scores
- 📳 **Haptic feedback** - Vibration on mobile devices

## Tech Stack

- **Web**: HTML5 Canvas + vanilla JavaScript
- **Mobile**: Capacitor JS (wraps web app into native apps)
- **No AI/Backend**: 100% offline, all local processing
- **Performance**: 60fps on mobile devices

## Quick Start

### Web (Development)
```bash
cd products/hate-beat
npm install
npm run serve
# Open http://localhost:3000
```

### Android

#### Option 1: Use Pre-built APKs (Fastest)
The following APKs are already built and ready:

| Build | File | Size | Purpose |
|-------|------|------|---------|
| Debug | `android/app/build/outputs/apk/debug/app-debug.apk` | 4.8 MB | Development/testing |
| Release | `android/app/build/outputs/apk/release/app-release.apk` | 3.6 MB | Distribution |
| AAB | `android/app/build/outputs/bundle/release/app-release.aab` | 3.4 MB | Google Play Store |

Install on Android device:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### Option 2: Build from Source
```bash
npm install
npm run sync
npm run android
# Or build directly:
cd android && ./gradlew assembleDebug
```

### iOS (Mac only)
```bash
npm install
npm run sync
npm run ios
# Build in Xcode
```

## Project Structure

```
hate-beat/
├── web/                    # Web game source
│   ├── index.html         # Complete game (60KB, ~1,400 lines)
│   └── mobile-bridge.js   # Native plugin integration
├── android/               # Android native project
│   └── app/build/outputs/ # Built APKs and AAB
├── ios/                   # iOS native project
│   └── App.xcodeproj      # Xcode project
├── resources/             # Icons, splash screens
├── capacitor.config.json  # Capacitor configuration
└── package.json
```

## Game Mechanics

### Rhythm System
- Beat indicator pulses at the bottom of the screen
- Tap enemies when the beat pulses for "PERFECT" hits (2x points)
- Near-beat taps give "GOOD" hits (1x points)
- Off-beat taps are "MISS" (0.5x points, breaks combo)

### Scoring
- Base points: 100 per hit
- Perfect multiplier: 2x
- Combo multiplier: +10% per combo level
- Max combo bonus at end of round

### Difficulty
- Hate level 1-3: Slow enemies, slow beat (600ms)
- Hate level 4-7: Medium speed, faster beat (400ms)
- Hate level 8-10: Fast enemies, frantic beat (200ms)

## Building for Production

### Android APK
```bash
cd android
./gradlew assembleDebug      # Debug build
./gradlew assembleRelease    # Release build
./gradlew bundleRelease      # Play Store bundle (AAB)
```

Output locations:
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`
- Release AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Release signing:
- Copy `android/keystore.properties.example` to `android/keystore.properties` and fill in real values
- Or set env vars: `HATEBEAT_KEYSTORE_PATH`, `HATEBEAT_KEYSTORE_PASSWORD`, `HATEBEAT_KEY_ALIAS`, `HATEBEAT_KEY_PASSWORD`

### iOS IPA
Requires Xcode and Apple Developer account:
1. Open `ios/App/App.xcworkspace` in Xcode
2. Configure signing with your Apple ID
3. Select "Any iOS Device" as target
4. Product → Archive
5. Distribute App

## Mobile Features

### Capacitor Plugins Integrated
| Plugin | Purpose |
|--------|---------|
| @capacitor/app | Lifecycle & back button handling |
| @capacitor/haptics | Vibration feedback |
| @capacitor/keyboard | Keyboard handling |
| @capacitor/preferences | Native storage for high scores |
| @capacitor/status-bar | Status bar styling |

### Mobile Optimizations
- Touch targets minimum 56px for easy tapping
- Safe area insets for notched devices (iPhone X+)
- `touch-action: none` prevents zoom/scroll
- `user-select: none` prevents text selection
- Dynamic viewport height (`dvh`) for mobile browsers
- Dark keyboard style on iOS/Android

## Build Status

| Platform | Status | Notes |
|----------|--------|-------|
| Web | ✅ Complete | Playable in any browser |
| Android Debug APK | ✅ Built | 4.8 MB, ready for testing |
| Android Release APK | ✅ Built | 3.6 MB, ready for distribution |
| Android AAB | ✅ Built | 3.4 MB, Play Store ready |
| iOS Project | ✅ Ready | Requires macOS + Xcode to build |

## Future Enhancements

- [ ] Background music (procedural generation)
- [ ] More enemy types and patterns
- [ ] Power-ups (slow motion, bomb, etc.)
- [ ] Boss battles (long words = bosses)
- [ ] Share scores on social media
- [ ] Achievements system
- [ ] Multiplayer mode

## License

MIT
