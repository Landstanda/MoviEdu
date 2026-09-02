# MoviEdu — v1 spec

**Status:** v1 spec locked. Implementation started 2026-08-28.  
**Date:** 2026-08-28  
**Audience:** Parent / builder  
**Target:** One physical iPad. Sideloaded. Not App Store.  
**Dev:** Windows or Linux for JavaScript. iOS Simulator / Xcode if a capable Mac exists. Standalone iPad install needs a paid Apple Developer account + EAS (cloud Mac). Expo Go can trial the UI without that.

This GitHub repo is public. Keep movies, photos, character likeness, and secrets out of git. Theme / character assets stay in gitignored `theme/private/`. No network required at runtime.

---

## 1. Why this exists

Some kids will watch the same movie for hours and fight any attempt to take the screen away. MoviEdu does not fight the movie. It **rents** it: the player should feel like the video app they already use (VLC-like), and spelling is the predictable price of continuing playback.

Adults sit with the child at first and teach the pattern. At night, the parent can cap remaining lessons so the movie can play through for sleep.

v1 is a plain, high-contrast UI (no character art). Optional movie-themed packs are **v2** and must not be committed to a public repo.

---

## 2. Product in one sentence

A VLC-like, offline iPad player for a parent-imported movie that warns, then runs a keyboard spelling trial, then returns to the movie — with parent settings for timing, how the video yields to the lesson, and logs.

---

## 3. Success criteria (v1)

No network. A parent can:

1. Convert the movie if needed (MKV → iPad-safe MP4) and import it.
2. Add ~10 words, each with an image.
3. Set interval, countdown length, questions per interrupt, sitting cap, and interrupt style.
4. Hand him the iPad. He opens this app (VLC-like library / the movie) instead of VLC.
5. Visible countdown (length = parent setting) before the lesson.
6. He spells with the custom QWERTY pad. Correct letters fill in. Success uses the short celebration, then the movie continues.
7. If he leaves the app mid-lesson and comes back, **he is still on that lesson** — the movie does not start over and the question is not skipped.
8. Trial is logged.
9. Parent settings sit behind a **PIN the child does not know** (not the iPad unlock PIN — he already knows that).

---

## 4. In scope vs out of scope

### v1 — in scope

| # | Feature | Locked behavior |
|---|---------|-----------------|
| 1 | Local video import | Files picker. Copy into app sandbox. Parent-facing error if the file will not play. |
| 2 | VLC-like player | Dark chrome. **Timeline/slider is the primary control** (how he actually scrubs). Play/pause + skip as in VLC. Persist position per file. When chrome is visible: **time until next lesson** (upper right) and **Start lesson now** under it. |
| 3 | Timed lesson gate | After T minutes of **actual playback** (pauses do not count). Visible countdown N seconds (parent setting). Never a surprise cut. Interval slider minimum **20 seconds** for testing. |
| 4 | Three interrupt styles | Parent setting. See §6.3. All in-app; **not** iOS system Picture-in-Picture. |
| 5 | Spelling prompt | Picture (required) + spoken word (iOS TTS). English. Uppercase letters. |
| 6 | Word introduction | New words show a black-and-white / outline of the word. Correct key → that letter animates and fills with color. After a couple of successes, the outline goes away and he spells from the picture + speech only. |
| 7 | Custom keyboard | Large QWERTY (AAC-style big keys). Not the system iPad keyboard. |
| 8 | Wrong letter | Horizontal wiggle + “try again.” After 2 misses on that letter, the correct key briefly lights up. He stays on the same word. Adults help if he is stuck. **No automatic “easier word” swap.** |
| 9 | Success | Last letter correct → word expands briefly → lesson fades into the movie → word pops and vanishes, leaving only the movie. About 0.5s celebrate + short fade. Same every time. |
| 10 | Multi-question | Default **1** word then movie. Parent can raise Q. If Q > 1, show **“1 of 2”** (etc.) upper left. |
| 11 | Sitting cap | Parent sets how many lesson gates remain this sitting (e.g. “two more, then it just plays” at bedtime). |
| 12 | Parent mode | Small control, upper right, with player chrome. **App PIN**, not device passcode. |
| 13 | Words | Parent enters word + image. Video clip per word is later. |
| 14 | SRS | Simple next-due + ease. Mostly review of emerging words + one slightly new word. Introduction outline is part of “new.” |
| 15 | Skip / end / remaining count | Parent-only. |
| 16 | Logs | Timestamp, word, wrong-letter count, fails, time to correct, input_mode (`keyboard`). Export CSV via Share Sheet. |
| 17 | App switch safety | Background / swipe away / kill: restore **lesson-in-progress** or **exact movie time**, never restart the movie from zero, never dismiss an unanswered trial. |

