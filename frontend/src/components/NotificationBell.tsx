import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getUnreadNotificationCount } from '../lib/api';
import { fontFamily } from '../theme';

export function NotificationBell({ size = 22, color = '#1F2A16' }: { size?: number; color?: string }) {
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getUnreadNotificationCount()
        .then((c) => {
          if (!cancelled) setCount(c);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <View>
      <Ionicons name="notifications-outline" size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D94040',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 9,
    color: '#fff',
    lineHeight: 12,
  },
});
