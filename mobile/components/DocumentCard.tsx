import React from 'react';
import {
  View, Text, Pressable, StyleSheet,
} from 'react-native';
import { Document } from '@/types';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/theme';
import { CategoryBadge } from './CategoryBadge';
import { formatFileSize, formatRelativeDate } from '@/utils/format';

interface Props {
  document: Document;
  onPress: () => void;
}

export function DocumentCard({ document: doc, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        doc.isFavorite && styles.cardFavorite,
      ]}
      onPress={onPress}
    >
      {/* Left: category color strip */}
      <View style={[styles.strip, { backgroundColor: getCategoryColor(doc.category) }]} />

      <View style={styles.body}>
        {/* Top row: badge + favorite star */}
        <View style={styles.topRow}>
          <CategoryBadge category={doc.category} />
          {doc.isFavorite && <Text style={styles.star}>★</Text>}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{doc.title}</Text>

        {/* Bottom row: date + size + ocr status */}
        <View style={styles.bottomRow}>
          <Text style={styles.meta}>{formatRelativeDate(doc.createdAt)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{formatFileSize(doc.fileSize)}</Text>
          {doc.ocrStatus === 'done' && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={[styles.meta, styles.ocrDone]}>OCR ✓</Text>
            </>
          )}
        </View>
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function getCategoryColor(category: Document['category']): string {
  const map: Record<Document['category'], string> = {
    receipt:  Colors.catReceipt,
    contract: Colors.catContract,
    id:       Colors.catID,
    warranty: Colors.catWarranty,
    medical:  Colors.catMedical,
    tax:      Colors.catTax,
    other:    Colors.catOther,
  };
  return map[category] ?? Colors.catOther;
}

const styles = StyleSheet.create({
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    marginBottom:    Spacing['3'],
    overflow:        'hidden',
    ...Shadows.sm,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.04)',
  },
  cardFavorite: {
    borderColor: Colors.primary + '40',
  },
  pressed: { opacity: 0.78 },
  strip: {
    width:        4,
    alignSelf:    'stretch',
    borderRadius: 0,
  },
  body: {
    flex:    1,
    padding: Spacing['4'],
    gap:     Spacing['2'],
  },
  topRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing['2'],
  },
  star: {
    fontSize: Typography.sm,
    color:    Colors.primary,
  },
  title: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.text,
    lineHeight: Typography.base * Typography.snug,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing['2'],
    flexWrap:      'wrap',
  },
  meta:     { fontSize: Typography.xs, color: Colors.textMuted },
  metaDot:  { fontSize: Typography.xs, color: Colors.textFaint },
  ocrDone:  { color: Colors.success },
  chevron:  { fontSize: 22, color: Colors.textFaint, paddingRight: Spacing['3'] },
});