### v1 — out of scope

- Finger/stylus handwriting (v2)
- Character / movie-likeness theme packs (v2; gitignored)
- Guided Access (optional; not required for v1)
- App Store, accounts, cloud sync, analytics
- Playing MKV/AVI inside the app (convert first — see §10.5)
- Hijacking VLC process-for-process (iOS cannot make us “be VLC”; we replace the habit — see §10.7)
- Network required for the child loop

### v2 (named)

- Optional themed packs (v2; gitignored private assets)
- Character saying the word (GIF / short clip) and/or a recorded / cloned voice
- Word **video** as well as still image
- Pencil / finger writing
- Public generic theme if this ever leaves the family

---

## 5. Users and modes

```
┌─────────────────────────────────────────────┐
│                 CHILD MODE                   │
│  VLC-like library + full-screen movie        │
│  Countdown → spelling trial → movie          │
│  No settings, no skip, no parent PIN prompt  │
└─────────────────────────────────────────────┘
                      │
         small button (only while controls are visible)
                      ▼
┌─────────────────────────────────────────────┐
│                PARENT MODE                   │
│  App PIN the child does not know             │
│  Words, schedule, interrupt style, logs      │
└─────────────────────────────────────────────┘
```

**Containment (updated):** We are **not** relying on Guided Access. He does not yet know how to turn apps off. The real risk we still handle in software:

- Swiping up / switching apps / locking the iPad **must not** clear the trial or restart the movie.
- The lesson overlay has no close button.
- Parent controls are PIN-gated with a PIN that is **not** the iPad unlock code (he already knows that one).

Adults will be with him at first. If he is stuck on a word, he comes to them — same as troubleshooting today.

---

## 6. Child experience (the loop)

Predictable and identical: same timings (for a given parent config), same voice, same animation, same button places.

### 6.1 Opening the movie (VLC muscle memory)

- App home looks like a **simple VLC-style file list** (dark, orange-cone-adjacent chrome without copying trademarked cone art if we can avoid it — dark player + orange accents is enough).
- One tap on his imported movie goes full screen, like tapping a title in VLC.
- Player controls modeled on **VLC for iOS**. The **timeline/slider is the control that matters most** (that is how he scrubs). Also play/pause and ±10s skip. Auto-hide; tap to show.
- While chrome is visible, **upper right**:
  - a timer counting down until the next lesson
  - **Start lesson now** under it (he can interrupt himself)
  - a small parent lock button
- Playback position saved ~every second and on pause / background / lesson start.

We cannot make iOS silently launch us instead of VLC when he taps a file inside VLC. Practical replacement:

1. Import the (converted) movie into MoviEdu.
2. Put MoviEdu where he looks for the movie (home screen / dock).
3. Parent removes or buries the VLC icon.
4. Optionally register as a viewer for movie files so Files → Open In works.

### 6.2 Countdown (never a surprise)

- Parent sets **N** (seconds of warning). Default **30**.
- Movie keeps playing during countdown (unless already in a paused interrupt — countdown happens *before* the interrupt).
- Same visual every time (large number). No jump-cut.

### 6.3 Interrupt style (parent setting — all three in v1)

These are **in-app**. We will not use iOS system Picture-in-Picture (a floating system window).

| ID | Name in parent UI | What the child sees |
|----|-------------------|---------------------|
| `pause_hidden` | Pause and hide | Movie **pauses**. Volume + picture fade out until the lesson is full screen. On success, fade back and **resume the exact pause time**. |
| `pip_paused` | Mini window, paused | Movie shrinks to a corner **and pauses**. Lesson uses the rest of the screen. On success, expand and resume that timestamp. |
| `pip_playing_muted` | Mini window, still playing | Movie shrinks to a corner and **keeps playing**. Audio fades to mute so the lesson can talk. On success, expand and **continue from wherever the mini player has reached** (the movie did not freeze). |

