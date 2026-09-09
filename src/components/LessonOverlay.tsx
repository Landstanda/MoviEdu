import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { PromptMode } from '../types';
import { LetterKeyboard } from './LetterKeyboard';

type Props = {
  word: string;
  imageUri: string | null;
  promptMode: PromptMode;
  filledCount: number;
  questionIndex: number;
  questionTotal: number;
  hintLetter: string | null;
  wiggleLetter: string | null;
  wiggleNonce: number;
  correctLetter: string | null;
  correctNonce: number;
  celebrating: boolean;
  disabled?: boolean;
  onLetter: (letter: string) => void;
};

function LetterBox({
  ch,
  filled,
  showOutline,
  flash,
  flashNonce,
}: {
  ch: string;
  filled: boolean;
  showOutline: boolean;
  flash: boolean;
  flashNonce: number;
}) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flash) return;
    glow.setValue(1);
    Animated.timing(glow, {
      toValue: 0,
      duration: 420,
      delay: 120,
      useNativeDriver: false,
    }).start();
  }, [flash, flashNonce, glow]);

  const backgroundColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [filled ? '#163326' : showOutline ? '#111' : colors.box, colors.keyCorrect],
  });

  return (
    <Animated.View
      style={[
        styles.box,
        filled && styles.boxFilled,
        showOutline && !filled && styles.boxOutline,
        { backgroundColor },
      ]}
    >
      {filled ? (
        <Text style={styles.letterFill}>{ch}</Text>
      ) : showOutline ? (
        <Text style={styles.letterGhost}>{ch}</Text>
      ) : null}
    </Animated.View>
  );
}

export function LessonOverlay({
  word,
  imageUri,
  promptMode,
  filledCount,
  questionIndex,
  questionTotal,
  hintLetter,
  wiggleLetter,
  wiggleNonce,
  correctLetter,
  correctNonce,
  celebrating,
  disabled,
  onLetter,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!celebrating) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.18, duration: 220, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.55, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();
  }, [celebrating, opacity, scale]);

  return (
    <View style={styles.root} pointerEvents={celebrating ? 'none' : 'auto'}>
      {questionTotal > 1 ? (
        <Text style={styles.counter}>
          {questionIndex + 1} of {questionTotal}
        </Text>
      ) : null}

      <View style={styles.prompt}>
        <View style={styles.imageCol}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.image, styles.imageMissing]}>
              <Text style={styles.imageMissingText}>No picture</Text>
            </View>
          )}
        </View>
        <View style={styles.lettersCol}>
          <Text style={styles.spell}>{word ? 'Spell' : 'Ask an adult'}</Text>
          <Animated.View style={{ transform: [{ scale }], opacity }}>
            <View style={styles.letters}>
              {word.split('').map((ch, i) => {
                const filled = i < filledCount;
                const showOutline = promptMode === 'outline';
                return (
                  <LetterBox
                    key={`${ch}-${i}`}
                    ch={ch}
                    filled={filled}
                    showOutline={showOutline}
                    flash={filled && i === filledCount - 1}
                    flashNonce={correctNonce}
                  />
                );
              })}
            </View>
          </Animated.View>
        </View>
      </View>

      {word.length > 0 ? (
        <LetterKeyboard
          onLetter={onLetter}
          hintLetter={hintLetter}
          wiggleLetter={wiggleLetter}
          wiggleNonce={wiggleNonce}
          correctLetter={correctLetter}
          correctNonce={correctNonce}
          disabled={disabled || celebrating}
        />
      ) : (
        <Text style={styles.askHelp}>Ask an adult to add a word, then skip from PIN.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    paddingTop: 18,
    zIndex: 20,
  },
  counter: {
    position: 'absolute',
    top: 14,
    left: 18,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    zIndex: 2,
  },
  prompt: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 20,
  },
  imageCol: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 4,
  },
  image: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.bgElevated,
  },
  imageMissing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageMissingText: {
    color: colors.textDim,
    fontSize: 16,
  },
  lettersCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  spell: {
    color: colors.textDim,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 1,
  },
  letters: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  box: {
    minWidth: 150,
    minHeight: 180,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: colors.boxBorder,
    backgroundColor: colors.box,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: colors.letterFill,
  },
  boxOutline: {
    borderColor: colors.boxBorder,
  },
  letterFill: {
    color: colors.letterFill,
    fontSize: 88,
    fontWeight: '800',
  },
  letterGhost: {
    color: colors.letterOutline,
    fontSize: 88,
    fontWeight: '800',
  },
  askHelp: {
    color: colors.text,
    fontSize: 22,
    textAlign: 'center',
    padding: 24,
  },
});
