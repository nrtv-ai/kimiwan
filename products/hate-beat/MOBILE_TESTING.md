# Hate Beat Mobile Testing Guide

## 📱 Device Testing Matrix

### Android Devices

| Device | OS Version | Priority | Status |
|--------|------------|----------|--------|
| Pixel 7/8 | Android 14 | High | ⏳ Pending |
| Samsung Galaxy S23 | Android 14 | High | ⏳ Pending |
| Samsung Galaxy A54 | Android 13 | Medium | ⏳ Pending |
| Xiaomi Redmi Note | Android 12 | Medium | ⏳ Pending |
| Emulator (Pixel 4) | Android 14 | Low | ⏳ Pending |

### iOS Devices

| Device | OS Version | Priority | Status |
|--------|------------|----------|--------|
| iPhone 15 Pro | iOS 17 | High | ⏳ Requires macOS |
| iPhone 14 | iOS 17 | High | ⏳ Requires macOS |
| iPhone SE | iOS 16 | Medium | ⏳ Requires macOS |
| iPad Pro | iPadOS 17 | Medium | ⏳ Requires macOS |

---

## ✅ Functional Testing Checklist

### Input Flow

- [ ] **Screen 1: Task Input**
  - [ ] Text input accepts characters
  - [ ] Keyboard appears on focus
  - [ ] Continue button disabled when empty
  - [ ] Continue button enabled when text entered
  - [ ] High scores display correctly
  - [ ] Swipe gestures don't interfere

- [ ] **Screen 2: Hate Level Selection**
  - [ ] All 10 buttons visible and tappable
  - [ ] Selected button shows visual feedback
  - [ ] Hate label updates correctly
  - [ ] Continue button disabled until selection
  - [ ] Back navigation works

- [ ] **Screen 3: Words Input**
  - [ ] Text area accepts input
  - [ ] Placeholder text visible
  - [ ] Battle button disabled when empty
  - [ ] Back navigation works

### Gameplay

- [ ] **Game Start**
  - [ ] Canvas initializes correctly
  - [ ] Enemies spawn from words
  - [ ] HP matches word length
  - [ ] Rhythm bar appears and pulses
  - [ ] Score display shows 0
  - [ ] Combo display hidden initially

- [ ] **Enemy Mechanics**
  - [ ] Enemies float/move appropriately
  - [ ] Enemies have correct HP
  - [ ] Tap registers on enemy
  - [ ] Enemy takes damage on tap
  - [ ] Enemy destroyed when HP reaches 0
  - [ ] Particle effect on destruction

- [ ] **Rhythm System**
  - [ ] Beat indicator pulses visibly
  - [ ] Perfect timing gives 2x points
  - [ ] Good timing gives 1x points
  - [ ] Miss gives 0.5x points
  - [ ] Floating text shows timing result
  - [ ] Combo increases on hit
  - [ ] Combo breaks on miss

- [ ] **Scoring**
  - [ ] Score updates in real-time
  - [ ] Combo multiplier applies correctly
  - [ ] Perfect hit counter increments
  - [ ] Max combo tracked correctly
  - [ ] Accuracy calculated correctly

- [ ] **Victory/Game Over**
  - [ ] Victory screen shows when all enemies destroyed
  - [ ] Game over shows when enemies reach bottom
  - [ ] Stats display correctly
  - [ ] High score saved if applicable
  - [ ] Play again button works
  - [ ] Main menu button works

### Mobile Features

- [ ] **Touch Controls**
  - [ ] Single tap works
  - [ ] Multi-touch works (if applicable)
  - [ ] No accidental double-taps
  - [ ] Touch targets large enough (min 56px)
  - [ ] No touch lag

- [ ] **Haptic Feedback**
  - [ ] Light haptic on regular hits
  - [ ] Medium haptic on perfect hits
  - [ ] Heavy haptic on enemy destruction
  - [ ] Error haptic on game over
  - [ ] Haptic on button presses

- [ ] **Sound**
  - [ ] Sound effects play on hits
  - [ ] Sound effects play on destruction
  - [ ] Beat sound plays
  - [ ] Victory jingle plays
  - [ ] Game over sound plays
  - [ ] Sound toggle works
  - [ ] Sound respects device volume
  - [ ] No audio delay

- [ ] **App Lifecycle**
  - [ ] App pauses when backgrounded
  - [ ] App resumes correctly
  - [ ] Back button opens pause menu
  - [ ] Pause menu works correctly
  - [ ] Resume from pause works
  - [ ] Quit from pause works

---

## 🔧 Technical Testing

### Performance

- [ ] **Frame Rate**
  - [ ] Maintains 60fps during gameplay
  - [ ] No frame drops during particle effects
  - [ ] Smooth animations

- [ ] **Memory**
  - [ ] No memory leaks
  - [ ] App doesn't crash after extended play
  - [ ] Backgrounding doesn't cause crashes

- [ ] **Battery**
  - [ ] Reasonable battery usage
  - [ ] No excessive CPU usage

### Compatibility

- [ ] **Screen Sizes**
  - [ ] Works on small screens (320px width)
  - [ ] Works on medium screens (375px width)
  - [ ] Works on large screens (414px width)
  - [ ] Works on tablets

- [ ] **Orientations**
  - [ ] Portrait mode works
  - [ ] Landscape mode works (if supported)
  - [ ] Rotation handled correctly

- [ ] **Notch/Edge Support**
  - [ ] Safe area insets work
  - [ ] UI not obscured by notch
  - [ ] UI not obscured by gestures

---

## 🐛 Known Issues

| Issue | Device | Severity | Workaround |
|-------|--------|----------|------------|
| None reported | - | - | - |

---

## 📝 Test Results

### Android Debug APK (app-debug.apk)

| Test Date | Device | OS | Tester | Result | Notes |
|-----------|--------|-----|--------|--------|-------|
| 2026-02-26 | - | - | - | ⏳ Pending | - |

### Android Release APK (app-release.apk)

| Test Date | Device | OS | Tester | Result | Notes |
|-----------|--------|-----|--------|--------|-------|
| 2026-02-26 | - | - | - | ⏳ Pending | - |

### iOS (Pending macOS)

| Test Date | Device | OS | Tester | Result | Notes |
|-----------|--------|-----|--------|--------|-------|
| 2026-02-26 | - | - | - | ⏳ Pending | Requires macOS + Xcode |

---

## 🚀 Automated Testing

### Unit Tests (Future)

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### Integration Tests (Future)

```bash
# Run integration tests
npm run test:integration
```

### E2E Tests (Future)

```bash
# Run E2E tests with Detox
npm run test:e2e:android
npm run test:e2e:ios
```

---

## 🎯 Beta Testing

### Internal Testing

- [ ] Team members test on their devices
- [ ] Collect feedback via form
- [ ] Address critical issues

### Closed Beta

- [ ] Google Play Internal Testing track
- [ ] TestFlight for iOS
- [ ] 10-50 external testers
- [ ] Collect crash reports

### Open Beta

- [ ] Google Play Open Testing track
- [ ] Public TestFlight link
- [ ] 100+ testers
- [ ] Monitor analytics

---

## 📊 Success Criteria

Before full release, the app must:

- [ ] Pass all functional tests
- [ ] Achieve 60fps on target devices
- [ ] No crashes in 100+ play sessions
- [ ] Average rating ≥4.0 in beta
- [ ] All critical bugs fixed
- [ ] App store assets ready