Factory default: `pause_hidden` (the movie stops and the lesson takes the whole screen). Change it anytime in parent settings — all three ship in v1.

**What “default interrupt” means (layman):** it is only which of those three ways the lesson appears **until you pick a different one**. It is not a separate feature. You can switch between “hide the movie,” “tiny paused movie in the corner,” and “tiny movie still playing with sound off.”

### 6.4 The trial — “Spell ____”

**Always**

- One task on screen (if Q > 1, a small “1 of 2” in the upper left is the only extra).
- Parent-supplied **image** for the word.
- iPad **speaks** the word (system TTS; voice chosen in parent settings once, then left alone).
- Custom **uppercase QWERTY** pad (large keys, AAC-style). Screenshot can tune spacing later. Until then: letters A–Z only, large QWERTY.

**When the word is new (outline stage)**  
Default: outline stays until **2 consecutive correct** spellings of that word (parent-tunable later if needed).

- Picture + the **whole word** shown in black-and-white / outline.
- He spells in order. Each **correct** key: that letter does a short, identical action and **fills with color**.
- Wrong key: that key **wiggles horizontally**, TTS “Try again.” After **2** misses on the same next letter, the correct key **briefly lights up**, then he continues. No word swap.

**After he has it (from-scratch stage)**

- Picture + spoken word only. **No outline / no example spelling.**
- Empty **letter boxes**, one per letter, fill as he types correctly — still no “answer key” painted in advance.
- Same wiggle / try-again / light-up-after-2-misses rules.

**Stuck:** overlay stays. Parent PIN → skip trial or end lessons. He is expected to fetch an adult, as he already does.

### 6.5 Success → movie

1. Last letter is correct.
2. The **completed word expands** momentarily.
3. Lesson **fades** into the full-screen movie (or expanding mini-player).
4. The word **pops and disappears**, leaving only the movie.
5. Total about **0.5s** celebration + a short fade. Identical every trial.

v2 may fade through a themed beat before the movie. v1 is plain: word → movie.

### 6.6 Sitting cap (bedtime)

Parent sets **remaining lessons this sitting** (including 0 = free play).  
Example: at night, set remaining to 1 or 2, then the movie plays through like tonight already does.

A sitting ends when remaining hits 0, or the parent starts a new sitting (resets the remaining count). Not a calendar-day rollover.

### 6.7 Leaving the app mid-lesson

Persist to disk:

- `active_trial` (word id, letters so far, miss counts, Q index, outline vs scratch)
- `playback_time` / whether mini-player was advancing
- `remaining_lessons`

On next launch: **show the same trial**, do not auto-play past it, do not reset the movie to 0:00.

---

## 7. Parent / therapist mode

**Entry:** Upper-right control, only with player chrome. **Numeric app PIN** (set by parent, stored in Keychain). Not Face ID / not the iPad passcode — he already knows those.

**Screens**

1. **Now playing** — skip this trial, end sitting (free play), set remaining lessons.
2. **Library** — import / delete movie files, storage warning.
3. **Words** — word text, required image, enabled flag. (Video later.)
4. **Schedule**
   - Interval T (minutes of the clock we use in §16 Q-interval)
   - Countdown N (seconds)
   - Questions per interrupt Q (default 1)
   - Remaining lessons this sitting
   - Interrupt style (the three modes in §6.3)
   - TTS voice picker (installed English iOS voices)
5. **Learning** — new / emerging / proficient; outline vs from-scratch.
6. **Logs** — history + export CSV.
7. **Run test trial** — fire a lesson now (so we do not wait T to check UI).

Interval T can be set as low as **20 seconds** so we can test without watching 10 minutes of film. That is not a secret “debug mode”; it is the same slider. Use ~10 minutes when he is actually using it.

---

## 8. Learning design (SRS-ish)

### 8.1 Word state

