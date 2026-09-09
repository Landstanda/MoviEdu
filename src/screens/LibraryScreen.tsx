import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GearButton } from '../components/GearButton';
import { listMedia } from '../db/media';
import { displayMovieTitle, formatBytes, formatClock } from '../format';
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
        <GearButton onPress={onParent} />
      </View>
      <Text style={styles.sub}>Tap a movie to play</Text>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {movies.map((m) => (
          <Pressable key={m.id} onPress={() => onOpenMovie(m.id)} style={styles.row}>
            <Text style={styles.title} numberOfLines={2}>
              {displayMovieTitle(m.title, m.fileUri)}
            </Text>
            <Text style={styles.meta}>Length  {m.durationSec != null ? formatClock(m.durationSec) : 'Unknown'}</Text>
            <Text style={styles.meta}>Size  {formatBytes(m.byteSize)}</Text>
            <Text style={styles.resume}>
              {m.positionSec > 0.5 ? `Resume at ${formatClock(m.positionSec)}` : 'Not started'}
            </Text>
          </Pressable>
        ))}
        {movies.length === 0 ? (
          <Text style={styles.empty}>
            No movies yet. Tap the gear (upper right), create a parent PIN, then import an MP4 from Play.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 24,
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
  sub: {
    color: colors.textDim,
    fontSize: 16,
    marginTop: 10,
    marginBottom: 14,
  },
  list: {
    gap: 12,
    paddingBottom: 32,
  },
  row: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#5a5a5a',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  meta: {
    color: '#e0e0e0',
    fontSize: 17,
    marginTop: 2,
  },
  resume: {
    color: colors.orange,
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    color: colors.textDim,
    fontSize: 16,
    lineHeight: 22,
  },
});
