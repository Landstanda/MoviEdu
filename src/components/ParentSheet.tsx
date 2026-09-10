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
import { loadSettings, patchSettings } from '../db/settings';
import { deleteWord, insertWord, listWords, updateWord } from '../db/words';
import { importMovie, pickWordImage, removeFileQuietly, writeTempCsv } from '../files';
import { spellingImageSource } from '../spellingImages';
import { displayMovieTitle, formatApproxMinutes, formatBytes, normalizeWord } from '../format';
import { hasParentPin, setParentPin, verifyParentPin } from '../pin';
import { listEnglishVoices, speakText } from '../speech';
import { colors } from '../theme';
import { type MediaFile, type PromptMode, type Settings, type TrialLog, type Word, type WordStatus } from '../types';

type Tab = 'general' | 'words' | 'language' | 'logs';

type Props = {
  visible: boolean;
  onClose: () => void;
  onMediaChanged: () => void;
};

export function ParentSheet({ visible, onClose, onMediaChanged }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [needsCreate, setNeedsCreate] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [tab, setTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [logs, setLogs] = useState<TrialLog[]>([]);
  const [movies, setMovies] = useState<MediaFile[]>([]);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [savingWord, setSavingWord] = useState(false);
  const [numField, setNumField] = useState<null | 'interval' | 'countdown'>(null);
  const [numDraft, setNumDraft] = useState('');
  const newWordRef = useRef('');
  const { width, height } = useWindowDimensions();
  const twoCol = width > height;

  useEffect(() => {
    if (!visible) {
      setUnlocked(false);
      setPin('');
      setPinError('');
      setTab('general');
      setNumField(null);
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

  async function savePatch(partial: Partial<Settings>): Promise<Settings> {
    const next = await patchSettings(partial);
    setSettings(next);
    return next;
  }

  function typeNumKey(key: string) {
    setNumDraft((draft) => pushNumKey(draft, key, numField === 'interval'));
  }

  async function commitNumField() {
    if (!numField) return;
    const n = Number(numDraft);
    if (!Number.isFinite(n) || n <= 0) {
      setNumField(null);
      return;
    }
    if (numField === 'interval') {
      await savePatch({ intervalSec: Math.round(n * 60) });
    } else {
      await savePatch({ countdownSec: Math.round(n) });
    }
    setNumField(null);
  }

  function previewVoice(next: Settings) {
    speakText('Spell the word', {
      voiceId: next.ttsVoiceId,
      rate: next.ttsRate,
      pitch: next.ttsPitch,
    });
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
              <Text style={styles.title}>{needsCreate ? 'Create a parent PIN' : 'Parent PIN'}</Text>
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
                {(['general', 'words', 'language', 'logs'] as Tab[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setTab(t);
                      setNumField(null);
                    }}
                    style={[styles.tab, tab === t && styles.tabOn]}
                  >
                    <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{tabLabel(t)}</Text>
                  </Pressable>
                ))}
              </View>

              {tab === 'general' && settings ? (
                <View style={styles.generalSplit}>
                  <View style={styles.generalLeft}>
                    <View style={styles.cell}>
                      <Text style={styles.cellLabel}>Lessons Remaining</Text>
                      <Text style={styles.cellValue}>{settings.remainingLessons}</Text>
                      <View style={styles.chipRow}>
                        {[
                          { label: '-5', delta: -5 },
                          { label: '-1', delta: -1 },
                          { label: '+1', delta: 1 },
                          { label: '+5', delta: 5 },
                          { label: '+10', delta: 10 },
                        ].map((btn) => (
                          <Chip
                            key={btn.label}
                            label={btn.label}
                            onPress={() =>
                              savePatch({
                                remainingLessons: Math.max(0, Math.min(99, settings.remainingLessons + btn.delta)),
                              })
                            }
                          />
                        ))}
                      </View>
                    </View>
                    <View style={styles.cell}>
                      <Text style={styles.cellLabel}>Intervals Between Lessons</Text>
                      <Pressable
                        style={[styles.numField, numField === 'interval' && styles.numFieldOn]}
                        onPress={() => {
                          setNumField('interval');
                          setNumDraft(minutesFromSec(settings.intervalSec));
                        }}
                      >
                        <Text style={styles.numFieldValue}>
                          {numField === 'interval' ? numDraft : minutesFromSec(settings.intervalSec)}
                        </Text>
                        <Text style={styles.numFieldUnit}>min</Text>
                      </Pressable>
                    </View>
                    <View style={styles.cell}>
                      <Text style={styles.cellLabel}>Countdown Warning</Text>
                      <Pressable
                        style={[styles.numField, numField === 'countdown' && styles.numFieldOn]}
                        onPress={() => {
                          setNumField('countdown');
                          setNumDraft(String(settings.countdownSec));
                        }}
                      >
                        <Text style={styles.numFieldValue}>
                          {numField === 'countdown' ? numDraft : String(settings.countdownSec)}
                        </Text>
                        <Text style={styles.numFieldUnit}>sec</Text>
                      </Pressable>
                    </View>
                    <View style={[styles.cell, styles.cellLast]}>
                      <Text style={styles.cellLabel}>Lessons per Interruption</Text>
                      <Text style={styles.cellValue}>{settings.questionsPerInterrupt}</Text>
                      <View style={styles.chipRow}>
                        <Chip
                          label="-1"
                          onPress={() =>
                            savePatch({ questionsPerInterrupt: Math.max(1, settings.questionsPerInterrupt - 1) })
                          }
                        />
                        <Chip
                          label="+1"
                          onPress={() =>
                            savePatch({ questionsPerInterrupt: Math.min(5, settings.questionsPerInterrupt + 1) })
                          }
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.generalRight}>
                    {numField ? (
                      <View style={styles.keypadWrap}>
                        <Text style={styles.keypadTitle}>
                          {numField === 'interval' ? 'Interval in minutes' : 'Countdown in seconds'}
                        </Text>
                        <Text style={styles.keypadHint}>
                          {numField === 'interval'
                            ? 'Decimals are OK (0.5 = 30 seconds). The number stays visible on the left.'
                            : 'Whole seconds only. The number stays visible on the left.'}
                        </Text>
                        <View style={styles.keypad}>
                          {(numField === 'interval'
                            ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
                            : ['1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '0', '⌫']
                          ).map((key) => (
                            <Pressable
                              key={key}
                              style={[styles.keypadKey, key === ' ' && styles.keypadKeyGhost]}
                              onPress={() => {
                                if (key === ' ') return;
                                typeNumKey(key);
                              }}
                            >
                              <Text style={styles.keypadKeyText}>{key === ' ' ? '' : key}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <View style={styles.keypadActions}>
                          <Pressable style={styles.keypadCancel} onPress={() => setNumField(null)}>
                            <Text style={styles.keypadCancelText}>Cancel</Text>
                          </Pressable>
                          <Pressable style={styles.importBtn} onPress={() => void commitNumField()}>
                            <Text style={styles.importBtnText}>Done</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={{ flex: 1 }}>
                    <View style={styles.moviesHead}>
                      <Text style={styles.moviesHeadTitle}>Movies</Text>
                      <Pressable
                        style={styles.importBtn}
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
                      >
                        <Text style={styles.importBtnText}>{importing ? 'Copying…' : 'Import movie (MP4)'}</Text>
                      </Pressable>
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.movieList}>
                      {movies.length === 0 ? (
                        <Text style={styles.hint}>No movies yet. Import an MP4.</Text>
                      ) : null}
                      {movies.map((m) => (
                        <View key={m.id} style={styles.movieRow}>
                          <Text style={styles.movieTitle} numberOfLines={1}>
                            {displayMovieTitle(m.title, m.fileUri)}
                          </Text>
                          <Text style={styles.movieMeta}>{formatBytes(m.byteSize)}</Text>
                          <Text style={styles.movieMeta}>{formatApproxMinutes(m.durationSec)}</Text>
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
                  </View>
                </View>
              ) : null}

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
                  {newImage ? <Image source={{ uri: newImage }} style={styles.preview} /> : null}
                  <Text style={styles.hint}>
                    New words start with faint letters to copy. After a couple of right answers, the letters hide and he
                    spells from the picture and the spoken word. Status goes New → Getting it → Skilled.
                  </Text>
                  <View style={[styles.wordGrid, twoCol && styles.wordGridTwo]}>
                    {words.map((w) => (
                      <View key={w.id} style={[styles.wordRow, twoCol && styles.wordRowHalf]}>
                        {spellingImageSource(w.word, w.imageUri) ? (
                          <Image source={spellingImageSource(w.word, w.imageUri)!} style={styles.thumb} />
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
                        <Pressable
                          onPress={() => updateWord(w.id, { enabled: !w.enabled }).then(() => listWords().then(setWords))}
                        >
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

              {tab === 'language' && settings ? (
                <View style={styles.langSplit}>
                  <View style={styles.langVoices}>
                    <Text style={styles.cellLabel}>Voice</Text>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.voiceList}>
                      <Pressable
                        onPress={async () => {
                          const next = await savePatch({ ttsVoiceId: null });
                          previewVoice(next);
                        }}
                        style={[styles.choice, !settings.ttsVoiceId && styles.choiceOn]}
                      >
                        <Text style={styles.choiceText}>Tablet default English</Text>
                      </Pressable>
                      {voices.map((v) => (
                        <Pressable
                          key={v.identifier}
                          onPress={async () => {
                            const next = await savePatch({ ttsVoiceId: v.identifier });
                            previewVoice(next);
                          }}
                          style={[styles.choice, settings.ttsVoiceId === v.identifier && styles.choiceOn]}
                        >
                          <Text style={styles.choiceText}>
                            {v.name} ({v.language})
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.langMods}>
                    <View style={styles.cell}>
                      <Text style={styles.cellLabel}>Pitch</Text>
                      <View style={styles.valueBox}>
                        <Text style={styles.valueBoxNum}>{settings.ttsPitch.toFixed(1)}</Text>
                      </View>
                      <View style={styles.chipRow}>
                        <Chip
                          label="-0.1"
                          onPress={async () => {
                            const next = await savePatch({
                              ttsPitch: Math.max(0.5, Math.round((settings.ttsPitch - 0.1) * 10) / 10),
                            });
                            previewVoice(next);
                          }}
                        />
                        <Chip
                          label="+0.1"
                          onPress={async () => {
                            const next = await savePatch({
                              ttsPitch: Math.min(2, Math.round((settings.ttsPitch + 0.1) * 10) / 10),
                            });
                            previewVoice(next);
                          }}
                        />
                      </View>
                    </View>
                    <View style={[styles.cell, styles.cellLast]}>
                      <Text style={styles.cellLabel}>Rate of speech</Text>
                      <View style={styles.valueBox}>
                        <Text style={styles.valueBoxNum}>{settings.ttsRate.toFixed(1)}</Text>
                      </View>
                      <View style={styles.chipRow}>
                        <Chip
                          label="-0.1"
                          onPress={async () => {
                            const next = await savePatch({
                              ttsRate: Math.max(0.5, Math.round((settings.ttsRate - 0.1) * 10) / 10),
                            });
                            previewVoice(next);
                          }}
                        />
                        <Chip
                          label="+0.1"
                          onPress={async () => {
                            const next = await savePatch({
                              ttsRate: Math.min(1.5, Math.round((settings.ttsRate + 0.1) * 10) / 10),
                            });
                            previewVoice(next);
                          }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}

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

function minutesFromSec(sec: number): string {
  const mins = Math.round((sec / 60) * 100) / 100;
  return String(mins);
}

function pushNumKey(draft: string, key: string, allowDot: boolean): string {
  if (key === '⌫') return draft.slice(0, -1);
  if (key === '.') {
    if (!allowDot || draft.includes('.')) return draft;
    return draft.length ? `${draft}.` : '0.';
  }
  if (!/^\d$/.test(key)) return draft;
  if (draft.length >= 6) return draft;
  if (draft === '0' && key !== '.') return key;
  return draft + key;
}

function tabLabel(t: Tab): string {
  switch (t) {
    case 'general':
      return 'General';
    case 'words':
      return 'Words';
    case 'language':
      return 'Language';
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

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
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
    backgroundColor: '#000',
    padding: 8,
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
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
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabOn: {
    borderBottomWidth: 3,
    borderBottomColor: colors.orange,
  },
  tabText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  tabTextOn: {
    color: colors.text,
  },
  generalSplit: {
    flex: 1,
    flexDirection: 'row',
  },
  generalLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  generalRight: {
    flex: 2,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 8,
  },
  cellLast: {
    borderBottomWidth: 0,
  },
  cellLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  cellValue: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
  },
  numField: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  numFieldOn: {
    borderBottomColor: colors.orange,
  },
  numFieldValue: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'right',
  },
  numFieldUnit: {
    color: colors.textDim,
    fontSize: 18,
    fontWeight: '700',
  },
  keypadWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  keypadTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  keypadHint: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    gap: 10,
    justifyContent: 'center',
  },
  keypadKey: {
    width: 86,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadKeyGhost: {
    backgroundColor: 'transparent',
  },
  keypadKeyText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  keypadActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  keypadCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  keypadCancelText: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 44,
    alignItems: 'center',
  },
  chipText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 16,
  },
  valueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#6b6b6b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  valueBoxNum: {
    color: '#111',
    fontSize: 28,
    fontWeight: '800',
  },
  valueBoxUnit: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
  },
  moviesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  moviesHeadTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  importBtn: {
    backgroundColor: colors.orange,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  importBtnText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 15,
  },
  movieList: {
    paddingVertical: 8,
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  movieTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  movieMeta: {
    color: colors.orange,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'right',
  },
  langSplit: {
    flex: 1,
    flexDirection: 'row',
  },
  langVoices: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    gap: 8,
  },
  voiceList: {
    gap: 8,
    paddingBottom: 16,
  },
  langMods: {
    flex: 1,
  },
  body: {
    padding: 16,
    gap: 10,
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
