import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@streak_reminder_date';

export function setupForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function buildStreakMessage(streakDays: number): { title: string; body: string } {
  if (streakDays === 0) {
    return {
      title: 'Start your streak today',
      body: "You haven't started a streak yet -- record a quick video and get one going!",
    };
  }

  if (streakDays === 1) {
    return {
      title: "You're 1 day in",
      body: "Don't stop now -- record today's video and keep it rolling!",
    };
  }

  return {
    title: `Your ${streakDays}-day streak is on the line`,
    body: `Take two minutes and keep it alive -- don't let ${streakDays} days go to waste!`,
  };
}

export async function scheduleStreakReminder(streakDays: number): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const stored = await AsyncStorage.getItem(STORAGE_KEY);

    if (stored === today) return;

    const granted = await requestNotificationPermissions();
    if (!granted) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const { title, body } = buildStreakMessage(streakDays);

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 120,
      },
    });

    await AsyncStorage.setItem(STORAGE_KEY, today);
  } catch {
    // Silently swallow -- notifications are non-critical
  }
}

export async function resetDailyTracker(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
