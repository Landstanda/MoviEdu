# MoviEdu

An **offline Android tablet** video player with a spelling lesson gate. A parent imports a local movie. After a set amount of *playback* time, the app warns, then asks the child to spell a word (picture + spoken word + large QWERTY keyboard). When the word is correct, the movie continues from the same second.

It should look and feel like a simple **VLC-style** player (dark chrome, timeline/slider first). Not a store product. No accounts. No network required while watching.

**Ship on one Android tablet** as a sideloaded APK (not Play Store). Build from a **Windows** (or x86_64 Linux) PC with Android Studio and USB debugging: `npx expo run:android --device`.

Full product spec: [PLAN.md](PLAN.md). Install: [SETUP.md](SETUP.md).

## What it does

- Import video into the app sandbox (prefer MP4 H.264 + AAC; clear error if the file will not play)
- Remember playback position per file
- Lesson interval counts only while the movie is actually playing (pauses do not count)
- Visible countdown before a lesson (never a surprise cut)
- **Start lesson now** on the player chrome, plus a timer until the next lesson
- Three ways the movie yields to the lesson (hide / paused mini-window / mini-window still playing, muted)
- New words show an outline; after a couple of successes, empty letter boxes
- Parent area behind an **app PIN** (not the tablet lock screen): words, pictures, timing, sitting cap, logs

## Build

Expo SDK 57 / React Native. Product code is in `src/` and `App.tsx`. The daily player is a **standalone debug or release APK** on the tablet (`app.moviedu.kid`), not Expo Go.

```bat
git pull
npm install
npx expo run:android --device
```

That generates `android/` on the PC (gitignored), compiles, and installs. After that, JS-only changes can use `npx expo start` against the app already on the tablet.

## Why iOS files are still in the repo

This started as an iPad project. Apple Developer signup failed, so **iOS is abandoned** and we do not sign, build `.ipa`, or use EAS iOS. Some Expo config and comments still mention iOS because the shared codebase was never rewritten from scratch. Ignore them; Android is the product.

## Repo notes

This GitHub repo is **public**. Do not commit movies, word photos of a real child, theme/character art, PINs, or signing keystores. Private theme files belong in `theme/private/` (gitignored).
