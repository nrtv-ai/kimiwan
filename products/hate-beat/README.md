# Hate Beat

A mobile game where you beat tasks you hate by tapping them into oblivion.

## Concept

1. **User describes a task they hate** (e.g., "doing taxes")
2. **Ask: "How much do you hate it?"** (1-10 scale)
3. **User describes the hate** with words (e.g., "boring tedious painful soul-crushing")
4. **Visualize**: Each word becomes a floating enemy on screen
5. **Battle**: Tap words to destroy them — word count = HP bar
6. **Victory**: Clear all words, task is "defeated"

## Tech Stack

- **Web**: HTML5 Canvas + vanilla JS (offline capable)
- **Android**: React Native or Capacitor (wrapping web)
- **iOS**: Same as Android (cross-platform)
- **No AI API**: All local processing
- **Offline**: Service worker for web, local storage for data

## Features

- [ ] Word parsing and visualization
- [ ] Tap-to-destroy mechanics
- [ ] HP bar based on word count
- [ ] Hate level affects word size/speed
- [ ] Victory animations
- [ ] Task history/stats
- [ ] Sound effects (optional, local files)

## Platforms

- [ ] Web (PWA)
- [ ] Android (APK)
- [ ] iOS (IPA)