- `status`: `new` | `emerging` | `proficient`
- `prompt_mode`: `outline` | `from_scratch` (outline until 2 consecutive correct, then from_scratch)
- `ease`, `interval_days`, `next_due_at`
- `consecutive_correct`, `consecutive_wrong`
- `image_uri`
- `enabled`

### 8.2 Session mix

- Default Q = 1
- Prefer due / emerging review
- At most one **new** (outline) word per interrupt
- Adults pre-teach easy words before leaving him alone

### 8.3 Promotion (starting point, tunable)

- 2 consecutive correct → drop outline (`from_scratch`)
- Further consecutive correct → `emerging` then `proficient` with expanding review intervals (1d → 3d → 7d → 14d → 30d)
- A trial that needed many letter-misses can hold him in `emerging` (do not promote on a messy pass)
- **No auto-demote to a different word** in the same interrupt

### 8.4 What we will not do in v1

- Randomized praise, streaks, mood-based timing
- Character that reacts differently each time
- Automatic easier-word substitution

---

## 9. Accessibility / autism-specific UX

- High contrast, low clutter, one task
- Same layout / voice / celebration every time
- No surprise pause (countdown always)
- Large keys, uppercase
- No system keyboard (no autocorrect, emoji, globe, dictation)
- Resume after success feels almost instant
- Color fill is extra; outline and picture must still work if color is ignored
- Lesson cannot be dismissed by tapping the video

---

## 10. Technical plan

### 10.1 Framework: Expo (React Native) + development build

iOS-only. **Expo dev client** (not Expo Go), because we need file import, audio session, and a custom player overlay.

| Option | Role |
|--------|------|
| **Expo + EAS** | Default. Orange Pi edits JS/TS; cloud Mac produces `.ipa`. |
| Old MacBook | Install `.ipa` / Xcode Devices / first trust of the developer cert. Simulator only if the Mac can still run a recent Xcode. |
| Flutter / native Swift | Not v1 unless expo-video cannot fade + PiP overlay cleanly. |

### 10.2 There is no useful “iOS Simulator in the cloud”

Cloud Macs (EAS, GitHub Actions) **compile** the app. They do not give you a clickable iPad you drive in the browser.

**How we actually iterate UI**

1. EAS builds a **development** `.ipa` once (needs paid Apple Developer — §11).
2. Install that on the physical iPad (MacBook).
3. Orange Pi runs the Expo bundler on the home network.
4. The iPad loads JS from the Pi — **hot reload** for layout, keyboard, overlays — without rebuilding native every time.
5. Native changes (audio session, player quirks) need another EAS/Mac build.

The old MacBook’s Simulator is optional. The **physical iPad is the source of truth** (VLC feel, speakers, mute switch, swipe-away).

### 10.3 Player rules

- Keep the player **mounted** under overlays. Do not tear it down for a lesson.
- `pause_hidden` / `pip_paused`: store `currentTime`, seek + play on success.
- `pip_playing_muted`: leave it playing, fade volume to 0, restore volume on success (time has advanced).
- Audio session: **playback** category so the movie still plays if the **hardware mute switch** is on. Fade/duck during TTS.
- Keep screen awake while playing.

### 10.4 Likely libraries

| Need | Tool |
|------|------|
| Video | `expo-video` |
| Import | `expo-document-picker` + `expo-file-system` |
| Speech | `expo-speech` (iOS `AVSpeechSynthesizer`) |
| Parent PIN | `expo-secure-store` |
| Data | `expo-sqlite` (words, SRS, logs, settings, trial-in-progress) |
| Keep awake | `expo-keep-awake` |
| Export | `expo-sharing` |

### 10.5 Video format (MKV)

**VLC plays MKV. Apple’s player does not.** MoviEdu uses the iPad’s built-in player (AVPlayer). A “weird” MKV/AVI will import and then sit on a black screen.

**Parent action (once):** convert in HandBrake (or similar) to **MP4, H.264 + AAC**. Then import that file.

On import we probe duration; if iOS rejects the file, show: “This file can’t play on iPad. Convert it to MP4 (H.264) and try again.” Copying a feature film **duplicates** several GB — warn about free space.

### 10.6 Apple text-to-speech (how it actually works)

