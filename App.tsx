import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { ParentSheet } from './src/components/ParentSheet';
import { getDb } from './src/db/client';
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
      await getDb();
      const trial = await loadActiveTrial();
      if (trial?.mediaId) {
        setRoute({ name: 'player', mediaId: trial.mediaId });
      }
      setReady(true);
    })();
  }, []);

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
          onOpenMovie={(id) => setRoute({ name: 'player', mediaId: id })}
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
        inLesson={route.name === 'player'}
        onClose={() => {
          setParentOpen(false);
          setLibraryKey((n) => n + 1);
          playerRef.current?.reloadSettings();
        }}
        onSkipTrial={() => {
          playerRef.current?.skipTrial();
          setParentOpen(false);
        }}
        onEndSitting={() => {
          playerRef.current?.endSitting();
          setParentOpen(false);
        }}
        onRunTestTrial={() => {
          setParentOpen(false);
          if (route.name !== 'player') {
            Alert.alert('Open a movie first', 'Tap the movie, then use Run test trial.');
            return;
          }
          playerRef.current?.runTestTrial();
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
