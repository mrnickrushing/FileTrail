/**
 * DocumentCard.tsx — Reusable document card component
 *
 * Visual highlights:
 *   - 4px colored left accent strip keyed to document category
 *   - Category shown as a tinted pill badge instead of plain text
 *   - 78px thumbnail (up from 68px)
 *   - Subtle 1px card border for definition on dark backgrounds
 *   - Animated checkbox spring on selection mode enter
 *
 * Micro-interactions (all disabled under prefers-reduced-motion):
 *   - Press: card scales to 0.97 with a snappy spring
 *   - Favorite: star pops with a bounce when toggled on
 *   - OCR processing: badge dot pulses
 *   - Thumbnail: shimmer overlay until the image finishes loading
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated, {
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { C, T, R, S, Springs } from '@/theme/tokens';
import type { Document, DocumentCategory } from '@/types/document';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  receipt: 'Receipt',
  bill: 'Bill',
  contract: 'Contract',
  id: 'ID',
  warranty: 'Warranty',
  medical: 'Medical',
  tax: 'Tax',
  work: 'Work',
  retirement: 'Retirement',
  insurance: 'Insurance',
  legal: 'Legal',
  vehicle: 'Vehicle',
  property: 'Property',
  education: 'Education',
  travel: 'Travel',
  pet: 'Pet',
  other: 'Other',
};

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  receipt:  C.category.receipt,
  bill:     C.category.bill,
  contract: C.category.contract,
  id:       C.category.id,
  warranty: C.category.warranty,
  medical:  C.category.medical,
  tax:      C.category.tax,
  work:       C.category.work,
  retirement: C.category.retirement,
  insurance:  C.category.insurance,
  legal:      C.category.legal,
  vehicle:    C.category.vehicle,
  property:   C.category.property,
  education:  C.category.education,
  travel:     C.category.travel,
  pet:        C.category.pet,
  other:    C.category.other,
};

interface DocumentCardProps {
  document: Document;
  compact?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
}

export function DocumentCard({
  document,
  compact = false,
  onPress,
  onLongPress,
  selectionMode = false,
  isSelected = false,
}: DocumentCardProps) {
  const accentColor = CATEGORY_COLORS[document.category];
  const reducedMotion = useReducedMotion();

  // Press scale feedback.
  const scale = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = () => {
    if (!reducedMotion) scale.value = withSpring(0.97, Springs.snappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, Springs.snappy);
  };

  // Favorite star bounce.
  const starScale = useSharedValue(1);
  useEffect(() => {
    if (document.isFavorite && !reducedMotion) {
      starScale.value = withSequence(withSpring(1.45, Springs.bouncy), withSpring(1, Springs.bouncy));
    } else {
      starScale.value = 1;
    }
  }, [document.isFavorite, reducedMotion, starScale]);
  const starAnim = useAnimatedStyle(() => ({ transform: [{ scale: starScale.value }] }));

  // OCR processing pulse.
  const ocrPulse = useSharedValue(1);
  useEffect(() => {
    if (document.ocrStatus === 'processing' && !reducedMotion) {
      ocrPulse.value = withRepeat(withTiming(0.3, { duration: 700 }), -1, true);
    } else {
      cancelAnimation(ocrPulse);
      ocrPulse.value = 1;
    }
    return () => cancelAnimation(ocrPulse);
  }, [document.ocrStatus, reducedMotion, ocrPulse]);
  const ocrAnim = useAnimatedStyle(() => ({ opacity: ocrPulse.value }));

  // Thumbnail shimmer until the image loads.
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const shimmer = useSharedValue(0.35);
  useEffect(() => {
    if (document.thumbnailUri && !thumbLoaded && !reducedMotion) {
      shimmer.value = withRepeat(withTiming(0.75, { duration: 900 }), -1, true);
    } else {
      cancelAnimation(shimmer);
    }
    return () => cancelAnimation(shimmer);
  }, [document.thumbnailUri, thumbLoaded, reducedMotion, shimmer]);
  const shimmerAnim = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  const dateStr = new Date(document.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const a11yLabel = `${document.title}, ${CATEGORY_LABELS[document.category]}${document.isFavorite ? ', favorited' : ''}${isSelected ? ', selected' : ''}`;

  if (compact) {
    return (
      <AnimatedPressable
        style={[styles.compactCard, cardAnim]}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible
        accessibilityLabel={a11yLabel}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        {selectionMode && (
          <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Feather name="check" size={14} color={C.ink1} />}
          </Animated.View>
        )}
        <View style={styles.compactThumb}>
          {document.thumbnailUri ? (
            <>
              <Image
                source={{ uri: document.thumbnailUri }}
                style={styles.compactThumbImage}
                resizeMode="cover"
                onLoad={() => setThumbLoaded(true)}
              />
              {!thumbLoaded && <Animated.View style={[StyleSheet.absoluteFill, styles.thumbShimmer, shimmerAnim]} />}
            </>
          ) : (
            <View style={[styles.compactThumbPlaceholder, { backgroundColor: accentColor + '33' }]}>
              <Feather name={document.mimeType.includes('pdf') ? 'file-text' : 'image'} size={18} color={accentColor} />
            </View>
          )}
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={1}>{document.title}</Text>
          <View style={styles.compactMeta}>
            <View style={[styles.categoryDot, { backgroundColor: accentColor }]} />
            <Text style={styles.compactMetaText}>{CATEGORY_LABELS[document.category]} · {dateStr}</Text>
          </View>
        </View>
        {document.isFavorite && (
          <Animated.View style={starAnim}>
            <Feather name="star" size={16} color={C.amber} />
          </Animated.View>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.card, isSelected && styles.cardSelected, cardAnim]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={selectionMode ? 'Double tap to toggle selection' : 'Double tap to open document'}
    >
      {/* Colored left accent strip — hidden in selection mode (checkbox takes its place) */}
      {!selectionMode && (
        <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />
      )}

      <View style={[styles.content, !selectionMode && styles.contentWithStrip]}>
        {/* Checkbox — only visible in selection mode */}
        {selectionMode && (
          <View style={styles.leftCol}>
            <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Feather name="check" size={14} color={C.ink1} />}
            </Animated.View>
          </View>
        )}

        {/* Center: text */}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{document.title}</Text>
            {document.ocrStatus === 'processing' && (
              <Animated.View style={[styles.ocrBadge, ocrAnim]}>
                <View style={styles.ocrDot} />
              </Animated.View>
            )}
            {document.ocrStatus === 'failed' && (
              <Feather name="alert-triangle" size={16} color={C.danger} style={styles.ocrFailedIcon} />
            )}
            {document.isFavorite && (
              <Animated.View style={[styles.favStar, starAnim]}>
                <Feather name="star" size={15} color={C.amber} />
              </Animated.View>
            )}
          </View>

          <View style={styles.metaRow}>
            {/* Category pill badge */}
            <View style={[styles.categoryPill, { backgroundColor: accentColor + '28', borderColor: accentColor + '55' }]}>
              <Text style={[styles.categoryPillText, { color: accentColor }]}>
                {CATEGORY_LABELS[document.category]}
              </Text>
            </View>
            <Text style={styles.metaSep}>·</Text>
            <Text style={styles.dateStr}>{dateStr}</Text>
          </View>

          <View style={styles.footerRow}>
            {document.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>#{tag}</Text>
              </View>
            ))}
            {document.tags.length > 2 && (
              <View style={styles.tagPill}>
                <Text style={styles.tagPillText}>+{document.tags.length - 2}</Text>
              </View>
            )}
            <Text style={styles.fileSize}>{formatBytes(document.fileSizeBytes)}</Text>
          </View>
        </View>

        {/* Right: thumbnail */}
        <View style={styles.thumbContainer}>
          {document.thumbnailUri ? (
            <>
              <Image
                source={{ uri: document.thumbnailUri }}
                style={styles.thumb}
                resizeMode="cover"
                onLoad={() => setThumbLoaded(true)}
              />
              {!thumbLoaded && <Animated.View style={[StyleSheet.absoluteFill, styles.thumbShimmer, shimmerAnim]} />}
            </>
          ) : (
            <View style={[styles.thumbPlaceholder, { backgroundColor: accentColor + '22' }]}>
              <Feather name={document.mimeType.includes('pdf') ? 'file-text' : 'image'} size={26} color={accentColor} />
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const THUMB = 78;

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: C.ink4,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: C.amber,
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    flexDirection: 'row',
    paddingVertical: S[3],
    paddingRight: S[3],
    paddingLeft: S[3],
    gap: S[2],
    alignItems: 'center',
  },
  contentWithStrip: {
    paddingLeft: S[3] + 8,
  },
  leftCol: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    width: 28,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: R.full,
    borderWidth: 2,
    borderColor: C.ink4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: C.amber,
    borderColor: C.amber,
  },
  info: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S[2],
    marginBottom: S[1] + 2,
  },
  title: {
    flex: 1,
    fontSize: T.base,
    fontWeight: '600',
    color: C.cream,
    lineHeight: T.base * 1.3,
  },
  ocrBadge: {
    marginTop: 4,
    width: 8,
    height: 8,
    borderRadius: R.full,
    backgroundColor: C.amber + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrDot: {
    width: 4,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.amber,
  },
  ocrFailedIcon: {
    marginTop: 2,
  },
  favStar: {
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[1],
    marginBottom: S[2],
  },
  categoryPill: {
    borderRadius: R.full,
    paddingHorizontal: S[2],
    paddingVertical: 2,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: T.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metaSep: {
    fontSize: T.sm,
    color: C.ink4,
  },
  dateStr: {
    fontSize: T.sm,
    color: C.ash,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: S[1],
  },
  tagPill: {
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[2],
    paddingVertical: 2,
  },
  tagPillText: { fontSize: T.xs, color: C.ash },
  fileSize: { fontSize: T.xs, color: C.ink4, marginLeft: 'auto' },
  thumbContainer: {
    width: THUMB,
    height: THUMB,
    borderRadius: R.md,
    overflow: 'hidden',
    alignSelf: 'center',
    flexShrink: 0,
  },
  thumb: { width: THUMB, height: THUMB },
  thumbPlaceholder: {
    width: THUMB,
    height: THUMB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbShimmer: {
    backgroundColor: C.ink3,
  },

  // ── Compact ──────────────────────────────────────────────────
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S[3],
    gap: S[3],
  },
  compactThumb: {
    width: 44, height: 44,
    borderRadius: R.md,
    overflow: 'hidden',
  },
  compactThumbImage: { width: 44, height: 44 },
  compactThumbPlaceholder: {
    width: 44, height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInfo: { flex: 1 },
  compactTitle: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.cream,
    marginBottom: 3,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[1],
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: R.full,
  },
  compactMetaText: { fontSize: T.sm, color: C.ash },
});