Layman: the iPad already contains voices. We send it the letters of the word; it reads them aloud. That is **not** a movie-character voice, and Apple does not let us paste one in.

| What you can do in v1 | What you cannot |
|----------------------|-----------------|
| Pick any **English voice installed on the iPad** (Settings → Accessibility → Spoken Content → Voices, plus our in-app picker) | Use a copyrighted character voice via Apple TTS |
| Same voice every trial | Clone a character by typing his name |
| Later (v2): play a **recorded** clip per word, or a clip from a local voice model | Stream a cloud voice-clone at runtime (we are offline-first anyway) |

Premium / “Enhanced” voices: parent may need to **download** them once on the iPad (Wi‑Fi). After that, airplane mode is fine.

### 10.7 “Open instead of VLC”

iOS has no “always use this app instead of VLC” switch that steals VLC’s library. We replace the **habit**: MoviEdu *looks* like his player and *holds* the movie. Registering `public.movie` / `public.mpeg-4` document types is a bonus for Files.

### 10.8 Architecture

```
App
├── LibraryScreen         (VLC-like list of imported files)
├── PlayerScreen          (player stays mounted during trials)
│   ├── VideoSurface
│   ├── VlcChrome         (play/pause, ±10s, timeline, parent button)
│   ├── CountdownOverlay
│   └── LessonOverlay     (image, outline/slots, QWERTY, optional mini-player)
├── ParentStack           (PIN)
│   ├── Sitting / skip
│   ├── Words + images
│   ├── Schedule + interrupt style + TTS voice
│   └── Logs + export
└── stores (SQLite)
    ├── media, positions
    ├── words + SRS + prompt_mode
    ├── settings
    ├── active_trial
    └── trial log
```

### 10.9 Theme isolation

v1 UI is generic high-contrast + VLC-like dark player.  
`theme/private/` is gitignored for v2 character art / clips. Engine never hard-codes a franchise into logic.

---

## 11. Signing — you do need the paid Apple account

A **free** Apple ID signs apps for about **7 days**, then the icon dies. That is unacceptable for his movie iPad.

