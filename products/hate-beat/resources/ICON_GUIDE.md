# Icon Generation Guide

## Source Files
- Icon: resources/icon.svg (1024x1024)
- Splash: resources/splash.svg (2732x2732)

## Required Sizes

### Android (in android/app/src/main/res/)
```
mipmap-mdpi:     48x48
mipmap-hdpi:     72x72
mipmap-xhdpi:    96x96
mipmap-xxhdpi:   144x144
mipmap-xxxhdpi:  192x192
```

### iOS (in ios/App/App/Assets.xcassets/AppIcon.appiconset/)
```
20x20@2x    = 40x40
20x20@3x    = 60x60
29x29@2x    = 58x58
29x29@3x    = 87x87
40x40@2x    = 80x80
40x40@3x    = 120x120
60x60@2x    = 120x120
60x60@3x    = 180x180
1024x1024   = App Store
```

## Quick Commands (with ImageMagick)
```bash
# Android icons
convert resources/icon.svg -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert resources/icon.svg -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert resources/icon.svg -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert resources/icon.svg -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert resources/icon.svg -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Foreground icons (same sizes, in mipmap-*dpi-v26/)
# ...same commands with ic_launcher_foreground.png
```
