import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Layout,
  ZoomIn,
  ZoomOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { C, T, S, R, Springs } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TagEditorProps {
  visible: boolean;
  /** Initial tags (current document or shared tags for bulk) */
  initialTags?: string[];
  /** All tags that exist across documents — for suggestions */
  allTags?: string[];
  title?: string;
  onConfirm: (tags: string[]) => void;
  onCancel: () => void;
}

export function TagEditor({
  visible,
  initialTags = [],
  allTags = [],
  title = 'Edit Tags',
  onConfirm,
  onCancel,
}: TagEditorProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState('');
  const confirmScale = useSharedValue(1);
  const confirmStyle = useAnimatedStyle(() => ({ transform: [{ scale: confirmScale.value }] }));

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setTags(initialTags);
      setInput('');
    }
  }, [visible, initialTags]);

  const addTag = useCallback((tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!clean || tags.includes(clean)) return;
    setTags((prev) => [...prev, clean]);
    setInput('');
  }, [tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const suggestions = allTags.filter(
    (t) => !tags.includes(t) && (input === '' || t.includes(input.toLowerCase()))
  ).slice(0, 8);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S[4] }]}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>{title}</Text>

          {/* Current tags — wraps onto multiple lines so long tag lists stay
              reachable above the keyboard instead of needing a horizontal scroll */}
          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((tag) => (
                <Animated.View
                  key={tag}
                  layout={reducedMotion ? undefined : Layout.springify().damping(16)}
                  entering={reducedMotion ? undefined : ZoomIn.springify().damping(14)}
                  exiting={reducedMotion ? undefined : ZoomOut.duration(120)}
                >
                  <Pressable style={styles.tag} onPress={() => removeTag(tag)}>
                    <Text style={styles.tagText}>#{tag}</Text>
                    <Text style={styles.tagRemove}>×</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Add a tag…"
              placeholderTextColor={C.ash}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => addTag(input)}
            />
            {input.trim().length > 0 && (
              <Pressable style={styles.addBtn} onPress={() => addTag(input)}>
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            )}
          </View>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestLabel}>Suggestions</Text>
              <View style={styles.suggestRow}>
                {suggestions.map((s) => (
                  <Pressable key={s} style={styles.suggest} onPress={() => addTag(s)}>
                    <Text style={styles.suggestText}>+ #{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <AnimatedPressable
              style={[styles.confirmBtn, confirmStyle]}
              onPressIn={() => { confirmScale.value = reducedMotion ? 1 : withSpring(0.95, Springs.snappy); }}
              onPressOut={() => { confirmScale.value = reducedMotion ? 1 : withSpring(1, Springs.snappy); }}
              onPress={() => onConfirm(tags)}
            >
              <Text style={styles.confirmText}>Save</Text>
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: C.ink2,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S[3],
    paddingHorizontal: S[5],
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
    fontWeight: '700',
    color: C.cream,
    marginBottom: S[4],
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
    paddingBottom: S[3],
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.amberDim,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1] + 1,
    gap: S[1],
  },
  tagText: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '600',
  },
  tagRemove: {
    fontSize: T.base,
    color: C.amber,
    fontWeight: '700',
    lineHeight: T.base,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.md,
    paddingHorizontal: S[3],
    marginBottom: S[3],
    gap: S[2],
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: T.base,
    color: C.cream,
  },
  addBtn: {
    backgroundColor: C.amber,
    borderRadius: R.md,
    paddingHorizontal: S[3],
    paddingVertical: S[1] + 2,
  },
  addBtnText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.ink1,
  },
  suggestions: {
    marginBottom: S[4],
  },
  suggestLabel: {
    fontSize: T.xs,
    color: C.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: S[2],
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  suggest: {
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1] + 1,
  },
  suggestText: {
    fontSize: T.sm,
    color: C.ash,
  },
  actions: {
    flexDirection: 'row',
    gap: S[3],
    marginTop: S[2],
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ink3,
    borderRadius: R.lg,
  },
  cancelText: {
    fontSize: T.base,
    color: C.ash,
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 2,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.amber,
    borderRadius: R.lg,
  },
  confirmText: {
    fontSize: T.base,
    color: C.ink1,
    fontWeight: '700',
  },
});
