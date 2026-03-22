import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EMOJI_DISPLAY,
  listNotifications,
  markNotificationsRead,
  type NotificationItem,
  type ReactionEmoji,
} from '../lib/api';
import { authColors, fontFamily, radius, spacing } from '../theme';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationCard({ item }: { item: NotificationItem }) {
  const emojiChar = item.emoji
    ? EMOJI_DISPLAY[item.emoji as ReactionEmoji] ?? item.emoji
    : '';

  return (
    <View style={[styles.card, !item.read && styles.cardUnread]}>
      <View style={styles.emojiCircle}>
        <Text style={styles.emojiText}>{emojiChar || '💬'}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>
          Someone reacted {emojiChar} to your post
        </Text>
        <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </View>
  );
}

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await listNotifications();
      setNotifications(items);
      const unreadIds = items
        .filter((n) => !n.read)
        .map((n) => n.notification_id);
      if (unreadIds.length) {
        void markNotificationsRead(unreadIds).catch(() => {});
      }
    } catch {
      // keep existing list on error
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => <NotificationCard item={item} />,
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Notifications</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#678A45" />
        </View>
      ) : !notifications.length ? (
        <View style={styles.empty}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="notifications-off-outline"
              size={34}
              color="#B8BFAB"
            />
          </View>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptyBody}>
            You'll see activity like reactions on your posts here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 40,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFC',
    borderWidth: 1,
    borderColor: '#DDE1EA',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardUnread: {
    backgroundColor: '#F4F7EE',
    borderColor: '#C5CDB5',
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: '#1F2A16',
  },
  cardTime: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: '#8E95A8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#678A45',
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
