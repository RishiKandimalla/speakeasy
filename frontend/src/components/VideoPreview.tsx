import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { colors, radius } from '../theme';

type VideoPreviewProps = {
  uri: string;
  isPlaying: boolean;
};

export function VideoPreview({ uri, isPlaying }: VideoPreviewProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  return (
    <View style={styles.wrap}>
      <VideoView player={player} style={styles.video} nativeControls />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxHeight: 300,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  video: {
    width: '100%',
    height: 250,
  },
});
