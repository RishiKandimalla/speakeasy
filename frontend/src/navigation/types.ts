import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AnalysisResult } from '../types/analysis';

export type HomeStackParamList = {
  HomeDashboard: undefined;
  CreateVideo: undefined;
  RecordVideo: undefined;
  UploadedVideoReview: { videoUri: string };
  AnalysisLoading: { videoUri?: string | null };
  AnalysisResults: { result: AnalysisResult };
};

export type AuthStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
};

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;
