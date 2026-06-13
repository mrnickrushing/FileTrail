import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type DocumentScannerResult =
  | { status: 'captured'; uri: string; mimeType: string; name: string }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export function useDocumentScanner() {
  const [isLoading, setIsLoading] = useState(false);

  const scan = useCallback(async (): Promise<DocumentScannerResult> => {
    setIsLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { status: 'denied' };
      }

      if (Platform.OS === 'web') {
        return {
          status: 'error',
          message: 'Document scanning requires an installed iOS or Android build.',
        };
      }

      // Fallback: standard camera via expo-image-picker (works in Expo Go and any build).
      const photo = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.92,
        allowsEditing: false,
      });

      if (photo.canceled) {
        return { status: 'cancelled' };
      }

      const asset = photo.assets?.[0];
      if (!asset?.uri) {
        return { status: 'cancelled' };
      }

      return {
        status: 'captured',
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        name: `Scan-${Date.now()}.jpg`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/permission|camera/i.test(message)) {
        return { status: 'denied' };
      }
      return { status: 'error', message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { scan, isLoading };
}
