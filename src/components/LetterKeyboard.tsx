import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

type Props = {
  onLetter: (letter: string) => void;
  hintLetter: string | null;
  wiggleLetter: string | null;
  wiggleNonce: number;
  disabled?: boolean;
};

function Key({
  letter,
  hinted,
  wiggle,
  wiggleNonce,
  onPress,
  disabled,
}: {
  letter: string;
  hinted: boolean;
  wiggle: boolean;
  wiggleNonce: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(hinted ? 1 : 0)).current;

  useEffect(() => {
    if (!wiggle) return;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [wiggle, wiggleNonce, shake]);

  useEffect(() => {
    Animated.timing(glow, {
      toValue: hinted ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [hinted, glow]);

  const translateX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  const backgroundColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.key, colors.keyHint],
  });

  return (
    <Animated.View style={{ transform: [{ translateX }], flex: 1 }}>
      <Pressable onPress={onPress} disabled={disabled} style={styles.keyHit}>
        <Animated.View style={[styles.key, { backgroundColor }]}>
          <Text style={styles.keyText}>{letter}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function LetterKeyboard({
  onLetter,
  hintLetter,
  wiggleLetter,
  wiggleNonce,
  disabled,
}: Props) {
  return (
    <View style={styles.wrap}>
      {ROWS.map((row, i) => (
        <View key={i} style={[styles.row, i === 1 && styles.rowIndent, i === 2 && styles.rowIndent2]}>
          {row.map((letter) => (
            <Key
              key={letter}
              letter={letter}
              hinted={hintLetter === letter}
              wiggle={wiggleLetter === letter}
              wiggleNonce={wiggleNonce}
              disabled={disabled}
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
    paddingBottom: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  rowIndent: {
    paddingHorizontal: 18,
  },
  rowIndent2: {
    paddingHorizontal: 52,
  },
  keyHit: {
    minHeight: 64,
  },
  key: {
    flex: 1,
    minHeight: 64,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.keyBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
});
