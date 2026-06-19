/**
 * (tabs)/_layout.tsx — Floating pill tab bar (UI overhaul)
 *
 * Floating island design: semi-transparent background with blur effect,
 * elevated above content with shadow. Safe-area aware bottom inset.
 */

import React, { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { C, T, R, S, Springs } from '@/theme/tokens';

const TAB_HEIGHT = 62;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 4);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomOffset,
          left: S[5],
          right: S[5],
          height: TAB_HEIGHT,
          backgroundColor: C.ink2 + 'F0',
          borderRadius: R.xl,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: C.ink3,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.32,
          shadowRadius: 16,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarActiveTintColor: C.amber,
        tabBarInactiveTintColor: C.ash,
        tabBarLabelStyle: {
          fontSize: T.xs,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 8 : 6,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 8 : 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="archive" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="autopilot"
        options={{
          title: 'Auto',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="zap" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="search" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="folders"
        options={{
          title: 'Folders',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="folder" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
  focused: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(focused ? 1 : 0.9);
  const bgOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      bgOpacity.value = focused ? 1 : 0;
      return;
    }
    scale.value = withSpring(focused ? 1.08 : 0.9, Springs.bouncy);
    bgOpacity.value = withSpring(focused ? 1 : 0, Springs.smooth);
  }, [focused, reducedMotion, scale, bgOpacity]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <Animated.View style={[styles.iconWrap, wrapStyle]}>
      <Animated.View style={[styles.iconWrapBg, bgStyle]} />
      <Feather name={name} size={18} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: R.md,
    backgroundColor: C.amberDim,
  },
});
