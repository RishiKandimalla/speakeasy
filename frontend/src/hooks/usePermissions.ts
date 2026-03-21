import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';

/**
 * Requests camera, microphone, and media-library (write) access for recording and saving video.
 */
export function usePermissions() {
  const [camera, requestCamera] = useCameraPermissions();
  const [microphone, requestMic] = useMicrophonePermissions();
  const [media, requestMedia] = MediaLibrary.usePermissions({ writeOnly: true });
  const [requested, setRequested] = useState(false);

  const requestAll = useCallback(async () => {
    await requestCamera();
    await requestMic();
    await requestMedia();
  }, [requestCamera, requestMic, requestMedia]);

  useEffect(() => {
    if (requested) return;
    setRequested(true);
    void requestAll();
  }, [requested, requestAll]);

  const allGranted =
    camera?.granted === true &&
    microphone?.granted === true &&
    media?.granted === true;

  const ready =
    camera !== null && microphone !== null && media !== null;

  return { allGranted, ready, requestAll, camera, microphone, media };
}
