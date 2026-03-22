import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AnalysisResult } from '../types/analysis';

export type HomeStackParamList = {
  HomeDashboard: undefined;
  CreateVideo: undefined;
  RecordVideo: undefined;
  UploadedVideoReview: { videoUri: string };
  AnalysisLoading: { jobId: string };
  AnalysisResults: { result: AnalysisResult; fromAnalysis?: boolean };
  AnalysisSummary: { result: AnalysisResult };
  ShareResults: { result: AnalysisResult };
  Notifications: undefined;
};

export type AuthStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Feed: undefined;
  Create: undefined;
  Metrics: undefined;
  Profile: { userId?: string } | undefined;
};

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;
