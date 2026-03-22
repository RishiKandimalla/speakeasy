import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import type { HomeStackParamList } from './src/navigation/types';
import { AnalysisLoadingScreen } from './src/screens/AnalysisLoadingScreen';
import { AnalysisResultsScreen } from './src/screens/AnalysisResultsScreen';
import { CreateVideoScreen } from './src/screens/CreateVideoScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { HomeDashboardScreen } from './src/screens/HomeDashboardScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RecordVideoScreen } from './src/screens/RecordVideoScreen';
import { CloudVideosScreen } from './src/screens/CloudVideosScreen';
import { SavedVideosScreen } from './src/screens/SavedVideosScreen';
import { UploadedVideoReviewScreen } from './src/screens/UploadedVideoReviewScreen';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

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
  headerTitleStyle: { color: colors.text, fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

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
        options={{ title: 'Results', headerBackVisible: false }}
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
    return <LoginScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle-outline" size={size} color={color} />
          ),
        }}
      />
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
        name="Cloud"
        component={CloudVideosScreen}
        options={{
          title: 'Cloud',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedVideosScreen}
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
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
