import { useEvent, useEventListener } from 'expo';
import { useKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoView } from 'expo-video';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { insertLog } from '../db/logs';
import { getMedia, saveMediaPosition, setLastPlayedMediaId } from '../db/media';
import { loadSettings, patchSettings } from '../db/settings';
import { loadActiveTrial, loadGateProgress, saveActiveTrial, saveGateProgress } from '../db/trial';
import { listWords } from '../db/words';
import { LessonOverlay } from '../components/LessonOverlay';
import { VlcChrome } from '../components/VlcChrome';
import { pickNextWord, recordIncomplete, recordSuccess } from '../srs';
import { speakText, stopSpeech } from '../speech';
import { colors } from '../theme';
import type { ActiveTrial, MediaFile, Settings, Word } from '../types';
import { UNPLAYABLE_FILE_MESSAGE } from '../probeVideo';

export type PlayerHandle = {
  skipTrial: () => void;
  endSitting: () => void;
  runTestTrial: () => void;
  reloadSettings: () => void;
  onHardwareBack: () => void;
};

type Props = {
  mediaId: string;
  onLibrary: () => void;
  onParent: () => void;
};

type Phase = 'watch' | 'warning' | 'lesson' | 'success';

function fadeVolume(player: { volume: number; muted: boolean }, to: number, ms: number) {
  const from = player.volume;
  const start = Date.now();
  const step = () => {
    const t = Math.min(1, (Date.now() - start) / ms);
    player.volume = from + (to - from) * t;
    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }
    player.volume = to;
    if (to <= 0.001) {
      player.muted = true;
    }
  };
  requestAnimationFrame(step);
}

export const PlayerScreen = forwardRef<PlayerHandle, Props>(function PlayerScreen(
  { mediaId, onLibrary, onParent },
  ref,
) {
  const [media, setMedia] = useState<MediaFile | null>(null);

  useEffect(() => {
    getMedia(mediaId).then(setMedia);
  }, [mediaId]);

  if (!media) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  return <PlayerInner ref={ref} media={media} onLibrary={onLibrary} onParent={onParent} />;
});

