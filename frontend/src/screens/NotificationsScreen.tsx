import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors, fontFamily, spacing } from '../theme';

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Notifications</Text>
      <View style={styles.empty}>
        <View style={styles.iconWrap}>
          <Ionicons name="notifications-off-outline" size={34} color="#B8BFAB" />
        </View>
        <Text style={styles.emptyTitle}>All caught up</Text>
        <Text style={styles.emptyBody}>
          You'll see activity like feedback on your videos and social updates here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authColors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 28,
    color: '#1F2A16',
    marginBottom: spacing.xxl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F2F3EE',
    borderWidth: 1,
    borderColor: '#DDD8CA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 20,
    color: '#1F2A16',
  },
  emptyBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: '#A1A8BC',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 21,
  },
});
