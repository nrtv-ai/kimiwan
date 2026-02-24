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
```

### Android
```bash
npm run sync
npm run android
# Then build in Android Studio or:
cd android && ./gradlew assembleDebug
```

### iOS (Mac only)
```bash
npm run sync
npm run ios
# Build in Xcode
```

## Project Structure

```
hate-beat/
├── web/                    # Web game source
│   └── index.html         # Single-file game (HTML + CSS + JS)
├── android/               # Android native project (auto-generated)
├── ios/                   # iOS native project (auto-generated)
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
./gradlew assembleRelease
# APK will be at: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### iOS IPA
Requires Xcode and Apple Developer account. Open `ios/App/App.xcworkspace` in Xcode and archive for distribution.

## Future Enhancements

- [ ] Sound effects and background music
- [ ] Local storage for high scores
- [ ] More enemy types and patterns
- [ ] Power-ups (slow motion, bomb, etc.)
- [ ] Share scores on social media
- [ ] Dark/Light theme toggle

## License

MIT
