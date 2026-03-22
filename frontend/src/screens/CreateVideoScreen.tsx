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
import { radius, spacing } from '../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CreateVideo'>;

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
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Low,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      navigation.navigate('UploadedVideoReview', {
        videoUri: result.assets[0].uri,
      });
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header — Figma: back chevron + "New video" Jost 500 16px #263103 */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#263103" />
        </Pressable>
        <Text style={styles.headerTitle}>New video</Text>
      </View>

      {/* Body — vertically centred */}
      <View style={styles.body}>
        {/* Hero — Figma: Corben 30px #111827, Jost 400 13px #6B7280 */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            How do you want{'\n'}to create your video?
          </Text>
          <Text style={styles.heroSub}>
            Record live or upload one you already have
          </Text>
        </View>

        {/* Record card — Figma: #757D5C solid fill, Corben 16px white title */}
        <Pressable
          style={({ pressed }) => [styles.cardDark, pressed && styles.cardDarkPressed]}
          onPress={() => navigation.navigate('RecordVideo')}
          accessibilityRole="button"
        >
          <View style={styles.iconWrapDark}>
            <Ionicons name="videocam-outline" size={24} color="white" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitleLight}>Record Video</Text>
            <Text style={styles.cardDescLight}>
              Use your camera to record a new speaking video
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.50)" />
        </Pressable>

        {/* Upload card — Figma: rgba(255,255,255,0.55) frosted, Corben 16px #111827 title */}
        <Pressable
          style={({ pressed }) => [styles.cardLight, pressed && styles.cardLightPressed]}
          onPress={() => void pickVideo()}
          accessibilityRole="button"
        >
          <View style={styles.iconWrapLight}>
            <Ionicons name="arrow-up-circle-outline" size={24} color="#4A5240" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitleDark}>Upload Video</Text>
            <Text style={styles.cardDescDark}>
              Choose an existing video from your device
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Footer — Figma: Jost 400 11px #6B7280 centred */}
      <Text style={styles.footer}>
        Videos are kept private by default. You choose what to share after recording.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFAE0', // Figma cream
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma: Jost 500 16px #263103
  headerTitle: {
    fontFamily: 'Jost_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: '#263103',
  },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  // Figma: Corben 400 30px #111827 centred, lineHeight ~44 for Corben
  heroTitle: {
    fontFamily: 'Corben_400Regular',
    fontSize: 30,
    lineHeight: 44,
    color: '#111827',
    textAlign: 'center',
    marginBottom: spacing.sm,
    includeFontPadding: false,
  },
  // Figma: Jost 400 13px #6B7280
  heroSub: {
    fontFamily: 'Jost_400Regular',
    fontSize: 13,
    lineHeight: 19.5,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Record card — Figma: #757D5C fill, radius 16, olive border
  cardDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#757D5C',
    borderRadius: 16,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderWidth: 1.27,
    borderColor: 'rgba(38, 49, 3, 0.20)',
  },
  cardDarkPressed: {
    backgroundColor: '#636950',
  },

  // Upload card — Figma: rgba(255,255,255,0.55) frosted, same border
  cardLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 16,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderWidth: 1.27,
    borderColor: 'rgba(38, 49, 3, 0.18)',
  },
  cardLightPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },

  // Icon wraps — Figma: 48×48 radius 14
  iconWrapDark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapLight: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 82, 64, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  cardText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  // Record card text — Figma: Corben 400 16px white title, Jost 500 13px rgba(255,255,255,0.70) desc
  cardTitleLight: {
    fontFamily: 'Corben_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: 'white',
    includeFontPadding: false,
  },
  cardDescLight: {
    fontFamily: 'Jost_500Medium',
    fontSize: 13,
    lineHeight: 21,
    color: 'rgba(255, 255, 255, 0.70)',
  },

  // Upload card text — Figma: Corben 400 16px #111827 title, Jost 500 13px #6B7280 desc
  cardTitleDark: {
    fontFamily: 'Corben_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#111827',
    includeFontPadding: false,
  },
  cardDescDark: {
    fontFamily: 'Jost_500Medium',
    fontSize: 13,
    lineHeight: 21,
    color: '#6B7280',
  },

  // Footer — Figma: Jost 400 11px #6B7280 centred
  footer: {
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
    lineHeight: 17.9,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
});