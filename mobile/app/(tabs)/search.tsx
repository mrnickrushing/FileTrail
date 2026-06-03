import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList,
  StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocumentStore } from '@/store';
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { Colors, Typography, Spacing, Radius } from '@/theme';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { documents, isLoading, search } = useDocumentStore();
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      search(text);
    },
    [search],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search documents, text content…"
          placeholderTextColor={Colors.textFaint}
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing['10'] }} />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            documents.length === 0 && styles.listEmpty,
          ]}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              onPress={() => router.push(`/document/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            query.length > 0 ? (
              <EmptyState
                icon="search"
                title="No results"
                subtitle={`No documents match "${query}"`}
              />
            ) : (
              <EmptyState
                icon="search"
                title="Search your vault"
                subtitle="Searches filenames and OCR-extracted text"
              />
            )
          }
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchWrap: {
    flexDirection:    'row',
    alignItems:       'center',
    margin:           Spacing['4'],
    paddingHorizontal: Spacing['4'],
    backgroundColor:  Colors.surfaceOffset,
    borderRadius:     Radius.lg,
    borderWidth:      1,
    borderColor:      Colors.border,
    minHeight:        48,
    gap:              Spacing['2'],
  },
  searchIcon:  { fontSize: 16 },
  searchInput: {
    flex:      1,
    fontSize:  Typography.base,
    color:     Colors.text,
    paddingVertical: Spacing['3'],
  },
  list:      { paddingHorizontal: Spacing['4'], paddingBottom: 40 },
  listEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
