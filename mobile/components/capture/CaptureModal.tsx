/**
 * CaptureModal.tsx — Bottom sheet for initiating document capture
 *
 * Three entry points:
 *   1. 📷 Scan  — Camera capture → review → save
 *   2. 🖼️ Photo  — Photo library → review → save
 *   3. 📄 File   — Document picker (PDF / image) → save
 *
 * After capture the user lands on the DocumentReviewScreen before saving.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCamera } from '@/hooks/useCamera';
import { useDocumentPicker } from '@/hooks/useDocumentPicker';
import { C, T, R, S } from '@/theme/tokens';

interface CaptureModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CaptureModal({ visible, onClose }: CaptureModalProps) {
  const insets = useSafeAreaInsets();
  const { capture, isLoading: cameraLoading } = useCamera();
  const { pickFile, pickPhoto, isLoading: pickerLoading } = useDocumentPicker();
  const isLoading = cameraLoading || pickerLoading;

  const handleCamera = useCallback(async () => {
    const result = await capture();
    if (result.status === 'captured') {
      onClose();
      router.push({
        pathname: '/capture/review',
        params: { uri: result.uri, source: 'camera' },
      });
    } else if (result.status === 'denied') {
      // TODO: show settings prompt — Phase 3
    }
  }, [capture, onClose]);

  const handlePhoto = useCallback(async () => {
    const result = await pickPhoto();
    if (result.status === 'picked') {
      onClose();
      router.push({
        pathname: '/capture/review',
        params: { uri: result.uri, name: result.name, source: 'photo' },
      });
    }
  }, [pickPhoto, onClose]);

  const handleFile = useCallback(async () => {
    const result = await pickFile();
    if (result.status === 'picked') {
      onClose();
      router.push({
        pathname: '/capture/review',
        params: {
          uri: result.uri,
          name: result.name,
          mimeType: result.mimeType,
          size: String(result.size),
          source: 'file',
        },
      });
    }
  }, [pickFile, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + S[4] }]}
          onPress={() => {}} // prevent backdrop close when pressing sheet
        >
          {/* Handle bar */}
          <View style={styles.handle} />

          <Text style={styles.title}>Add Document</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.amber} />
              <Text style={styles.loadingText}>Opening…</Text>
            </View>
          ) : (
            <View style={styles.options}>
              <CaptureOption
                emoji="📷"
                label="Scan Document"
                description="Use your camera"
                onPress={handleCamera}
              />
              <CaptureOption
                emoji="🖼️"
                label="Choose Photo"
                description="From your photo library"
                onPress={handlePhoto}
              />
              <CaptureOption
                emoji="📄"
                label="Import File"
                description="PDF or image from Files"
                onPress={handleFile}
              />
            </View>
          )}

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface OptionProps {
  emoji: string;
  label: string;
  description: string;
  onPress: () => void;
}

function CaptureOption({ emoji, label, description, onPress }: OptionProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.option,
        pressed && styles.optionPressed,
      ]}
      onPress={onPress}
      android_ripple={{ color: C.ink3 }}
    >
      <View style={styles.optionIcon}>
        <Text style={styles.optionEmoji}>{emoji}</Text>
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S[3],
    paddingHorizontal: S[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.ink4,
    alignSelf: 'center',
    marginBottom: S[4],
  },
  title: {
    fontSize: T.lg,
    fontWeight: '600',
    color: C.cream,
    marginBottom: S[4],
    textAlign: 'center',
  },
  options: {
    gap: S[2],
    marginBottom: S[4],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    padding: S[4],
    minHeight: 64,
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: C.ink4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: S[3],
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.cream,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: T.sm,
    color: C.ash,
  },
  chevron: {
    fontSize: 22,
    color: C.ash,
    lineHeight: 26,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S[4],
    minHeight: 52,
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: S[12],
    gap: S[3],
  },
  loadingText: {
    fontSize: T.sm,
    color: C.ash,
  },
});
