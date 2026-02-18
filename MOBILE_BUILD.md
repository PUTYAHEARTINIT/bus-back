# Bus Back — Mobile Build Guide (Capacitor 6)

## Prerequisites
- Node.js 18+
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- Apple Developer account (for iOS device / App Store)

---

## 1. Install dependencies

```bash
cd ~/bus-back
npm install
```

---

## 2. Add assets (required before build)

Create the `assets/` directory and add:
- `assets/icon.png` — 1024×1024 app icon
- `assets/splash.png` — 2732×2732 splash screen (centered safe area ~1200px)

---

## 3. iOS Build

```bash
# First time only — adds iOS platform
npx cap add ios

# Sync web assets to native project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

In Xcode:
1. Select your Team under Signing & Capabilities
2. Set Bundle Identifier: `com.busback.game`
3. Set Deployment Target: iOS 16+
4. Build & run on device or simulator

---

## 4. Android Build

```bash
# First time only — adds Android platform
npx cap add android

# Sync web assets to native project
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Let Gradle sync complete
2. Select device/emulator
3. Run → Debug or Build → Generate Signed APK/AAB for release

---

## 5. Re-sync after code changes

Every time you update the web source:
```bash
npx cap sync
```
Then rebuild in Xcode / Android Studio.

---

## 6. Local dev server

```bash
npm run dev
# Opens at http://localhost:3333
```

---

## App Store Notes
- Rating: 17+ (simulated violence — police chase)
- Category: Games → Action
- See STORE_LISTING.md for full copy
