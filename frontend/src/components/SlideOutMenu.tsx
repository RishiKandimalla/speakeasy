import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { getMyProfile, type ProfileData } from '../lib/api';
import { authColors, fontFamily, spacing } from '../theme';

type SlideOutMenuProps = {
  visible: boolean;
  onClose: () => void;
};

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
};

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <Pressable
          key={item.label}
          style={styles.menuItem}
          onPress={item.onPress ?? (() => Alert.alert('Coming soon', `${item.label} is not available yet.`))}
        >
          <Ionicons name={item.icon} size={20} color="#667052" />
          <Text style={styles.menuItemLabel}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SlideOutMenu({ visible, onClose }: SlideOutMenuProps) {
  const { signOut } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(visible);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const panelWidth = useMemo(() => Dimensions.get('window').width * 0.78, []);
  const slide = useRef(new Animated.Value(1)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      getMyProfile().then(setProfile).catch(() => {});
    }
  }, [visible]);

  const navigate = useCallback(
    (tab: string) => {
      onClose();
      setTimeout(() => navigation.navigate(tab), 220);
    },
    [navigation, onClose],
  );

  const ACCOUNT_ITEMS: MenuItem[] = [
    { icon: 'person-outline', label: 'My Profile', onPress: () => navigate('Profile') },
    { icon: 'trophy-outline', label: 'My Achievements' },
    { icon: 'radio-button-on-outline', label: 'Goals & Progress', onPress: () => navigate('Metrics') },
  ];

  const SOCIAL_ITEMS: MenuItem[] = [
    { icon: 'people-outline', label: 'Find Friends' },
    { icon: 'notifications-outline', label: 'Notifications' },
  ];

  const SETTINGS_ITEMS: MenuItem[] = [
    { icon: 'settings-outline', label: 'App Settings' },
    { icon: 'shield-outline', label: 'Privacy & Data' },
  ];

  const SUPPORT_ITEMS: MenuItem[] = [
    { icon: 'help-circle-outline', label: 'Help & Support' },
    { icon: 'information-circle-outline', label: 'About SpeakEasy' },
    { icon: 'document-text-outline', label: 'Terms & Privacy' },
  ];

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      slide.setValue(1);
      backdropOpacity.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(slide, {
            toValue: 0,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 260,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });
      return;
    }

    if (isMounted) {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 1,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setIsMounted(false);
      });
    }
  }, [backdropOpacity, isMounted, slide, visible]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, panelWidth],
  });

  const handleLogout = async () => {
    onClose();
    try {
      await signOut();
    } catch {
      Alert.alert('Error', 'Failed to sign out.');
    }
  };

  const displayName = profile?.username ?? '—';
  const initial = displayName !== '—' ? displayName[0].toUpperCase() : '?';

  return (
    <Modal visible={isMounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdropShade, { opacity: backdropOpacity }]} />
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}>
          <View style={[styles.topBar, { paddingTop: insets.top + spacing.lg }]}>
            <Text style={styles.menuTitle}>Menu</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons name="close" size={24} color="#273218" />
            </Pressable>
          </View>

          <Pressable style={styles.profileRow} onPress={() => navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileHandle}>@{displayName}</Text>
            </View>
          </Pressable>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <MenuSection title="ACCOUNT" items={ACCOUNT_ITEMS} />
            <MenuSection title="SOCIAL" items={SOCIAL_ITEMS} />
            <MenuSection title="SETTINGS" items={SETTINGS_ITEMS} />
            <MenuSection title="SUPPORT" items={SUPPORT_ITEMS} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.logoutRow} onPress={() => void handleLogout()}>
              <Ionicons name="log-out-outline" size={21} color="#2B340D" />
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  backdrop: {
    flex: 1,
  },
  panel: {
    height: '100%',
    backgroundColor: authColors.background,
    borderLeftWidth: 1,
    borderLeftColor: '#DDD8C9',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  menuTitle: {
    fontFamily: fontFamily.playfairSemiBold,
    fontSize: 36,
    color: '#263103',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#DED8C9',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667052',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.bodySemiBold,
    color: '#FFFFFF',
    fontSize: 21,
  },
  profileName: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 18,
    color: '#263103',
  },
  profileHandle: {
    fontFamily: fontFamily.body,
    color: '#7A7F70',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  section: {
    paddingTop: spacing.sm,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    letterSpacing: 1.3,
    color: '#9D9A8B',
    marginBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: spacing.md,
  },
  menuItemLabel: {
    fontFamily: fontFamily.bodyMedium,
    color: '#2E3621',
    fontSize: 17,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#DED8C9',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: authColors.background,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: spacing.md,
  },
  logoutText: {
    fontFamily: fontFamily.bodySemiBold,
    color: '#2B340D',
    fontSize: 18,
  },
});
