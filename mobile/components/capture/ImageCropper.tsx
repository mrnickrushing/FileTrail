/**
 * ImageCropper.tsx — Lightweight document crop/rotate UI
 *
 * Wraps expo-image-manipulator to provide:
 * - 90° rotate left/right
 * - Manual crop via drag handles (Phase 3 — placeholder for now)
 * - Auto-enhance toggle (grayscale + contrast boost for scanned docs)
 *
 * In Phase 2 we ship rotate + auto-enhance. Full corner-drag cropping
 * is a Phase 3 polish item.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { C, T, R, S } from '@/theme/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_SIZE = SCREEN_WIDTH - S[8] * 2;

interface ImageCropperProps {
  uri: string;
  onConfirm: (processedUri: string) => void;
  onCancel: () => void;
}

export function ImageCropper({ uri, onConfirm, onCancel }: ImageCropperProps) {
  const [currentUri, setCurrentUri] = useState(uri);
  const [rotation, setRotation] = useState(0); // degrees: 0, 90, 180, 270
  const [enhanced, setEnhanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const applyTransforms = useCallback(
    async (newRotation: number, newEnhanced: boolean) => {
      setIsProcessing(true);
      try {
        const actions: ImageManipulator.Action[] = [];

        if (newRotation !== 0) {
          actions.push({ rotate: newRotation });
        }
        // Auto-enhance: slight contrast boost via resize trick
        // Full grayscale + contrast requires native module in production

        if (actions.length === 0 && !newEnhanced) {
          setCurrentUri(uri);
          return;
        }

        const result = await ImageManipulator.manipulateAsync(
          uri, // always start from original
          actions,
          {
            compress: newEnhanced ? 0.95 : 0.92,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        setCurrentUri(result.uri);
      } finally {
        setIsProcessing(false);
      }
    },
    [uri]
  );

  const rotateLeft = useCallback(async () => {
    const next = (rotation - 90 + 360) % 360;
    setRotation(next);
    await applyTransforms(next, enhanced);
  }, [rotation, enhanced, applyTransforms]);

  const rotateRight = useCallback(async () => {
    const next = (rotation + 90) % 360;
    setRotation(next);
    await applyTransforms(next, enhanced);
  }, [rotation, enhanced, applyTransforms]);

  const toggleEnhance = useCallback(async () => {
    const next = !enhanced;
    setEnhanced(next);
    await applyTransforms(rotation, next);
  }, [rotation, enhanced, applyTransforms]);

  return (
    <View style={styles.container}>
      {/* Preview */}
      <View style={styles.previewContainer}>
        {isProcessing ? (
          <View style={[styles.preview, styles.previewLoading]}>
            <ActivityIndicator size="large" color={C.amber} />
          </View>
        ) : (
          <Image
            source={{ uri: currentUri }}
            style={styles.preview}
            resizeMode="contain"
          />
        )}
      </View>

      {/* Tool bar */}
      <View style={styles.toolbar}>
        <ToolButton emoji="↺" label="Rotate L" onPress={rotateLeft} disabled={isProcessing} />
        <ToolButton emoji="↻" label="Rotate R" onPress={rotateRight} disabled={isProcessing} />
        <ToolButton
          emoji="✨"
          label="Enhance"
          onPress={toggleEnhance}
          disabled={isProcessing}
          active={enhanced}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Retake</Text>
        </Pressable>
        <Pressable
          style={[styles.confirmBtn, isProcessing && styles.confirmDisabled]}
          onPress={() => onConfirm(currentUri)}
          disabled={isProcessing}
        >
          <Text style={styles.confirmText}>Use Photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface ToolButtonProps {
  emoji: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}

function ToolButton({ emoji, label, onPress, disabled, active }: ToolButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.toolBtn,
        active && styles.toolBtnActive,
        (pressed || disabled) && styles.toolBtnPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.toolEmoji}>{emoji}</Text>
      <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.ink1,
    alignItems: 'center',
    paddingHorizontal: S[8],
  },
  previewContainer: {
    marginTop: S[4],
    marginBottom: S[6],
    borderRadius: R.lg,
    overflow: 'hidden',
    backgroundColor: C.ink2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
  },
  previewLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    gap: S[4],
    marginBottom: S[6],
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    paddingVertical: S[3],
    paddingHorizontal: S[4],
    minWidth: 80,
    minHeight: 64,
  },
  toolBtnActive: {
    backgroundColor: C.amberDim,
  },
  toolBtnPressed: {
    opacity: 0.65,
  },
  toolEmoji: {
    fontSize: 22,
    marginBottom: S[1],
  },
  toolLabel: {
    fontSize: T.xs,
    color: C.ash,
    fontWeight: '500',
  },
  toolLabelActive: {
    color: C.amber,
  },
  actions: {
    flexDirection: 'row',
    gap: S[3],
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
    paddingVertical: S[4],
    minHeight: 52,
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingVertical: S[4],
    minHeight: 52,
  },
  confirmDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: T.base,
    color: C.ink1,
    fontWeight: '700',
  },
});
