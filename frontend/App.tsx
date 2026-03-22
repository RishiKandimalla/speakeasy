import { Ionicons } from '@expo/vector-icons';
import {
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
} from '@expo-google-fonts/jost';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { useFonts } from 'expo-font';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import type { AuthStackParamList, HomeStackParamList } from './src/navigation/types';
import { AnalysisLoadingScreen } from './src/screens/AnalysisLoadingScreen';
import { AnalysisResultsScreen } from './src/screens/AnalysisResultsScreen';
import { AnalysisSummaryScreen } from './src/screens/AnalysisSummaryScreen';
import { ShareResultsScreen } from './src/screens/ShareResultsScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { CreateVideoScreen } from './src/screens/CreateVideoScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { HomeDashboardScreen } from './src/screens/HomeDashboardScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MetricsScreen } from './src/screens/MetricsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RecordVideoScreen } from './src/screens/RecordVideoScreen';
import { UploadedVideoReviewScreen } from './src/screens/UploadedVideoReviewScreen';
import { authColors, colors } from './src/theme';
import { initPublishedJobs } from './src/lib/publishedJobs';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text, fontWeight: '600' as const, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function PlusActionScreen() {
  return <View style={{ flex: 1, backgroundColor: authColors.background }} />;
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator initialRouteName="HomeDashboard" screenOptions={stackScreenOptions}>
      <HomeStack.Screen
        name="HomeDashboard"
        component={HomeDashboardScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="CreateVideo"
        component={CreateVideoScreen}
        options={{ title: 'New video' }}
      />
      <HomeStack.Screen name="RecordVideo" component={RecordVideoScreen} options={{ title: 'Record' }} />
      <HomeStack.Screen
        name="UploadedVideoReview"
        component={UploadedVideoReviewScreen}
        options={{ title: 'Review' }}
      />
      <HomeStack.Screen name="AnalysisLoading" component={AnalysisLoadingScreen} />
      <HomeStack.Screen
        name="AnalysisResults"
        component={AnalysisResultsScreen}
        options={{ title: 'Live review', headerBackVisible: false }}
      />
      <HomeStack.Screen
        name="AnalysisSummary"
        component={AnalysisSummaryScreen}
        options={{ title: 'Session results' }}
      />
      <HomeStack.Screen
        name="ShareResults"
        component={ShareResultsScreen}
        options={{ title: 'Share' }}
      />
      <HomeStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </HomeStack.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <AuthStack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FCFBF3' } }}
      >
        <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
        <AuthStack.Screen name="SignIn" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: authColors.background,
          borderTopColor: '#DCD8CA',
          borderTopWidth: 1,
          height: 74,
          paddingTop: 8,
          paddingBottom: 14,
        },
        tabBarActiveTintColor: '#3E4A2E',
        tabBarInactiveTintColor: '#ADB39A',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          display: 'none',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="videocam-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Create"
        component={PlusActionScreen}
        options={({ navigation }) => ({
          title: '',
          tabBarButton: () => (
            <Pressable
              onPress={() => (navigation as any).navigate('Home', { screen: 'CreateVideo' })}
              style={styles.plusButtonWrap}
            >
              <View style={styles.plusButton}>
                <Ionicons name="add" size={30} color="#FFFFFF" />
              </View>
            </Pressable>
          ),
        })}
      />
      <Tab.Screen
        name="Metrics"
        component={MetricsScreen}
        options={{
          title: 'Metrics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="download-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  // Kick off async load of persisted published-job IDs as early as possible.
  // No need to await — ProfileScreen's useFocusEffect re-renders after it resolves.
  initPublishedJobs();

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  plusButtonWrap: {
    top: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#30410D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
});
