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

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;
