/**
 * SwipeableCard.tsx — Swipe-to-action wrapper for document cards
 *
 * Swipe right → favorite (amber)
 * Swipe left  → delete (danger red)
 *
 * Uses PanResponder + Animated so it works in Expo Go without any
 * additional native modules beyond what's already installed.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { C, R, S, T } from '@/theme/tokens';

const ACTION_THRESHOLD = 72; // px drag needed to trigger action
const SNAP_DISTANCE = 80;    // px the card travels before snapping back

interface Props {
  children: React.ReactNode;
  onDelete: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
  /** Disable swipe when in selection mode */
  disabled?: boolean;
}

export function SwipeableCard({ children, onDelete, onFavorite, isFavorite, disabled }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const hasFiredRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !disabled && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,

      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
        // Fire haptic once when crossing threshold
        if (!hasFiredRef.current && Math.abs(g.dx) >= ACTION_THRESHOLD) {
          hasFiredRef.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (hasFiredRef.current && Math.abs(g.dx) < ACTION_THRESHOLD) {
          hasFiredRef.current = false;
        }
      },

      onPanResponderRelease: (_, g) => {
        hasFiredRef.current = false;
        if (g.dx > ACTION_THRESHOLD) {
          translateX.setValue(0);
          onFavorite();
        } else if (g.dx < -ACTION_THRESHOLD) {
          translateX.setValue(0);
          onDelete();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },

      onPanResponderTerminate: () => {
        hasFiredRef.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Background reveals
  const rightBg = translateX.interpolate({
    inputRange: [0, ACTION_THRESHOLD],
    outputRange: ['transparent', C.amber + 'CC'],
    extrapolate: 'clamp',
  });
  const leftBg = translateX.interpolate({
    inputRange: [-ACTION_THRESHOLD, 0],
    outputRange: [C.danger + 'CC', 'transparent'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Left underlay (delete) */}
      <Animated.View style={[styles.underlay, styles.underlayLeft, { backgroundColor: leftBg }]}>
        <Feather name="trash-2" size={20} color={C.ink1} />
        <Text style={styles.underlayLabel}>Delete</Text>
      </Animated.View>

      {/* Right underlay (favorite) */}
      <Animated.View style={[styles.underlay, styles.underlayRight, { backgroundColor: rightBg }]}>
        <Text style={styles.underlayLabel}>{isFavorite ? 'Unfave' : 'Fave'}</Text>
        <Feather name="star" size={20} color={C.ink1} />
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...(disabled ? {} : panResponder.panHandlers)}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: R.lg,
  },
  underlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    borderRadius: R.lg,
  },
  underlayLeft: {
    justifyContent: 'flex-end',
  },
  underlayRight: {
    justifyContent: 'flex-start',
  },
  underlayLabel: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.ink1,
    marginHorizontal: S[1],
  },
});
