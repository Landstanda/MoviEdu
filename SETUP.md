# MoviEdu setup

## Try it from a Windows PC (no Apple $99)

Windows cannot compile an iPad app. Use **Expo Go** for a UI trial:

1. Install Node.js LTS.
2. `npm install` then `npm run start:go`
3. iPad: App Store → Expo Go → scan the QR code (same Wi‑Fi).

Convert movies to **MP4, H.264 + AAC** before import. VLC’s MKV files will not play.

## Standalone iPad app (own icon)

Needs a paid [Apple Developer Program](https://developer.apple.com/programs/) account. Cloud Macs (EAS) can then produce an `.ipa`. A free Apple ID 7-day sideload requires Xcode on a Mac.

```bash
npm install
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform ios --profile development
```

Install the `.ipa` with a Mac, Apple Configurator, or similar. Then day-to-day JS updates:

```bash
npx expo start --dev-client
```

## Parent PIN

First tap of **PIN** creates digits for the parent area. Use a code the child does not know.

## First sitting

1. PIN → Sitting → Import movie (MP4)
2. PIN → Words → add words with pictures
3. Schedule: **20s** interval while testing, **10 min** for real use
4. Open the movie and try a lesson
