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
  celebrating: boolean;
  disabled?: boolean;
  onLetter: (letter: string) => void;
};

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
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={[styles.image, styles.imageMissing]}>
            <Text style={styles.imageMissingText}>No picture</Text>
          </View>
        )}
        <Text style={styles.spell}>{word ? 'Spell' : 'Ask an adult'}</Text>
        <Animated.View style={{ transform: [{ scale }], opacity }}>
          <View style={styles.letters}>
            {word.split('').map((ch, i) => {
              const filled = i < filledCount;
              const showOutline = promptMode === 'outline';
              return (
                <View
                  key={`${ch}-${i}`}
                  style={[
                    styles.box,
                    filled && styles.boxFilled,
                    showOutline && !filled && styles.boxOutline,
                  ]}
                >
                  {filled ? (
                    <Text style={styles.letterFill}>{ch}</Text>
                  ) : showOutline ? (
                    <Text style={styles.letterGhost}>{ch}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Animated.View>
      </View>

      {word.length > 0 ? (
        <LetterKeyboard
          onLetter={onLetter}
          hintLetter={hintLetter}
          wiggleLetter={wiggleLetter}
          wiggleNonce={wiggleNonce}
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
    justifyContent: 'space-between',
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
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  image: {
    width: 220,
    height: 160,
    borderRadius: 12,
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
  spell: {
    color: colors.textDim,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 1,
  },
  letters: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  box: {
    minWidth: 52,
    minHeight: 64,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.boxBorder,
    backgroundColor: colors.box,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: colors.letterFill,
    backgroundColor: '#163326',
  },
  boxOutline: {
    backgroundColor: '#111',
  },
  letterFill: {
    color: colors.letterFill,
    fontSize: 36,
    fontWeight: '800',
  },
  letterGhost: {
    color: colors.letterOutline,
    fontSize: 36,
    fontWeight: '800',
  },
  askHelp: {
    color: colors.text,
    fontSize: 22,
    textAlign: 'center',
    padding: 24,
  },
});
