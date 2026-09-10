import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../theme';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const TOP_KEYS = ROWS[0].length;
const GAP = 6;
const KEY_H = 100;
const H_PAD = 16;

type Props = {
  onLetter: (letter: string) => void;
  hintLetter: string | null;
  hintNonce: number;
  wiggleLetter: string | null;
  wiggleNonce: number;
  correctLetter: string | null;
  correctNonce: number;
  disabled?: boolean;
};

function Key({
  letter,
  hinted,
  hintNonce,
  wiggle,
  wiggleNonce,
  correct,
  correctNonce,
  onPress,
  disabled,
  width,
  height,
}: {
  letter: string;
  hinted: boolean;
  hintNonce: number;
  wiggle: boolean;
  wiggleNonce: number;
  correct: boolean;
  correctNonce: number;
  onPress: () => void;
  disabled?: boolean;
  width: number;
  height: number;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  const red = useRef(new Animated.Value(0)).current;
  const green = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const pressGen = useRef(0);
  const seenHint = useRef(hintNonce);
  const seenWiggle = useRef(wiggleNonce);
  const seenCorrect = useRef(correctNonce);

  useEffect(() => {
    if (!wiggle || wiggleNonce === seenWiggle.current) return;
    seenWiggle.current = wiggleNonce;
    pressGen.current += 1;
    green.stopAnimation();
    green.setValue(0);
    press.setValue(0);
    shake.setValue(0);
    red.stopAnimation();
    red.setValue(1);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    Animated.timing(red, {
      toValue: 0,
      duration: 380,
      delay: 120,
      useNativeDriver: true,
    }).start();
  }, [wiggle, wiggleNonce, shake, red, green, press]);

  useEffect(() => {
    if (!hinted || hintNonce === seenHint.current) return;
    seenHint.current = hintNonce;
    pressGen.current += 1;
    red.stopAnimation();
    red.setValue(0);
    press.setValue(0);
    green.stopAnimation();
    green.setValue(0);
    Animated.sequence([
      Animated.timing(green, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(green, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ]).start();
  }, [hinted, hintNonce, red, green, press]);

  useEffect(() => {
    if (!correct || correctNonce === seenCorrect.current) return;
    seenCorrect.current = correctNonce;
    pressGen.current += 1;
    red.stopAnimation();
    red.setValue(0);
    press.setValue(0);
    green.stopAnimation();
    green.setValue(1);
    Animated.timing(green, {
      toValue: 0,
      duration: 420,
      delay: 160,
      useNativeDriver: true,
    }).start();
  }, [correct, correctNonce, red, green, press]);

  const translateX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  return (
    <Animated.View style={{ transform: [{ translateX }], width, height }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          if (disabled) return;
          pressGen.current += 1;
          press.setValue(1);
        }}
        onPressOut={() => {
          if (disabled) return;
          const gen = pressGen.current;
          setTimeout(() => {
            if (pressGen.current !== gen) return;
            Animated.timing(press, { toValue: 0, duration: 160, useNativeDriver: true }).start();
          }, 80);
        }}
        style={[styles.keyHit, { width, height }]}
      >
        <View style={[styles.key, { width, height }]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { backgroundColor: colors.keyPress, opacity: press }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { backgroundColor: colors.danger, opacity: red }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.glow, { backgroundColor: colors.keyCorrect, opacity: green }]}
          />
          <Text style={styles.keyText}>{letter}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function LetterKeyboard({
  onLetter,
  hintLetter,
  hintNonce,
  wiggleLetter,
  wiggleNonce,
  correctLetter,
  correctNonce,
  disabled,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const inner = Math.max(0, screenW - H_PAD);
  const keyW = (inner - GAP * (TOP_KEYS - 1)) / TOP_KEYS;

  return (
    <View style={styles.wrap}>
      {ROWS.map((row, i) => (
        <View
          key={i}
          style={[
            styles.row,
            i === 1 ? { paddingLeft: (keyW + GAP) * 0.5 } : null,
            i === 2 ? { paddingLeft: (keyW + GAP) * 1.5 } : null,
          ]}
        >
          {row.map((letter) => (
            <Key
              key={letter}
              letter={letter}
              hinted={hintLetter === letter}
              hintNonce={hintNonce}
              wiggle={wiggleLetter === letter}
              wiggleNonce={wiggleNonce}
              correct={correctLetter === letter}
              correctNonce={correctNonce}
              disabled={disabled}
              width={keyW}
              height={KEY_H}
              onPress={() => onLetter(letter)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingHorizontal: 8,
    paddingBottom: 56,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    alignItems: 'center',
  },
  keyHit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  key: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.keyBorder,
    backgroundColor: colors.key,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 8,
  },
  keyText: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    zIndex: 1,
    includeFontPadding: false,
  },
});
