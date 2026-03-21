import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VideoPreview } from '../components/VideoPreview';
import {
  deleteSavedVideo,
  listSavedVideos,
  type SavedVideo,
} from '../lib/savedVideos';

function formatLabel(item: SavedVideo): string {
  const m = item.filename.match(/^video_(\d+)\./);
  if (m) {
    const d = new Date(Number(m[1]));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString();
    }
  }
  return item.filename;
}

export function SavedVideosScreen() {
  const [items, setItems] = useState<SavedVideo[]>([]);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);

  const reload = useCallback(async () => {
    if (Platform.OS === 'web') {
      setItems([]);
      return;
    }
    try {
      const list = await listSavedVideos();
      setItems(list);
    } catch (e) {
      Alert.alert('Could not load saved videos', String(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onDelete = useCallback(
    (item: SavedVideo) => {
      Alert.alert('Delete video', `Remove "${formatLabel(item)}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteSavedVideo(item.uri);
                if (playingUri === item.uri) {
                  setPlayingUri(null);
                  setPlaybackPlaying(false);
                }
                await reload();
              } catch (e) {
                Alert.alert('Delete failed', String(e));
              }
            })();
          },
        },
      ]);
    },
    [playingUri, reload],
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Saved</Text>
        <Text style={styles.hint}>
          In-app saved videos are not available on web.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Saved in app</Text>
      <Text style={styles.hint}>
        Stored in app documents (not camera roll). Persists until you delete or uninstall.
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.uri}
        ListEmptyComponent={
          <Text style={styles.empty}>No saved videos yet.</Text>
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowLabel} numberOfLines={2}>
              {formatLabel(item)}
            </Text>
            <View style={styles.rowActions}>
              <Button
                title={playingUri === item.uri ? 'Hide' : 'Play'}
                onPress={() => {
                  if (playingUri === item.uri) {
                    setPlayingUri(null);
                    setPlaybackPlaying(false);
                  } else {
                    setPlayingUri(item.uri);
                    setPlaybackPlaying(true);
                  }
                }}
              />
              <Button title="Delete" color="#c00" onPress={() => onDelete(item)} />
            </View>
            {playingUri === item.uri && (
              <View style={styles.previewBlock}>
                <VideoPreview uri={item.uri} isPlaying={playbackPlaying} />
                <Button
                  title={playbackPlaying ? 'Pause' : 'Play'}
                  onPress={() => setPlaybackPlaying((p) => !p)}
                />
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  empty: {
    color: '#888',
    marginTop: 24,
    textAlign: 'center',
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  previewBlock: {
    marginTop: 12,
  },
});
