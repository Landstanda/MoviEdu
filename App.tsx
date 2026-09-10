import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { ParentSheet } from './src/components/ParentSheet';
import { getDb } from './src/db/client';
import { seedBundledSpellingWords } from './src/db/words';
import { getMedia, getResumeMedia, setLastPlayedMediaId } from './src/db/media';
import { recoverImportedMovies } from './src/files';
import { loadActiveTrial } from './src/db/trial';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { PlayerScreen, type PlayerHandle } from './src/screens/PlayerScreen';
import { colors } from './src/theme';

type Route = { name: 'library' } | { name: 'player'; mediaId: string };

export default function App() {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>({ name: 'library' });
  const [parentOpen, setParentOpen] = useState(false);
  const [libraryKey, setLibraryKey] = useState(0);
  const playerRef = useRef<PlayerHandle>(null);

  useEffect(() => {
    (async () => {
      try {
        await getDb();
        await recoverImportedMovies();
        await seedBundledSpellingWords();
        const trial = await loadActiveTrial();
        const fromTrial = trial?.mediaId ? await getMedia(trial.mediaId) : null;
        const resume = fromTrial ?? (await getResumeMedia());
        if (resume) {
          await setLastPlayedMediaId(resume.id);
          setRoute({ name: 'player', mediaId: resume.id });
        }
      } catch (err) {
        console.warn('boot failed', err);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (parentOpen) {
        setParentOpen(false);
        setLibraryKey((n) => n + 1);
        playerRef.current?.reloadSettings();
        return true;
      }
      if (route.name === 'player') {
        playerRef.current?.onHardwareBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [parentOpen, route]);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden={route.name === 'player'} />
      {route.name === 'library' ? (
        <LibraryScreen
          key={libraryKey}
          onOpenMovie={(id) => {
            void setLastPlayedMediaId(id);
            setRoute({ name: 'player', mediaId: id });
          }}
          onParent={() => setParentOpen(true)}
        />
      ) : (
        <PlayerScreen
          ref={playerRef}
          mediaId={route.mediaId}
          onLibrary={() => setRoute({ name: 'library' })}
          onParent={() => setParentOpen(true)}
        />
      )}
      <ParentSheet
        visible={parentOpen}
        onClose={() => {
          setParentOpen(false);
          setLibraryKey((n) => n + 1);
          playerRef.current?.reloadSettings();
        }}
        onMediaChanged={() => {
          setLibraryKey((n) => n + 1);
          if (route.name === 'player') {
            setRoute({ name: 'library' });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
