import Slider from '@react-native-community/slider';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GearButton } from './GearButton';
import { formatClock } from '../format';
import { colors } from '../theme';

type Props = {
  visible: boolean;
  playing: boolean;
  currentSec: number;
  durationSec: number;
  untilLessonSec: number | null;
  freePlay: boolean;
  onTogglePlay: () => void;
  onSkip: (deltaSec: number) => void;
  onSeek: (sec: number) => void;
  onSlidingStart?: () => void;
  onStartLessonNow: () => void;
  onParent: () => void;
};

export function VlcChrome({
  visible,
  playing,
  currentSec,
  durationSec,
  untilLessonSec,
  freePlay,
  onTogglePlay,
  onSkip,
  onSeek,
  onSlidingStart,
  onStartLessonNow,
  onParent,
}: Props) {
  if (!visible) return null;

  const untilLabel =
    freePlay || untilLessonSec == null
      ? 'Free play'
      : formatClock(untilLessonSec);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.topRight}>
        <GearButton onPress={onParent} />
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Next lesson</Text>
          <Text style={styles.timerValue}>{untilLabel}</Text>
        </View>
        <Pressable onPress={onStartLessonNow} style={styles.startNow}>
          <Text style={styles.startNowText}>Start lesson now</Text>
        </Pressable>
      </View>

      <View style={styles.bottom}>
        <View style={styles.sliderRow}>
          <Text style={styles.time}>{formatClock(currentSec)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(durationSec, 0.1)}
            value={Math.min(currentSec, Math.max(durationSec, 0))}
            onSlidingStart={onSlidingStart}
            onSlidingComplete={onSeek}
            minimumTrackTintColor={colors.orange}
            maximumTrackTintColor="#6a6a6a"
            thumbTintColor="#ffffff"
          />
          <Text style={styles.time}>{formatClock(durationSec)}</Text>
        </View>
        <View style={styles.buttons}>
          <Pressable onPress={() => onSkip(-10)} style={styles.ctrl}>
            <Text style={styles.ctrlText}>−10</Text>
          </Pressable>
          <Pressable onPress={onTogglePlay} style={styles.play} accessibilityLabel={playing ? 'Pause' : 'Play'}>
            {playing ? (
              <View style={styles.pauseGlyph}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <View style={styles.playTriangle} />
            )}
          </Pressable>
          <Pressable onPress={() => onSkip(10)} style={styles.ctrl}>
            <Text style={styles.ctrlText}>+10</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    zIndex: 30,
  },
  topRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    paddingTop: 18,
    paddingRight: 16,
    gap: 8,
  },
  timerCard: {
    backgroundColor: colors.chrome,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 150,
    alignItems: 'flex-end',
  },
  timerLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  timerValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  startNow: {
    backgroundColor: colors.orange,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  startNowText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '800',
  },
  bottom: {
    backgroundColor: colors.chrome,
    paddingHorizontal: 16,
    paddingBottom: 22,
    paddingTop: 10,
    gap: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slider: {
    flex: 1,
    height: 44,
  },
  time: {
    color: colors.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    minWidth: 52,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
  },
  ctrl: {
    minWidth: 76,
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: '#2b2b2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  play: {
    width: 72,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseGlyph: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseBar: {
    width: 10,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 6,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 24,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ffffff',
  },
});