**Buy:** [Apple Developer Program](https://developer.apple.com/programs/) (~$99/year).  
Register this iPad’s **UDID**. Enable **Developer Mode** on the iPad. Use **ad-hoc** (or development) profiles.

You can **write code** before the account exists. You **cannot** put a lasting build on the iPad without it. EAS will also need that account (or an Apple “App Store Connect API key”) to sign.

**Install path we are aiming for**

1. EAS → signed `.ipa`
2. Old MacBook: Xcode → Window → Devices, or Apple Configurator, drop the `.ipa` on the iPad
3. Trust the developer in iPad Settings

Linux `ideviceinstaller` is a bonus, not the plan.

---

## 12. Implementation order

| Step | Build | Done when |
|------|--------|-----------|
| 1 | Import + VLC-like player + position restore | MP4 plays; kill app; reopen at same second. |
| 2 | Timed gate + countdown + **three** interrupt styles + resume/continue | Parent can switch modes; times are correct. |
| 3 | Keyboard trial + outline/color-fill + wiggle/light-up + success animation | Including swipe-away restore. |
| 4 | Parent PIN, all settings, sitting cap, “1 of Q”, logs, test trial | |
| 5 | SRS + outline→from_scratch after 2 successes | |
| 6 | Chrome pass vs real VLC screenshots (his device) | |
| 7 | Theme + handwriting | v2 |

---

## 13. Locked defaults

| Setting | Default |
|---------|---------|
| Theme | Plain. Optional private theme pack in v2 |
| Language | English, uppercase |
| Interval T | 10 minutes of **playback time** (pauses do not count). Parent slider; minimum **20 seconds** for testing. |
| Countdown N | 30 seconds (parent) |
| Q | 1 (parent can raise; then “1 of Q”) |
| Interrupt style | `pause_hidden` |
| Sitting remaining | Parent-set; 0 = free play |
| Outline stage | Until 2 consecutive correct |
| Keyboard | Large QWERTY; refine from a screenshot if needed |
| Fail | Wiggle + “try again”; light correct key after 2 misses; stay on word |
| Success | Word expands → fade to movie → word pops away (~0.5s) |
| TTS | iOS built-in; parent picks voice later |
| Parent lock | App PIN ≠ iPad PIN |
| Guided Access | Off |
| Audio | Plays even if mute switch is on |
| Repo | Public GitHub; `theme/private/` gitignored |

---

## 14. Risks (updated)

**Still real**

1. **Resume / continue must not hitch.** Black frame or 0:00 restart will feel like a broken VLC.
2. **MKV will not play** until converted. VLC hid this problem; we will not.
3. **Swipe away mid-trial** — must restore the question. This replaces Guided Access as the #1 product risk.
4. **Device PIN is not a parent lock.** App PIN is mandatory.
5. **Cannot steal VLC’s open action.** Habit + icon placement + burying VLC.
6. **No local Mac for Xcode.** Standalone iPad install needs paid Apple Developer + EAS, or Expo Go for a UI trial from Windows.
7. **Mute switch / audio session.**
8. **Huge file copy** into the sandbox.
9. **expo-video + fade + mini-player** may need a small native AVPlayer wrapper after step 2.
10. **Character voice is not TTS.** Do not promise a movie-character voice in v1.
11. **Keyboard screenshot missing** — generic large QWERTY until a reference image is added locally (do not commit photos of a child).

**Dropped (your call)**

- Designing against app-switching / force-quit as a “beat the gate” strategy (he cannot turn apps off yet). Still persist state anyway.
- Guided Access as a requirement.
- Automatic easier-word fallback (adults + pre-taught easy words).

---

## 15. Decisions log (from review)

| Topic | Decision |
|-------|----------|
| Beating the app | Not a concern; the “cheat” is spelling. Persist state anyway. |
| Interrupt | All three styles, parent setting. |
| Countdown | Parent setting. |
| Simulator | Expo Go on iPad from Windows for UI trial; EAS + paid Apple for a standalone icon. |
| Keyboard | Custom, large QWERTY. |
| Theme v1 | Plain. Private theme pack later (gitignored). |
| Guided Access | No. |
| Swipe away | Resume the **question**, never restart the movie. |
| Format | Convert if MKV; import MP4. |
| Theme files | gitignore private pack. |
| Teaching | Adults present at first; outline word then fade the hint. |
| Success motion | Word expands, fade to movie, pop away (~0.5s). |
| Q | Default 1; counter if Q > 1. |
| Player to copy | VLC. |
| PiP | Three parent options (hide / paused mini / playing muted mini). |
| Speech | iOS TTS now; pick voice later; character voice is v2. |
| Stuck | Fetch an adult; parent skip. |
| Sitting cap | Per sitting (bedtime free play). |
| Word media | Image now; video later. |
| Parent lock | Not Guided Access; not device PIN. |
| Builds | EAS primary; old Mac for install. |
| Developer account | Will buy. Required to install. |
| Which iPad | Movie iPad; replace VLC habit. |
| Case | Uppercase. |
| Language | English. |
| Repo | Private. |

---

## 16. Still needed from you (not code)

1. **Apple Developer Program** (~$99/year) + this iPad’s UDID + Developer Mode on. Required to install.
2. **Convert the movie** to MP4 (H.264 + AAC) if it is MKV.
3. Optional keyboard screenshot (keep out of git if it shows a child).
4. **VLC controls screenshot** → `docs/vlc-controls.png` so we can match the slider.
5. **Old MacBook:** macOS version / whether Xcode or Apple Configurator will install.
6. Parent **PIN** you will actually use (you set it in-app on first parent unlock).

---

## 17. Build status

v1 code is in this repo (Expo SDK 57). Not yet on the iPad — that waits on Apple Developer + EAS + MacBook install. See `SETUP.md`.

---

## 18. Document history

| Date | Change |
|------|--------|
| 2026-08-28 | Initial plan from product brief |
| 2026-08-28 | Locked v1 spec from parent review: VLC, three interrupt styles, outline spelling, no Guided Access, TTS, EAS, sitting cap, leftover confirms only |
| 2026-08-28 | Playback-time interval; 20s min; chrome lesson timer + Start lesson now; empty boxes; slider-first VLC; build started |
