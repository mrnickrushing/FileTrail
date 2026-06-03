import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors, Typography, Spacing } from '@/theme';
import { TabIcon } from '@/components/TabIcon';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor:  Colors.surface,
          borderTopColor:   Colors.divider,
          borderTopWidth:   1,
          paddingBottom:    Platform.OS === 'ios' ? Spacing['4'] : Spacing['2'],
          paddingTop:       Spacing['2'],
          height:           Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textFaint,
        tabBarLabelStyle: {
          fontSize:   Typography.xs,
          fontWeight: Typography.medium,
          marginTop:  2,
        },
        headerStyle:      { backgroundColor: Colors.bg },
        headerTintColor:  Colors.text,
        headerTitleStyle: { color: Colors.text, fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="vault" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="folders"
        options={{
          title: 'Folders',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="folders" color={color} focused={focused} />
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
