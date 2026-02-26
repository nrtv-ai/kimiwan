# Hate Beat Mobile Release Guide

## 📱 Android Release Process

### Prerequisites

1. **Android Developer Account**
   - Sign up at [Google Play Console](https://play.google.com/console)
   - One-time $25 registration fee

2. **Signing Keystore**
   - A keystore is already configured in `android/app/hatebeat.keystore`
   - Password: `hatebeat123` (change for production!)

3. **Build Tools**
   - Android Studio or command line tools
   - JDK 17 or later

### Build Types

| Type | File | Purpose |
|------|------|---------|
| Debug | `app-debug.apk` | Development testing |
| Release | `app-release.apk` | Direct distribution |
| AAB | `app-release.aab` | Google Play Store |

### Quick Build

```bash
# Build all variants
./build.sh

# Build and copy to dist/
./build.sh --dist
```

### Manual Build

```bash
# Sync web assets
npx cap sync

# Build debug APK
cd android
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build AAB for Play Store
./gradlew bundleRelease
```

### Testing on Device

```bash
# Install and test debug version
./test.sh

# Install and test release version
./test.sh --release
```

### Play Store Submission

1. **Build AAB**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

2. **Create Release in Play Console**
   - Go to [Google Play Console](https://play.google.com/console)
   - Select your app
   - Go to Release > Production > Create release

3. **Upload AAB**
   - Upload `android/app/build/outputs/bundle/release/app-release.aab`
   - Google Play will generate optimized APKs for different devices

4. **Store Listing**
   Required assets:
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (phone, tablet)
   - Short description (80 chars)
   - Full description (4000 chars)

5. **Content Rating**
   - Fill out content rating questionnaire
   - This game is suitable for Everyone

6. **Pricing & Distribution**
   - Select countries
   - Set price (free)
   - Confirm content guidelines

7. **Review and Publish**
   - Review all sections
   - Submit for review (1-3 days)

---

## 🍎 iOS Release Process

### Prerequisites

1. **Apple Developer Account**
   - Enroll at [Apple Developer](https://developer.apple.com)
   - $99/year fee

2. **macOS + Xcode**
   - Latest Xcode from Mac App Store
   - iOS device for testing

3. **Signing Certificates**
   - Create in Apple Developer Portal
   - Download and install in Xcode

### Build Process

1. **Open Project**
   ```bash
   npx cap open ios
   # Or open ios/App/App.xcworkspace in Xcode
   ```

2. **Configure Signing**
   - Select project in Xcode
   - Go to Signing & Capabilities
   - Select your team
   - Update bundle ID if needed

3. **Build and Archive**
   - Select "Any iOS Device" as target
   - Product > Archive
   - Distribute App

### App Store Submission

1. **App Store Connect**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create new app
   - Fill in app information

2. **Upload Build**
   - Use Xcode Organizer to upload
   - Or use Transporter app

3. **App Review**
   - Screenshots for all device sizes
   - App preview video (optional)
   - Privacy policy URL
   - Support URL

---

## 🔒 Security Checklist

Before releasing:

- [ ] Change keystore password from default
- [ ] Remove debug logging
- [ ] Test on multiple devices
- [ ] Verify no hardcoded secrets
- [ ] Check app permissions
- [ ] Review privacy policy

---

## 📊 Post-Release

### Analytics to Track

- Daily Active Users (DAU)
- Session length
- Level completion rate
- Crash reports
- User ratings

### Update Cycle

- Critical fixes: Immediate
- Feature updates: 2-4 weeks
- Major versions: Quarterly
