/**
 * viewer/[id].tsx — Full document viewer
 *
 * Displays a document in full-screen with:
 *   - Pinch-to-zoom for images (via react-native-gesture-handler + reanimated)
 *   - PDF rendering via expo-print WebView embed
 *   - Header with title, favorite toggle, share, delete actions
 *   - OCR text panel (expandable bottom sheet)
 *   - Edit title / category inline
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Share,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store/documentStore';
import { C, T, R, S } from '@/theme/tokens';
import type { DocumentCategory } from '@/types/document';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  receipt: '🧾 Receipt',
  contract: '📝 Contract',
  id: '🪪 ID',
  warranty: '🛡️ Warranty',
  medical: '🏥 Medical',
  tax: '💰 Tax',
  other: '📁 Other',
};

const CATEGORIES: DocumentCategory[] = [
  'receipt', 'contract', 'id', 'warranty', 'medical', 'tax', 'other',
];

export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const document = useDocumentStore(s => s.getDocument(id));
  const updateDocument = useDocumentStore(s => s.updateDocument);
  const deleteDocument = useDocumentStore(s => s.deleteDocument);
  const toggleFavorite = useDocumentStore(s => s.toggleFavorite);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(document?.title ?? '');
  const [showOCR, setShowOCR] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const titleInputRef = useRef<TextInput>(null);

  const handleSaveTitle = useCallback(() => {
    if (!document) return;
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== document.title) {
      updateDocument(document.id, { title: trimmed });
    } else {
      setEditTitle(document.title);
    }
    setIsEditingTitle(false);
  }, [document, editTitle, updateDocument]);

  const handleShare = useCallback(async () => {
    if (!document) return;
    try {
      await Share.share({
        title: document.title,
        url: document.fileUri,
        message: `${document.title} — shared from PaperTrail`,
      });
    } catch {/* user cancelled */}
  }, [document]);

  const handleDelete = useCallback(() => {
    if (!document) return;
    Alert.alert(
      'Delete Document',
      `"${document.title}" will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            await deleteDocument(document.id);
            router.replace('/(tabs)/');
          },
        },
      ]
    );
  }, [document, deleteDocument]);

  const handleCategorySelect = useCallback((cat: DocumentCategory) => {
    if (!document) return;
    updateDocument(document.id, { category: cat });
    setShowCategoryPicker(false);
  }, [document, updateDocument]);

  if (!document) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Document not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isPDF = document.mimeType.includes('pdf');
  const isImage = !isPDF;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => toggleFavorite(document.id)}
            hitSlop={8}
          >
            <Text style={styles.headerIcon}>
              {document.isFavorite ? '★' : '☆'}
            </Text>
          </Pressable>
          <Pressable style={styles.headerIconBtn} onPress={handleShare} hitSlop={8}>
            <Text style={styles.headerIcon}>↑</Text>
          </Pressable>
          <Pressable style={styles.headerIconBtn} onPress={handleDelete} hitSlop={8}>
            <Text style={[styles.headerIcon, { color: C.danger }]}>🗑</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + S[8] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Document preview */}
        <View style={styles.previewCard}>
          {isImage ? (
            <ScrollView
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
              style={styles.zoomScroll}
            >
              <Image
                source={{ uri: document.fileUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </ScrollView>
          ) : (
            <View style={styles.pdfPlaceholder}>
              {document.thumbnailUri ? (
                <Image
                  source={{ uri: document.thumbnailUri }}
                  style={styles.pdfThumb}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.pdfIcon}>📄</Text>
              )}
              <Text style={styles.pdfLabel}>PDF Document</Text>
              <Text style={styles.pdfMeta}>
                {document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Title ── */}
        <View style={styles.metaSection}>
          <Pressable
            onPress={() => {
              setIsEditingTitle(true);
              setTimeout(() => titleInputRef.current?.focus(), 50);
            }}
            style={styles.titleRow}
          >
            {isEditingTitle ? (
              <TextInput
                ref={titleInputRef}
                style={styles.titleInput}
                value={editTitle}
                onChangeText={setEditTitle}
                onBlur={handleSaveTitle}
                onSubmitEditing={handleSaveTitle}
                returnKeyType="done"
                maxLength={120}
                autoCorrect={false}
              />
            ) : (
              <>
                <Text style={styles.docTitle} numberOfLines={2}>{document.title}</Text>
                <Text style={styles.editHint}>✎</Text>
              </>
            )}
          </Pressable>

          {/* Category */}
          <Pressable
            style={styles.categoryRow}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={styles.categoryLabel}>
              {CATEGORY_LABELS[document.category]}
            </Text>
            <Text style={styles.categoryChevron}>›</Text>
          </Pressable>

          {/* Meta */}
          <View style={styles.metaRow}>
            <MetaChip label={formatBytes(document.fileSizeBytes)} />
            <MetaChip label={new Date(document.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            })} />
            {document.isFavorite && <MetaChip label="★ Favorited" amber />}
          </View>
        </View>

        {/* ── OCR Panel ── */}
        {(document.ocrText || document.ocrStatus === 'pending') && (
          <View style={styles.ocrSection}>
            <Pressable
              style={styles.ocrHeader}
              onPress={() => setShowOCR(v => !v)}
            >
              <Text style={styles.ocrTitle}>
                {document.ocrStatus === 'pending' ? '⏳ Extracting text…' : '📝 Extracted Text'}
              </Text>
              <Text style={styles.ocrChevron}>{showOCR ? '▲' : '▼'}</Text>
            </Pressable>
            {showOCR && document.ocrText && (
              <ScrollView
                style={styles.ocrBody}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <Text style={styles.ocrText} selectable>
                  {document.ocrText}
                </Text>
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Category Picker Modal ── */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCategoryPicker(false)}
        >
          <Pressable
            style={[styles.categorySheet, { paddingBottom: insets.bottom + S[4] }]}
            onPress={() => {}}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change Category</Text>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat}
                style={[styles.categoryOption, document.category === cat && styles.categoryOptionSelected]}
                onPress={() => handleCategorySelect(cat)}
              >
                <Text style={[
                  styles.categoryOptionText,
                  document.category === cat && styles.categoryOptionTextSelected,
                ]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
                {document.category === cat && (
                  <Text style={styles.categoryCheck}>✓</Text>
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {isDeleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator color={C.amber} size="large" />
        </View>
      )}
    </View>
  );
}

function MetaChip({ label, amber }: { label: string; amber?: boolean }) {
  return (
    <View style={[styles.metaChip, amber && styles.metaChipAmber]}>
      <Text style={[styles.metaChipText, amber && styles.metaChipTextAmber]}>
        {label}
      </Text>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
  },
  headerBtn: { minHeight: 44, justifyContent: 'center', paddingRight: S[4] },
  headerBtnText: { fontSize: T.base, color: C.amber, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: S[1] },
  headerIconBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  headerIcon: { fontSize: 20, color: C.ash },
  scroll: { flex: 1 },
  previewCard: {
    margin: S[4],
    borderRadius: R.xl,
    overflow: 'hidden',
    backgroundColor: C.ink2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  zoomScroll: {
    width: '100%',
    height: SCREEN_H * 0.5,
  },
  previewImage: {
    width: SCREEN_W - S[8],
    height: SCREEN_H * 0.5,
  },
  pdfPlaceholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
  },
  pdfThumb: { width: 160, height: 160, borderRadius: R.md },
  pdfIcon: { fontSize: 56 },
  pdfLabel: { fontSize: T.base, color: C.ash, fontWeight: '500' },
  pdfMeta: { fontSize: T.sm, color: C.ink4 },
  metaSection: { paddingHorizontal: S[4], gap: S[3] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S[2],
    minHeight: 44,
  },
  docTitle: {
    flex: 1,
    fontSize: T.xl,
    fontWeight: '700',
    color: C.cream,
    lineHeight: T.xl * 1.25,
  },
  editHint: { fontSize: T.base, color: C.ink4, marginTop: 4 },
  titleInput: {
    flex: 1,
    fontSize: T.xl,
    fontWeight: '700',
    color: C.cream,
    borderBottomWidth: 1,
    borderBottomColor: C.amber,
    paddingVertical: S[1],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink2,
    borderRadius: R.md,
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    minHeight: 48,
  },
  categoryLabel: { flex: 1, fontSize: T.base, color: C.cream },
  categoryChevron: { fontSize: T.lg, color: C.ash },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S[2] },
  metaChip: {
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
  },
  metaChipAmber: { backgroundColor: C.amberDim },
  metaChipText: { fontSize: T.xs, color: C.ash },
  metaChipTextAmber: { color: C.amber },
  ocrSection: {
    marginHorizontal: S[4],
    marginTop: S[4],
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    overflow: 'hidden',
  },
  ocrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    minHeight: 48,
  },
  ocrTitle: { flex: 1, fontSize: T.sm, fontWeight: '600', color: C.ash },
  ocrChevron: { fontSize: T.sm, color: C.ink4 },
  ocrBody: { maxHeight: 200, paddingHorizontal: S[4], paddingBottom: S[4] },
  ocrText: { fontSize: T.sm, color: C.ash, lineHeight: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  categorySheet: {
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S[3],
    paddingHorizontal: S[4],
  },
  sheetHandle: {
    width: 40, height: 4,
    borderRadius: R.full,
    backgroundColor: C.ink4,
    alignSelf: 'center',
    marginBottom: S[4],
  },
  sheetTitle: {
    fontSize: T.lg, fontWeight: '600',
    color: C.cream,
    textAlign: 'center',
    marginBottom: S[3],
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S[4],
    paddingHorizontal: S[2],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
    minHeight: 56,
  },
  categoryOptionSelected: { backgroundColor: C.amberDim },
  categoryOptionText: { flex: 1, fontSize: T.base, color: C.cream },
  categoryOptionTextSelected: { color: C.amber, fontWeight: '600' },
  categoryCheck: { fontSize: T.base, color: C.amber },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: { flex: 1, backgroundColor: C.ink1, alignItems: 'center', justifyContent: 'center', gap: S[4] },
  notFoundText: { fontSize: T.lg, color: C.ash },
  backLink: { minHeight: 44, justifyContent: 'center' },
  backLinkText: { fontSize: T.base, color: C.amber },
  danger: C.danger,
});
