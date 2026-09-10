import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { spellingImageSource } from '../spellingImages';
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
  hintNonce: number;
  wiggleLetter: string | null;
  wiggleNonce: number;
  correctLetter: string | null;
  correctNonce: number;
  celebrating: boolean;
  disabled?: boolean;
  onLetter: (letter: string) => void;
};

function letterMetrics(letterCount: number, colWidth: number) {
  const n = Math.max(1, letterCount);
  const gap = n <= 4 ? 12 : Math.max(6, 16 - n);
  const maxW = 108;
  const maxH = 130;
  const inner = Math.max(0, colWidth);
  const fitted = colWidth > 40 ? (inner - gap * (n - 1)) / n : maxW;
  const w = Math.min(maxW, Math.max(48, fitted || maxW));
  const h = Math.min(maxH, w * 1.2);
  const font = Math.min(88, w * 0.82, h * 0.68);
  return { w, h, gap, font };
}

function LetterBox({
  ch,
  filled,
  showOutline,
  flash,
  flashNonce,
  width,
  height,
  fontSize,
}: {
  ch: string;
  filled: boolean;
  showOutline: boolean;
  flash: boolean;
  flashNonce: number;
  width: number;
  height: number;
  fontSize: number;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  const settle = useRef(new Animated.Value(filled && !flash ? 1 : 0)).current;

  useEffect(() => {
    if (!filled) {
      glow.setValue(0);
      settle.setValue(0);
      return;
    }
    if (!flash) {
      glow.setValue(0);
      settle.setValue(1);
      return;
    }
    glow.setValue(1);
    settle.setValue(0);
    Animated.parallel([
      Animated.timing(glow, {
        toValue: 0,
        duration: 420,
        delay: 120,
        useNativeDriver: false,
      }),
      Animated.timing(settle, {
        toValue: 1,
        duration: 380,
        delay: 160,
        useNativeDriver: false,
      }),
    ]).start();
  }, [filled, flash, flashNonce, glow, settle]);

  const backgroundColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [filled ? '#1a1a1a' : showOutline ? '#0a0a0a' : colors.box, colors.keyCorrect],
  });
  const letterColor = settle.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.keyCorrect, colors.letterFill],
  });

  return (
    <Animated.View
      style={[
        styles.box,
        filled && styles.boxFilled,
        showOutline && !filled && styles.boxOutline,
        { backgroundColor, width, height },
      ]}
    >
      {filled ? (
        <Animated.Text style={[styles.letterFill, { color: letterColor, fontSize }]}>{ch}</Animated.Text>
      ) : showOutline ? (
        <Text style={[styles.letterGhost, { fontSize }]}>{ch}</Text>
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
  hintNonce,
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
  const [lettersWidth, setLettersWidth] = useState(0);
  const picture = spellingImageSource(word, imageUri);
  const metrics = letterMetrics(word.length, lettersWidth);

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
          {picture ? (
            <Image source={picture} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.image, styles.imageMissing]}>
              <Text style={styles.imageMissingText}>No picture</Text>
            </View>
          )}
        </View>
        <View
          style={styles.lettersCol}
          onLayout={(e) => {
            const next = Math.floor(e.nativeEvent.layout.width);
            if (next > 0 && next !== lettersWidth) setLettersWidth(next);
          }}
        >
          <Text style={styles.spell}>{word ? 'Spell' : 'Ask an adult'}</Text>
          <Animated.View style={{ transform: [{ scale }], opacity }}>
            <View style={[styles.letters, { gap: metrics.gap }]}>
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
                    width={metrics.w}
                    height={metrics.h}
                    fontSize={metrics.font}
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
          hintNonce={hintNonce}
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
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minWidth: 0,
  },
  spell: {
    color: colors.textDim,
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 1,
  },
  letters: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.boxBorder,
    backgroundColor: colors.box,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: '#5a5a5a',
  },
  boxOutline: {
    borderColor: '#2a2a2a',
  },
  letterFill: {
    color: colors.letterFill,
    fontSize: 88,
    fontWeight: '800',
  },
  letterGhost: {
    color: colors.letterOutline,
    fontSize: 88,
    fontWeight: '500',
  },
  askHelp: {
    color: colors.text,
    fontSize: 22,
    textAlign: 'center',
    padding: 24,
  },
});
