/**
 * search.tsx — Full-text search tab
 *
 * Searches across:
 *   - Document title
 *   - OCR extracted text (with snippet + <mark> highlighting)
 *   - Category
 *   - Tags
 *
 * Results update live as the user types (debounced 150ms).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDocumentStore } from '@/store/documentStore';
import { DocumentCard } from '@/components/DocumentCard';
import { C, T, R, S } from '@/theme/tokens';
import type { SearchResult } from '@/types/document';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const searchFn = useDocumentStore(s => s.search);
  const totalDocs = useDocumentStore(s => s.documents.length);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    // Defer to next tick so UI feels responsive
    setTimeout(() => {
      const r = searchFn(q);
      setResults(r);
      setIsSearching(false);
    }, 0);
  }, [searchFn]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const renderItem = useCallback(({ item }: { item: SearchResult }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/viewer/[id]', params: { id: item.document.id } })}
      style={({ pressed }) => [styles.resultItem, pressed && styles.resultItemPressed]}
    >
      <DocumentCard document={item.document} compact />
      {item.snippet && (
        <View style={styles.snippetContainer}>
          <Text style={styles.snippetLabel}>From text:</Text>
          <SnippetText raw={item.snippet} />
        </View>
      )}
      <MatchedFieldBadges fields={item.matchedFields} />
    </Pressable>
  ), []);

  const hasQuery = query.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search documents…"
            placeholderTextColor={C.ash}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            autoFocus={false}
          />
          {isSearching && (
            <ActivityIndicator size="small" color={C.ash} style={{ marginRight: S[2] }} />
          )}
        </View>
      </View>

      {/* Results / empty states */}
      {!hasQuery ? (
        <EmptySearch totalDocs={totalDocs} />
      ) : results.length === 0 && !isSearching ? (
        <NoResults query={query} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.document.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + S[8] },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={styles.resultCount}>
                {results.length} {results.length === 1 ? 'result' : 'results'}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

function EmptySearch({ totalDocs }: { totalDocs: number }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🔍</Text>
      <Text style={styles.emptyTitle}>Search your documents</Text>
      <Text style={styles.emptyBody}>
        {totalDocs > 0
          ? `Search across ${totalDocs} document${totalDocs === 1 ? '' : 's'} by title, category, or extracted text.`
          : 'Add documents first, then search across their titles and text content.'}
      </Text>
    </View>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>📭</Text>
      <Text style={styles.emptyTitle}>No results</Text>
      <Text style={styles.emptyBody}>
        Nothing matched "{query}". Try a different word or check your spelling.
      </Text>
    </View>
  );
}

/** Renders a snippet string that may contain <mark>…</mark> tags */
function SnippetText({ raw }: { raw: string }) {
  // Parse the <mark> tags into styled spans
  const parts = raw.split(/(<mark>.*?<\/mark>)/g);
  return (
    <Text style={styles.snippet}>
      {parts.map((part, i) => {
        if (part.startsWith('<mark>')) {
          const inner = part.replace(/<\/?mark>/g, '');
          return <Text key={i} style={styles.snippetHighlight}>{inner}</Text>;
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

function MatchedFieldBadges({ fields }: { fields: SearchResult['matchedFields'] }) {
  if (fields.length === 0) return null;
  const labels: Record<string, string> = {
    title: 'Title',
    ocrText: 'Text',
    category: 'Category',
    tags: 'Tag',
  };
  return (
    <View style={styles.badgeRow}>
      {fields.map(f => (
        <View key={f} style={styles.badge}>
          <Text style={styles.badgeText}>{labels[f]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ink1 },
  searchBarRow: {
    paddingHorizontal: S[4],
    paddingVertical: S[3],
    borderBottomWidth: 1,
    borderBottomColor: C.ink3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    paddingHorizontal: S[3],
    height: 48,
  },
  searchIcon: { fontSize: 16, marginRight: S[2] },
  searchInput: {
    flex: 1,
    fontSize: T.base,
    color: C.cream,
    height: '100%',
  },
  list: { paddingHorizontal: S[4], paddingTop: S[3] },
  resultCount: {
    fontSize: T.xs,
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: S[3],
  },
  resultItem: {
    marginBottom: S[3],
    borderRadius: R.lg,
    overflow: 'hidden',
    backgroundColor: C.ink2,
  },
  resultItemPressed: { opacity: 0.75 },
  snippetContainer: {
    paddingHorizontal: S[4],
    paddingBottom: S[3],
  },
  snippetLabel: {
    fontSize: T.xs,
    color: C.ink4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: S[1],
  },
  snippet: { fontSize: T.sm, color: C.ash, lineHeight: 18 },
  snippetHighlight: {
    color: C.amber,
    fontWeight: '600',
    backgroundColor: C.amberDim,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: S[2],
    paddingHorizontal: S[4],
    paddingBottom: S[3],
  },
  badge: {
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: 2,
  },
  badgeText: { fontSize: T.xs, color: C.ash },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[8],
    gap: S[3],
  },
  emptyEmoji: { fontSize: 48, marginBottom: S[2] },
  emptyTitle: { fontSize: T.lg, fontWeight: '700', color: C.cream, textAlign: 'center' },
  emptyBody: { fontSize: T.base, color: C.ash, textAlign: 'center', lineHeight: 22 },
});
