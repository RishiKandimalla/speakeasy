import { useLayoutEffect } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import type { HomeStackParamList } from '../navigation/types';
import { fontFamily, radius, spacing } from '../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CreateVideo'>;

const CREAM = '#fffae0';
const OLIVE = '#4a5240';
const DARK_TEXT = '#111827';
const GRAY_TEXT = '#6b7280';
const HEADER_TEXT = '#263103';

export function CreateVideoScreen() {
  const navigation = useNavigation<Nav>();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
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
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={HEADER_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>New video</Text>
      </View>

      {/* Main content */}
      <View style={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>How do you want{'\n'}to create your video?</Text>
          <Text style={styles.heroSub}>Record live or upload one you already have</Text>
        </View>

        {/* Record video card */}
        <Pressable
          style={styles.cardDark}
          onPress={() => navigation.navigate('RecordVideo')}
          accessibilityRole="button"
        >
          <View style={styles.iconWrapDark}>
            <Ionicons name="videocam-outline" size={24} color="#fff" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitleLight}>Record video</Text>
            <Text style={styles.cardDescLight}>Use your camera to record a new speaking video</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Upload video card */}
        <Pressable
          style={styles.cardLight}
          onPress={() => void pickVideo()}
          accessibilityRole="button"
        >
          <View style={styles.iconWrapLight}>
            <Ionicons name="arrow-up-circle-outline" size={24} color={OLIVE} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitleDark}>Upload video</Text>
            <Text style={styles.cardDescDark}>Choose an existing video from your device</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={GRAY_TEXT} />
        </Pressable>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Videos are kept private by default. You choose what to share after recording.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CREAM,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    color: HEADER_TEXT,
    fontWeight: '500',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroTitle: {
    fontFamily: fontFamily.playfairSemiBold,
    fontSize: 30,
    color: DARK_TEXT,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: spacing.sm,
  },
  heroSub: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: GRAY_TEXT,
    textAlign: 'center',
  },
  cardDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OLIVE,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1.3,
    borderColor: 'rgba(38,49,3,0.2)',
  },
  cardLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1.3,
    borderColor: 'rgba(38,49,3,0.18)',
  },
  iconWrapDark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapLight: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(74,82,64,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleLight: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  cardDescLight: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  cardTitleDark: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    color: DARK_TEXT,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  cardDescDark: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: GRAY_TEXT,
    lineHeight: 20,
  },
  footer: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: GRAY_TEXT,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxl,
    lineHeight: 18,
  },
});
