export type InterruptStyle = 'pause_hidden' | 'pip_paused' | 'pip_playing_muted';

export type PromptMode = 'outline' | 'from_scratch';

export type WordStatus = 'new' | 'emerging' | 'proficient';

export type Settings = {
  intervalSec: number;
  countdownSec: number;
  questionsPerInterrupt: number;
  remainingLessons: number;
  interruptStyle: InterruptStyle;
  outlineUntilCorrect: number;
  ttsVoiceId: string | null;
  ttsRate: number;
  ttsPitch: number;
};

export type MediaFile = {
  id: string;
  title: string;
  fileUri: string;
  durationSec: number | null;
  positionSec: number;
  byteSize: number | null;
  createdAt: string;
};

export type Word = {
  id: string;
  word: string;
  imageUri: string | null;
  enabled: boolean;
  status: WordStatus;
  promptMode: PromptMode;
  ease: number;
  intervalDays: number;
  nextDueAt: string | null;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  createdAt: string;
};

export type TrialLog = {
  id: string;
  ts: string;
  word: string;
  wordId: string | null;
  wrongLetterCount: number;
  fails: number;
  timeToCorrectMs: number | null;
  inputMode: 'keyboard';
  completed: boolean;
};

export type ActiveTrial = {
  mediaId: string;
  wordId: string;
  word: string;
  imageUri: string | null;
  promptMode: PromptMode;
  filledCount: number;
  missOnCurrent: number;
  wrongLetterCount: number;
  fails: number;
  questionIndex: number;
  questionTotal: number;
  startedAt: number;
  usedWordIds: string[];
  pauseAtSec: number | null;
};

export const DEFAULT_SETTINGS: Settings = {
  intervalSec: 10 * 60,
  countdownSec: 30,
  questionsPerInterrupt: 1,
  remainingLessons: 8,
  interruptStyle: 'pause_hidden',
  outlineUntilCorrect: 2,
  ttsVoiceId: null,
  ttsRate: 0.9,
  ttsPitch: 1,
};

export const MIN_INTERVAL_SEC = 20;
export const MAX_INTERVAL_SEC = 60 * 60;
