import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export function GearButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.gear} accessibilityLabel="Settings">
      <Text style={styles.icon}>⚙</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 30,
  },
});