const PlayerInner = forwardRef<PlayerHandle, { media: MediaFile; onLibrary: () => void; onParent: () => void }>(
  function PlayerInner({ media, onLibrary, onParent }, ref) {
    useKeepAwake();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [phase, setPhase] = useState<Phase>('watch');
    const [trial, setTrial] = useState<ActiveTrial | null>(null);
    const [chromeOn, setChromeOn] = useState(true);
    const [pip, setPip] = useState(false);
    const [videoHidden, setVideoHidden] = useState(false);
    const [hintLetter, setHintLetter] = useState<string | null>(null);
    const [wiggleLetter, setWiggleLetter] = useState<string | null>(null);
    const [wiggleNonce, setWiggleNonce] = useState(0);
    const [correctLetter, setCorrectLetter] = useState<string | null>(null);
    const [correctNonce, setCorrectNonce] = useState(0);
    const [playAccum, setPlayAccum] = useState(0);
    const [displayTime, setDisplayTime] = useState(media.positionSec);
    const [duration, setDuration] = useState(media.durationSec ?? 0);
    const [playError, setPlayError] = useState<string | null>(null);

    const playAccumRef = useRef(0);
    const lastTimeRef = useRef<number | null>(null);
    const scrubbingRef = useRef(false);
    const restoredRef = useRef(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const phaseRef = useRef<Phase>('watch');
    const trialRef = useRef<ActiveTrial | null>(null);
    const settingsRef = useRef<Settings | null>(null);
    const wordsCache = useRef<Word[]>([]);

    phaseRef.current = phase;
    trialRef.current = trial;
    settingsRef.current = settings;

    const player = useVideoPlayer({ uri: media.fileUri }, (p) => {
      p.timeUpdateEventInterval = 0.25;
      p.audioMixingMode = 'mixWithOthers';
      p.muted = false;
      p.volume = 1;
      p.keepScreenOnWhilePlaying = true;
    });

    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

    const persistPosition = useCallback(async () => {
      const t = player.currentTime;
      const d = player.duration;
      setDisplayTime(t);
      if (d && d > 0) setDuration(d);
      await saveMediaPosition(media.id, t, d && d > 0 ? d : null);
      await saveGateProgress(media.id, playAccumRef.current);
    }, [media.id, player]);

    const persistTrial = useCallback(async (next: ActiveTrial | null) => {
      trialRef.current = next;
      setTrial(next);
      await saveActiveTrial(next);
    }, []);

    const applyInterrupt = useCallback(
      (style: Settings['interruptStyle']) => {
        if (style === 'pause_hidden') {
          player.pause();
          fadeVolume(player, 0, 700);
          setPip(false);
          setVideoHidden(true);
        } else if (style === 'pip_paused') {
          player.pause();
          fadeVolume(player, 0, 500);
          setVideoHidden(false);
          setPip(true);
        } else {
          fadeVolume(player, 0, 500);
          setVideoHidden(false);
          setPip(true);
        }
      },
      [player],
    );

    const restoreMovie = useCallback(
      (style: Settings['interruptStyle'], pauseAt: number | null) => {
        setPip(false);
        setVideoHidden(false);
        player.muted = false;
        player.volume = 1;
        if (style !== 'pip_playing_muted' && pauseAt != null) {
          player.currentTime = pauseAt;
        }
        player.play();
      },
      [player],
    );

    const beginLesson = useCallback(
      async (force: boolean) => {
        const s = settingsRef.current;
        if (!s) return;
        if (!force && s.remainingLessons <= 0) return;
        if (phaseRef.current === 'lesson' || phaseRef.current === 'success') return;

        const words = await listWords();
        wordsCache.current = words;
        const used: string[] = [];
        const first = pickNextWord(words, used);
        const pauseAt = player.currentTime;
        player.pause();

        if (!first) {
          const empty: ActiveTrial = {
            mediaId: media.id,
            wordId: '',
            word: '',
            imageUri: null,
            promptMode: 'outline',
            filledCount: 0,
            missOnCurrent: 0,
            wrongLetterCount: 0,
            fails: 0,
            questionIndex: 0,
            questionTotal: s.questionsPerInterrupt,
            startedAt: Date.now(),
            usedWordIds: [],
            pauseAtSec: pauseAt,
          };
          await persistTrial(empty);
          setPhase('lesson');
          applyInterrupt(s.interruptStyle);
          speakText('Ask an adult for a word', s.ttsVoiceId);
          return;
        }

        const next: ActiveTrial = {
          mediaId: media.id,
          wordId: first.id,
          word: first.word,
          imageUri: first.imageUri,
          promptMode: first.promptMode,
          filledCount: 0,
          missOnCurrent: 0,
          wrongLetterCount: 0,
          fails: 0,
          questionIndex: 0,
          questionTotal: s.questionsPerInterrupt,
          startedAt: Date.now(),
          usedWordIds: [first.id],
          pauseAtSec: pauseAt,
        };
        await persistTrial(next);
        setPhase('lesson');
        setHintLetter(null);
        applyInterrupt(s.interruptStyle);
        if (s.interruptStyle === 'pip_playing_muted') {
          player.play();
        }
        speakText(first.word.toLowerCase(), s.ttsVoiceId);
      },
      [applyInterrupt, media.id, persistTrial, player],
    );

    const finishBackToMovie = useCallback(async () => {
      const s = settingsRef.current;
      const current = trialRef.current;
      playAccumRef.current = 0;
      lastTimeRef.current = null;
      await persistTrial(null);
      setPhase('watch');
      setHintLetter(null);
      if (s) {
        restoreMovie(s.interruptStyle, current?.pauseAtSec ?? null);
        if (s.remainingLessons > 0) {
          const remaining = Math.max(0, s.remainingLessons - 1);
          const next = await patchSettings({ remainingLessons: remaining });
          setSettings(next);
        }
      }
      await persistPosition();
    }, [persistPosition, persistTrial, restoreMovie]);

    const onWordComplete = useCallback(async () => {
      const current = trialRef.current;
      const s = settingsRef.current;
      if (!current || !s) return;
      setPhase('success');
      const word = wordsCache.current.find((w) => w.id === current.wordId);
      if (word) {
        await recordSuccess(word, s.outlineUntilCorrect);
      }
      await insertLog({
        word: current.word,
        wordId: current.wordId || null,
        wrongLetterCount: current.wrongLetterCount,
        fails: current.fails,
        timeToCorrectMs: Date.now() - current.startedAt,
        inputMode: 'keyboard',
        completed: true,
      });

      const nextIndex = current.questionIndex + 1;
      if (nextIndex < current.questionTotal) {
        const words = await listWords();
        wordsCache.current = words;
        const nxt = pickNextWord(words, current.usedWordIds);
        setTimeout(async () => {
          if (!nxt) {
            await finishBackToMovie();
            return;
          }
          const cont: ActiveTrial = {
            ...current,
            wordId: nxt.id,
            word: nxt.word,
            imageUri: nxt.imageUri,
            promptMode: nxt.promptMode,
            filledCount: 0,
            missOnCurrent: 0,
            wrongLetterCount: 0,
            fails: 0,
            questionIndex: nextIndex,
            startedAt: Date.now(),
            usedWordIds: [...current.usedWordIds, nxt.id],
          };
          await persistTrial(cont);
          setPhase('lesson');
          setHintLetter(null);
          speakText(nxt.word.toLowerCase(), s.ttsVoiceId);
        }, 520);
        return;
      }

      setTimeout(() => {
        finishBackToMovie();
      }, 520);
    }, [finishBackToMovie, persistTrial]);

    const onLetter = useCallback(
      (letter: string) => {
        const current = trialRef.current;
        const s = settingsRef.current;
        if (!current || !current.word || phaseRef.current !== 'lesson') return;
        const expected = current.word[current.filledCount];
        if (letter === expected) {
          const filled = current.filledCount + 1;
          const updated = { ...current, filledCount: filled, missOnCurrent: 0 };
          persistTrial(updated);
          setHintLetter(null);
          setCorrectLetter(letter);
          setCorrectNonce((n) => n + 1);
          if (filled >= current.word.length) {
            onWordComplete();
          }
          return;
        }
        const miss = current.missOnCurrent + 1;
        const updated = {
          ...current,
          missOnCurrent: miss,
          wrongLetterCount: current.wrongLetterCount + 1,
          fails: current.fails + 1,
        };
        persistTrial(updated);
        setWiggleLetter(letter);
        setWiggleNonce((n) => n + 1);
        speakText('Try again', s?.ttsVoiceId);
        if (miss >= 2) {
          setHintLetter(expected);
        }
      },
      [onWordComplete, persistTrial],
    );

    const skipTrial = useCallback(async () => {
      if (phaseRef.current !== 'lesson' && phaseRef.current !== 'success' && phaseRef.current !== 'warning') {
        return;
      }
      const current = trialRef.current;
      stopSpeech();
      if (current?.wordId) {
        const word = wordsCache.current.find((w) => w.id === current.wordId) ?? (await listWords()).find((w) => w.id === current.wordId);
        if (word) await recordIncomplete(word);
        await insertLog({
          word: current.word,
          wordId: current.wordId || null,
          wrongLetterCount: current.wrongLetterCount,
          fails: current.fails,
          timeToCorrectMs: null,
          inputMode: 'keyboard',
          completed: false,
        });
      }
      playAccumRef.current = 0;
      await persistTrial(null);
      setPhase('watch');
      setHintLetter(null);
      const s = settingsRef.current;
      if (s) restoreMovie(s.interruptStyle, current?.pauseAtSec ?? player.currentTime);
    }, [persistTrial, player, restoreMovie]);

    const endSitting = useCallback(async () => {
      const next = await patchSettings({ remainingLessons: 0 });
      setSettings(next);
      if (phaseRef.current === 'lesson' || phaseRef.current === 'success' || phaseRef.current === 'warning') {
        await skipTrial();
      }
    }, [skipTrial]);

    const reloadSettings = useCallback(async () => {
      setSettings(await loadSettings());
    }, []);

    useImperativeHandle(ref, () => ({
      skipTrial,
      endSitting,
      runTestTrial: () => beginLesson(true),
      reloadSettings,
      onHardwareBack: () => {
        if (phaseRef.current === 'lesson' || phaseRef.current === 'success') {
          persistPosition();
          if (trialRef.current) saveActiveTrial(trialRef.current);
          return;
        }
        persistPosition().then(() => {
          player.pause();
          onLibrary();
        });
      },
    }));

    useEffect(() => {
      let cancelled = false;
      (async () => {
        const s = await loadSettings();
        const words = await listWords();
        wordsCache.current = words;
        if (cancelled) return;
        setSettings(s);
        void setLastPlayedMediaId(media.id);
        const existing = await loadActiveTrial();
        const gate = await loadGateProgress();
        if (gate && gate.mediaId === media.id) {
          playAccumRef.current = gate.playSec;
        }
        if (existing && existing.mediaId === media.id) {
          setTrial(existing);
          setPhase('lesson');
          applyInterrupt(s.interruptStyle);
          if (s.interruptStyle === 'pip_playing_muted') {
            player.muted = true;
            player.volume = 0;
            player.play();
          } else {
            player.pause();
            if (existing.pauseAtSec != null) player.currentTime = existing.pauseAtSec;
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [applyInterrupt, media.id, player]);

    useEventListener(player, 'statusChange', ({ status, error }) => {
      if (status === 'error') {
        setPlayError(error?.message ? `${UNPLAYABLE_FILE_MESSAGE}\n\n${error.message}` : UNPLAYABLE_FILE_MESSAGE);
        player.pause();
        return;
      }
      if (status === 'readyToPlay' && !restoredRef.current) {
        restoredRef.current = true;
        setPlayError(null);
        if (phaseRef.current !== 'lesson') {
          if (media.positionSec > 0.5) {
            player.currentTime = media.positionSec;
          }
          player.play();
        } else if (settingsRef.current?.interruptStyle === 'pip_playing_muted') {
          player.muted = true;
          player.volume = 0;
          player.play();
        }
      }
    });

    useEventListener(player, 'timeUpdate', ({ currentTime }) => {
      setDisplayTime(currentTime);
      if (player.duration > 0) setDuration(player.duration);
      const last = lastTimeRef.current;
      lastTimeRef.current = currentTime;
      if (scrubbingRef.current) return;
      if (last == null) return;
      const delta = currentTime - last;
      const counting =
        player.playing &&
        delta > 0 &&
        delta < 1.25 &&
        (phaseRef.current === 'watch' || phaseRef.current === 'warning');
      if (counting) {
        playAccumRef.current += delta;
      }
      const s = settingsRef.current;
      if (!s || s.remainingLessons <= 0) return;
      const until = s.intervalSec - playAccumRef.current;
      if (phaseRef.current === 'watch' && until <= s.countdownSec) {
        setPhase('warning');
      }
      if (phaseRef.current === 'warning' && playAccumRef.current >= s.intervalSec) {
        beginLesson(false);
      }
    });

    useEffect(() => {
      const id = setInterval(() => {
        setPlayAccum(playAccumRef.current);
        if (player.playing) persistPosition();
      }, 1000);
      return () => clearInterval(id);
    }, [persistPosition, player]);

    useEffect(() => {
      const sub = AppState.addEventListener('change', (state) => {
        persistPosition();
        if (trialRef.current) saveActiveTrial(trialRef.current);
        if (state !== 'active') {
          stopSpeech();
        }
      });
      return () => sub.remove();
    }, [persistPosition]);

    useEffect(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (!chromeOn || !isPlaying || phase !== 'watch') return;
      hideTimer.current = setTimeout(() => setChromeOn(false), 4000);
      return () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
      };
    }, [chromeOn, isPlaying, phase]);

    const untilLesson = settings
      ? Math.max(0, settings.intervalSec - playAccum)
      : null;
    const warningLeft = settings ? Math.ceil(Math.max(0, settings.intervalSec - playAccum)) : 0;
    const inLesson = phase === 'lesson' || phase === 'success';
    const showChrome = chromeOn && !inLesson;

    function onSeek(sec: number) {
      player.currentTime = sec;
      lastTimeRef.current = sec;
      scrubbingRef.current = false;
      persistPosition();
    }

    return (
      <View style={styles.root}>
        <View
          pointerEvents="none"
          style={
            pip
              ? styles.videoPip
              : [styles.videoFull, videoHidden ? styles.videoHidden : null]
          }
        >
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls={false}
            surfaceType="textureView"
            useExoShutter={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
          />
        </View>

        <Pressable
          style={styles.tapLayer}
          onPress={() => {
            if (inLesson) return;
            setChromeOn((v) => !v);
          }}
        />
        {inLesson && trial ? (
          <LessonOverlay
            word={trial.word}
            imageUri={trial.imageUri}
            promptMode={trial.promptMode}
            filledCount={trial.filledCount}
            questionIndex={trial.questionIndex}
            questionTotal={trial.questionTotal}
            hintLetter={hintLetter}
            wiggleLetter={wiggleLetter}
            wiggleNonce={wiggleNonce}
            correctLetter={correctLetter}
            correctNonce={correctNonce}
            celebrating={phase === 'success'}
            onLetter={onLetter}
            disabled={!trial.word}
          />
        ) : null}

        {phase === 'warning' ? (
          <View style={styles.warning} pointerEvents="none">
            <Text style={styles.warningNum}>{warningLeft}</Text>
          </View>
        ) : null}

        {playError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Can’t play this file</Text>
            <Text style={styles.errorBody}>{playError}</Text>
            <Pressable
              style={styles.errorBtn}
              onPress={async () => {
                await persistPosition();
                player.pause();
                onLibrary();
              }}
            >
              <Text style={styles.errorBtnText}>Back to library</Text>
            </Pressable>
          </View>
        ) : null}

        <VlcChrome
          visible={showChrome}
          playing={!!isPlaying}
          currentSec={displayTime}
          durationSec={duration}
          untilLessonSec={untilLesson}
          freePlay={!settings || settings.remainingLessons <= 0}
          onTogglePlay={() => (isPlaying ? player.pause() : player.play())}
          onSkip={(d) => {
            const next = Math.max(0, player.currentTime + d);
            player.currentTime = next;
            lastTimeRef.current = next;
          }}
          onSeek={onSeek}
          onSlidingStart={() => {
            scrubbingRef.current = true;
          }}
          onStartLessonNow={() => beginLesson(true)}
          onParent={onParent}
        />

        {showChrome ? (
          <Pressable
            style={styles.back}
            onPress={async () => {
              await persistPosition();
              player.pause();
              onLibrary();
            }}
          >
            <Text style={styles.backText}>Library</Text>
          </Pressable>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  tapLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  videoFull: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  videoPip: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 220,
    height: 124,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.orange,
    zIndex: 25,
  },
  videoHidden: {
    opacity: 0,
  },
  warning: {
    ...StyleSheet.absoluteFill,
    zIndex: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningNum: {
    color: '#fff',
    fontSize: 160,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowRadius: 12,
  },
  errorCard: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 80,
    zIndex: 40,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  errorBody: {
    color: colors.textDim,
    fontSize: 16,
    lineHeight: 22,
  },
  errorBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorBtnText: {
    color: '#111',
    fontWeight: '800',
  },
  back: {
    position: 'absolute',
    top: 18,
    left: 16,
    zIndex: 31,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backText: {
    color: colors.text,
    fontWeight: '700',
  },
});
