import { useLayoutEffect } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import type { HomeStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CreateVideo'>;

export function CreateVideoScreen() {
  const navigation = useNavigation<Nav>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.replace('AnalysisLoading', {})}
          hitSlop={8}
          style={styles.headerLink}
        >
          <Text style={styles.headerLinkText} numberOfLines={1}>
            Skip to demo
          </Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const pickVideo = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Upload is not supported on web in this build.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow library access to upload a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoQuality: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      navigation.navigate('UploadedVideoReview', {
        videoUri: result.assets[0].uri,
      });
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Create</Text>
        <Text style={styles.title} numberOfLines={2}>
          New speaking session
        </Text>
        <Text style={styles.sub} numberOfLines={3}>
          Pick how you want to begin. You can record live or upload an existing clip.
        </Text>
      </View>

      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('RecordVideo')}
        accessibilityRole="button"
      >
        <View style={[styles.iconCircle, styles.iconCirclePrimary]}>
          <Ionicons name="videocam" size={28} color={colors.primary} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            Record video
          </Text>
          <Text style={styles.cardDesc} numberOfLines={3}>
            Use your camera to record
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </Pressable>

      <Pressable
        style={styles.card}
        onPress={() => void pickVideo()}
        accessibilityRole="button"
      >
        <View style={[styles.iconCircle, styles.iconCircleMuted]}>
          <Ionicons name="cloud-upload-outline" size={28} color={colors.primaryMuted} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            Upload video
          </Text>
          <Text style={styles.cardDesc} numberOfLines={3}>
            Choose a file from your device
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
    paddingBottom: spacing.xxl * 2,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.primaryMuted,
    marginBottom: spacing.sm,
  },
  headerLink: {
    marginRight: spacing.sm,
    maxWidth: 140,
  },
  headerLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sub: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCirclePrimary: {
    backgroundColor: colors.cardElevated,
  },
  iconCircleMuted: {
    backgroundColor: colors.cardElevated,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
