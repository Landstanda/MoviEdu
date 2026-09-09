import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { deleteMedia, listMedia } from '../db/media';
import { listLogs, logsToCsv } from '../db/logs';
import { loadSettings, patchSettings, interruptStyleLabel } from '../db/settings';
import { deleteWord, insertWord, listWords, updateWord } from '../db/words';
import { importMovie, pickWordImage, removeFileQuietly, writeTempCsv } from '../files';
import { displayMovieTitle, normalizeWord } from '../format';
import { hasParentPin, setParentPin, verifyParentPin } from '../pin';
import { listEnglishVoices } from '../speech';
import { colors } from '../theme';
import {
  MIN_INTERVAL_SEC,
  type InterruptStyle,
  type MediaFile,
  type Settings,
  type TrialLog,
  type PromptMode,
  type Word,
  type WordStatus,
} from '../types';

type Tab = 'sitting' | 'words' | 'schedule' | 'logs';

type Props = {
  visible: boolean;
  inLesson: boolean;
  onClose: () => void;
  onSkipTrial: () => void;
  onEndSitting: () => void;
  onRunTestTrial: () => void;
  onMediaChanged: () => void;
};

export function ParentSheet({
  visible,
  inLesson,
  onClose,
  onSkipTrial,
  onEndSitting,
  onRunTestTrial,
  onMediaChanged,
}: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [needsCreate, setNeedsCreate] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [tab, setTab] = useState<Tab>('sitting');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [logs, setLogs] = useState<TrialLog[]>([]);
  const [movies, setMovies] = useState<MediaFile[]>([]);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [savingWord, setSavingWord] = useState(false);
  const newWordRef = useRef('');
  const { width, height } = useWindowDimensions();
  const twoCol = width > height;

  useEffect(() => {
    if (!visible) {
      setUnlocked(false);
      setPin('');
      setPinError('');
      setTab('sitting');
      return;
    }
    hasParentPin().then((exists) => setNeedsCreate(!exists));
  }, [visible]);

  async function refresh() {
    setSettings(await loadSettings());
    setWords(await listWords());
    setLogs(await listLogs());
    setMovies(await listMedia());
    setVoices(await listEnglishVoices());
  }

  useEffect(() => {
    if (unlocked) {
      refresh();
    }
  }, [unlocked]);

  async function submitPin() {
    if (pin.length < 4) {
      setPinError('Use at least 4 digits');
      return;
    }
    if (needsCreate) {
      await setParentPin(pin);
      setUnlocked(true);
      setPin('');
      return;
    }
    const ok = await verifyParentPin(pin);
    if (!ok) {
      setPinError('Wrong PIN');
      setPin('');
      return;
    }
    setUnlocked(true);
    setPin('');
  }

  function tapDigit(d: string) {
    setPinError('');
    setPin((p) => (p.length >= 8 ? p : p + d));
  }

  async function savePatch(partial: Partial<Settings>) {
    const next = await patchSettings(partial);
    setSettings(next);
  }

  async function addWord() {
    const word = normalizeWord(newWordRef.current || newWord);
    if (!word || savingWord) return;
    setSavingWord(true);
    try {
      await insertWord({ word, imageUri: newImage });
      newWordRef.current = '';
      setNewWord('');
      setNewImage(null);
      setWords(await listWords());
    } catch {
      Alert.alert('Could not save word');
    } finally {
      setSavingWord(false);
    }
  }

  async function exportLogs() {
    const csv = logsToCsv(logs);
    const path = await writeTempCsv(csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: 'text/csv',
        dialogTitle: 'MoviEdu logs',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Saved CSV', path);
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {!unlocked ? (
            <View style={styles.pinWrap}>
              <Text style={styles.title}>
                {needsCreate ? 'Create a parent PIN' : 'Parent PIN'}
              </Text>
              <Text style={styles.hint}>
                {needsCreate
                  ? 'This is not the tablet lock PIN. Pick digits only you know.'
                  : 'Enter the parent PIN'}
              </Text>
              <Text style={styles.dots}>{pin.length ? '•'.repeat(pin.length) : ' '}</Text>
              {pinError ? <Text style={styles.error}>{pinError}</Text> : null}
              <View style={styles.pad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', 'OK'].map((key) => (
                  <Pressable
                    key={key}
                    style={styles.padKey}
                    onPress={() => {
                      if (key === '←') setPin((p) => p.slice(0, -1));
                      else if (key === 'OK') submitPin();
                      else tapDigit(key);
                    }}
                  >
                    <Text style={styles.padText}>{key}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={onClose} style={styles.secondary}>
                <Text style={styles.secondaryText}>Close</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.tabs}>
                {(['sitting', 'words', 'schedule', 'logs'] as Tab[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    style={[styles.tab, tab === t && styles.tabOn]}
                  >
                    <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{tabLabel(t)}</Text>
                  </Pressable>
                ))}
              </View>

              {tab === 'sitting' && settings && (
                <View style={styles.playSplit}>
                  <ScrollView keyboardShouldPersistTaps="handled" style={styles.playCol} contentContainerStyle={styles.playColBody}>
                    <Text style={styles.label}>Lessons left this sitting</Text>
                    <Text style={styles.big}>{settings.remainingLessons}</Text>
                    <View style={styles.row}>
                      <Btn label="−1" onPress={() => savePatch({ remainingLessons: Math.max(0, settings.remainingLessons - 1) })} />
                      <Btn label="+1" onPress={() => savePatch({ remainingLessons: settings.remainingLessons + 1 })} />
                      <Btn label="0 (free play)" onPress={() => savePatch({ remainingLessons: 0 })} />
                      <Btn label="8" onPress={() => savePatch({ remainingLessons: 8 })} />
                    </View>
                    <Btn
                      block
                      label={importing ? 'Copying movie…' : 'Import movie (MP4)'}
                      onPress={async () => {
                        if (importing) return;
                        setImporting(true);
                        try {
                          await importMovie();
                          setMovies(await listMedia());
                        } catch (e) {
                          const msg = e instanceof Error ? e.message : String(e);
                          if (msg !== 'canceled') {
                            Alert.alert(
                              'Could not import',
                              msg.includes('play') || msg.includes('space') || msg.includes('copy')
                                ? msg
                                : 'Use an MP4 (H.264 + AAC). MKV files from VLC may not play until converted in HandBrake.',
                            );
                          }
                        } finally {
                          setImporting(false);
                        }
                      }}
                    />
                    <Btn block label="Run test trial now" onPress={onRunTestTrial} />
                    {inLesson ? <Btn block label="Skip this trial" onPress={onSkipTrial} /> : null}
                    <Btn block label="End sitting (just play)" onPress={onEndSitting} />
                  </ScrollView>
                  <View style={styles.playDivider} />
                  <ScrollView style={styles.playCol} contentContainerStyle={styles.playColBody}>
                    <Text style={styles.label}>Movies in the app</Text>
                    {movies.length === 0 ? (
                      <Text style={styles.hint}>No movies yet. Import an MP4 on the left.</Text>
                    ) : null}
                    {movies.map((m) => (
                      <View key={m.id} style={styles.wordRow}>
                        <Text style={styles.wordTitle} numberOfLines={2}>
                          {displayMovieTitle(m.title, m.fileUri)}
                        </Text>
                        <Pressable
                          onPress={async () => {
                            await removeFileQuietly(m.fileUri);
                            await deleteMedia(m.id);
                            setMovies(await listMedia());
                            onMediaChanged();
                          }}
                        >
                          <Text style={styles.danger}>Delete</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {tab === 'words' && (
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
                  <TextInput
                    value={newWord}
                    onChangeText={(t) => {
                      newWordRef.current = t;
                      setNewWord(t);
                    }}
                    placeholder="WORD"
                    placeholderTextColor={colors.textDim}
                    autoCapitalize="characters"
                    blurOnSubmit
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      void addWord();
                    }}
                    style={styles.input}
                  />
                  <View style={styles.row}>
                    <Btn
                      label={newImage ? 'Change picture' : 'Add picture'}
                      onPress={async () => {
                        try {
                          setNewImage(await pickWordImage());
                        } catch {
                          /* canceled */
                        }
                      }}
                    />
                    <Btn label={savingWord ? 'Saving…' : 'Save word'} onPress={() => void addWord()} />
                  </View>
                  {newImage ? (
                    <Image source={{ uri: newImage }} style={styles.preview} />
                  ) : null}
                  <Text style={styles.hint}>
                    New words start with faint letters to copy. After a couple of right answers, the
                    letters hide and he spells from the picture and the spoken word. Status goes New
                    → Getting it → Skilled.
                  </Text>
                  <View style={[styles.wordGrid, twoCol && styles.wordGridTwo]}>
                    {words.map((w) => (
                      <View key={w.id} style={[styles.wordRow, twoCol && styles.wordRowHalf]}>
                        {w.imageUri ? (
                          <Image source={{ uri: w.imageUri }} style={styles.thumb} />
                        ) : (
                          <View style={styles.thumb} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.wordTitle}>{w.word}</Text>
                          <Text style={styles.meta}>
                            {skillLabel(w.status)} · {promptLabel(w.promptMode)}
                            {w.enabled ? '' : ' · off'}
                          </Text>
                        </View>
                        <Pressable onPress={() => updateWord(w.id, { enabled: !w.enabled }).then(() => listWords().then(setWords))}>
                          <Text style={styles.link}>{w.enabled ? 'Disable' : 'Enable'}</Text>
                        </Pressable>
                        <Pressable onPress={() => deleteWord(w.id).then(() => listWords().then(setWords))}>
                          <Text style={styles.danger}>Delete</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              {tab === 'schedule' && settings && (
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
                  <Text style={styles.label}>Interval (movie playing time)</Text>
                  <Text style={styles.big}>
                    {settings.intervalSec >= 60
                      ? `${Math.round(settings.intervalSec / 60)} min (${settings.intervalSec}s)`
                      : `${settings.intervalSec} sec`}
                  </Text>
                  <View style={styles.row}>
                    <Btn label="20s test" onPress={() => savePatch({ intervalSec: MIN_INTERVAL_SEC })} />
                    <Btn label="1 min" onPress={() => savePatch({ intervalSec: 60 })} />
                    <Btn label="10 min" onPress={() => savePatch({ intervalSec: 600 })} />
                    <Btn label="15 min" onPress={() => savePatch({ intervalSec: 900 })} />
                  </View>
                  <Text style={styles.label}>Countdown warning</Text>
                  <Text style={styles.big}>{settings.countdownSec}s</Text>
                  <View style={styles.row}>
                    <Btn label="−5s" onPress={() => savePatch({ countdownSec: Math.max(3, settings.countdownSec - 5) })} />
                    <Btn label="+5s" onPress={() => savePatch({ countdownSec: settings.countdownSec + 5 })} />
                    <Btn label="5s" onPress={() => savePatch({ countdownSec: 5 })} />
                    <Btn label="30s" onPress={() => savePatch({ countdownSec: 30 })} />
                  </View>
                  <Text style={styles.label}>Words per interrupt</Text>
                  <Text style={styles.big}>{settings.questionsPerInterrupt}</Text>
                  <View style={styles.row}>
                    <Btn label="−" onPress={() => savePatch({ questionsPerInterrupt: Math.max(1, settings.questionsPerInterrupt - 1) })} />
                    <Btn label="+" onPress={() => savePatch({ questionsPerInterrupt: Math.min(5, settings.questionsPerInterrupt + 1) })} />
                  </View>
                  <Text style={styles.label}>How the movie yields to the lesson</Text>
                  {(['pause_hidden', 'pip_paused', 'pip_playing_muted'] as InterruptStyle[]).map((style) => (
                    <Pressable
                      key={style}
                      onPress={() => savePatch({ interruptStyle: style })}
                      style={[styles.choice, settings.interruptStyle === style && styles.choiceOn]}
                    >
                      <Text style={styles.choiceText}>{interruptStyleLabel(style)}</Text>
                    </Pressable>
                  ))}
                  <Text style={styles.hint}>
                    Pause and hide: movie stops, lesson is full screen.{'\n'}
                    Mini paused: tiny frozen movie in the corner.{'\n'}
                    Mini still playing: tiny movie keeps moving with sound off.
                  </Text>
                  <Text style={styles.label}>Voice</Text>
                  <Pressable
                    onPress={() => savePatch({ ttsVoiceId: null })}
                    style={[styles.choice, !settings.ttsVoiceId && styles.choiceOn]}
                  >
                    <Text style={styles.choiceText}>Tablet default English</Text>
                  </Pressable>
                  {voices.map((v) => (
                    <Pressable
                      key={v.identifier}
                      onPress={() => savePatch({ ttsVoiceId: v.identifier })}
                      style={[styles.choice, settings.ttsVoiceId === v.identifier && styles.choiceOn]}
                    >
                      <Text style={styles.choiceText}>
                        {v.name} ({v.language})
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {tab === 'logs' && (
                <View style={{ flex: 1 }}>
                  <View style={styles.body}>
                    <Btn label="Export CSV" onPress={exportLogs} />
                  </View>
                  <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.body}
                    renderItem={({ item }) => (
                      <Text style={styles.logLine}>
                        {item.ts.slice(0, 19).replace('T', ' ')} · {item.word} · wrong {item.wrongLetterCount} · fails{' '}
                        {item.fails} · {item.timeToCorrectMs ?? '—'}ms · {item.completed ? 'ok' : 'skip'}
                      </Text>
                    )}
                  />
                </View>
              )}

              <Pressable onPress={onClose} style={styles.done}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function tabLabel(t: Tab): string {
  switch (t) {
    case 'sitting':
      return 'Play';
    case 'words':
      return 'Words';
    case 'schedule':
      return 'Schedule';
    case 'logs':
      return 'Logs';
  }
}

function skillLabel(status: WordStatus): string {
  switch (status) {
    case 'new':
      return 'New';
    case 'emerging':
      return 'Getting it';
    case 'proficient':
      return 'Skilled';
  }
}

function promptLabel(mode: PromptMode): string {
  switch (mode) {
    case 'outline':
      return 'Shows letters';
    case 'from_scratch':
      return 'Empty boxes';
  }
}

function Btn({ label, onPress, block }: { label: string; onPress: () => void; block?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, block && styles.btnBlock]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    padding: 18,
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pinWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  hint: {
    color: colors.textDim,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: {
    color: colors.orange,
    fontSize: 32,
    letterSpacing: 8,
    minHeight: 40,
  },
  error: {
    color: colors.danger,
    fontSize: 16,
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    gap: 8,
    justifyContent: 'center',
  },
  padKey: {
    width: 80,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabOn: {
    borderBottomWidth: 3,
    borderBottomColor: colors.orange,
  },
  tabText: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextOn: {
    color: colors.text,
  },
  playSplit: {
    flex: 1,
    flexDirection: 'row',
  },
  playCol: {
    flex: 1,
  },
  playColBody: {
    padding: 16,
    gap: 10,
  },
  playDivider: {
    width: 1,
    backgroundColor: colors.line,
  },
  label: {
    color: colors.textDim,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  big: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    backgroundColor: colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnBlock: {
    alignSelf: 'stretch',
  },
  btnText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  preview: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  wordGrid: {
    gap: 4,
  },
  wordGridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  wordRowHalf: {
    width: '48%',
  },
  thumb: {
    width: 48,
    height: 36,
    borderRadius: 4,
    backgroundColor: colors.box,
  },
  wordTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    color: colors.textDim,
    fontSize: 13,
  },
  link: {
    color: colors.orange,
    fontWeight: '700',
  },
  danger: {
    color: colors.danger,
    fontWeight: '700',
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
  },
  choiceOn: {
    borderColor: colors.orange,
    backgroundColor: '#2a1d10',
  },
  choiceText: {
    color: colors.text,
    fontSize: 16,
  },
  logLine: {
    color: colors.textDim,
    fontSize: 13,
    marginBottom: 6,
  },
  done: {
    backgroundColor: colors.orange,
    padding: 14,
    alignItems: 'center',
  },
  doneText: {
    color: '#111',
    fontSize: 18,
    fontWeight: '800',
  },
  secondary: {
    marginTop: 12,
    padding: 10,
  },
  secondaryText: {
    color: colors.textDim,
    fontSize: 16,
  },
});
