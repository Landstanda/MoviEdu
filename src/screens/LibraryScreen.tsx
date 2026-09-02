import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { listMedia } from '../db/media';
import { formatClock } from '../format';
import { colors } from '../theme';
import type { MediaFile } from '../types';

type Props = {
  onOpenMovie: (id: string) => void;
  onParent: () => void;
};

export function LibraryScreen({ onOpenMovie, onParent }: Props) {
  const [movies, setMovies] = useState<MediaFile[]>([]);

  const reload = useCallback(async () => {
    setMovies(await listMedia());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.brand}>MoviEdu</Text>
        <Pressable onPress={onParent} style={styles.lock}>
          <Text style={styles.lockText}>PIN</Text>
        </Pressable>
      </View>
      <Text style={styles.sub}>Tap a movie to play</Text>
      {movies.map((m) => (
        <Pressable key={m.id} onPress={() => onOpenMovie(m.id)} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{m.title}</Text>
            <Text style={styles.meta}>
              {m.positionSec > 0 ? `Resume ${formatClock(m.positionSec)}` : 'Start'}
              {m.durationSec ? ` · ${formatClock(m.durationSec)}` : ''}
            </Text>
          </View>
        </Pressable>
      ))}
      {movies.length === 0 ? (
        <Text style={styles.empty}>
          No movies yet. Tap PIN (upper right), create a parent PIN, then import an MP4 from Sitting.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    color: colors.orange,
    fontSize: 32,
    fontWeight: '900',
  },
  lock: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  lockText: {
    color: colors.textDim,
    fontWeight: '700',
  },
  sub: {
    color: colors.textDim,
    fontSize: 16,
  },
  row: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    color: colors.textDim,
    marginTop: 4,
    fontSize: 15,
  },
  empty: {
    color: colors.textDim,
    fontSize: 16,
    lineHeight: 22,
  },
});
