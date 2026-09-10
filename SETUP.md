# MoviEdu setup (Android APK)

Target: one Android tablet, **standalone sideloaded APK**. No Play Store. No Apple account.

Build machine: **Windows x86_64** (or x86_64 Linux) with Android Studio. This is how you get a real **MoviEdu** icon on the home screen. Expo Go is only a temporary peek, not the daily player.

This repo is public. Do not commit movies, child photos, character art, PINs, or keystores.

## On the Samsung tablet

1. Settings → **About tablet** → **Software information**.
2. Tap **Build number** **seven** times (unlock with the tablet PIN if asked).
3. Back to Settings. Open **Developer options** (near the bottom).
4. Turn on **USB debugging** (and **USB debugging (Security settings)** if shown).
5. Plug into the PC with a **data** USB cable. Set USB to **File transfer / MTP**.
6. On the tablet, tap **Allow** USB debugging. Check **Always allow from this computer**.
7. To install an APK from Files later, allow **Install unknown apps** for that source.

Confirm on the PC:

```bat
adb devices
```

The tablet should list as `device`, not `unauthorized` and not empty.

## On the Windows PC

1. Install [Node.js LTS](https://nodejs.org/) and [Android Studio](https://developer.android.com/studio) (SDK + platform-tools). Accept the Android SDK licenses in Studio.
2. Pull and install:

   ```bat
   git clone https://github.com/Landstanda/MoviEdu.git
   cd MoviEdu
   git pull
   npm install
   ```

3. Plug in the tablet, then:

   ```bat
   npx expo run:android --device
   ```

   First run generates `android/` (not in git), compiles a debug APK, and installs **MoviEdu**. Later JS-only tweaks: `npx expo start` with that debug app already on the tablet. Native plugin changes need another `npx expo run:android --device`.

4. Convert movies to **MP4, H.264 + AAC** if playback fails. Do not assume MKV will play.

### Linux (x86_64 only)

Same commands as above (`adb` / `npx expo run:android --device`). Set `ANDROID_HOME` to the SDK (often `%LOCALAPPDATA%\Android\Sdk` on Windows, `~/Android/Sdk` on Linux).

ARM64 Linux (for example an Orange Pi) **cannot** produce this APK: Google’s NDK and CMake are x86_64. Use the Windows desktop.

## Parent PIN

First tap of the **gear** (upper right on the library or player chrome) creates digits for the parent area. Use a code the child does **not** know (not the tablet lock PIN).

## First sitting

1. Gear → **Play** → Import movie (copies into the app; large files take a while)
2. Gear → **Words** — bundled `start-here` flashcards (`bag.png`, `cat.png`, …) seed on first launch. Add extra words with pictures if you want. Landscape list is two columns. New Comfy batches: [tools/comfy/README.md](tools/comfy/README.md).
3. Schedule: **20s** interval while testing, **10 min** for real use
4. The app **opens the last movie on launch** and starts playing. Countdown → spell → movie resumes at the same second. Library is still there if you need to pick a different file.

## Release APK (later)

```bat
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```

Keep the keystore **off GitHub**. Sideload with `adb install` or copy the APK onto the tablet and open it.
