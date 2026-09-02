# MoviEdu

An **offline iPad video player** with a spelling lesson gate. A parent imports a local movie. After a set amount of *playback* time, the app warns, then asks the child to spell a word (picture + spoken word + large QWERTY keyboard). When the word is correct, the movie continues from the same second.

It is meant to look and feel like a simple **VLC-style** player (dark chrome, timeline/slider first). It is **not** an App Store product. There are no accounts and no network required while watching.

Full product spec: [PLAN.md](PLAN.md). Device install notes: [SETUP.md](SETUP.md).

## What it does

- Import MP4 files into the app (Apple’s player does **not** play MKV; convert first)
- Remember playback position per file
- Lesson interval counts only while the movie is actually playing (pauses do not count)
- Visible countdown before a lesson (never a surprise cut)
- Optional **Start lesson now** on the player chrome
- Three ways the movie yields to the lesson (hide / paused mini-window / mini-window still playing, muted)
- New words show an outline; after a couple of successes, empty letter boxes
- Parent area behind an **app PIN** (not the iPad unlock code): words, pictures, timing, sitting cap, logs

## Current limitation: Windows cannot put a custom iOS app on an iPad by itself

Apple only lets you compile a real iPad app on a Mac (or a cloud Mac). This machine/Windows PC **cannot** run Xcode.

**Free way to try the UI on an iPad from Windows**

1. Install [Node.js LTS](https://nodejs.org/) on the Windows PC.
2. Clone this repo, then in the project folder:

   ```bat
   npm install
   npm run start:go
   ```

3. On the iPad, install **Expo Go** from the App Store.
4. Scan the QR code (Camera app or Expo Go). Same Wi‑Fi helps.

That runs MoviEdu *inside Expo Go*, not as its own home-screen icon. Good enough to try import, slider, 20-second test interval, and spelling. It is **not** a VLC replacement for daily use.

**Standalone app on the iPad** (own icon, year-long install) needs a paid [Apple Developer Program](https://developer.apple.com/programs/) membership (~$99/year) and a cloud iOS build (EAS). A free Apple ID 7-day install needs Xcode on a Mac we no longer have. Details: [SETUP.md](SETUP.md).

## Repo notes

This GitHub repo is **public**. Do not commit movies, word photos of a real child, theme/character art, PINs, `.p8` / `.mobileprovision` files, or Apple certificates. Private theme files belong in `theme/private/` (gitignored).
