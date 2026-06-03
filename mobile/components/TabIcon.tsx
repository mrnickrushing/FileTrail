import React from 'react';
import { Text } from 'react-native';

const ICONS: Record<string, { default: string; active: string }> = {
  vault:    { default: '🗂',  active: '🗂' },
  folders:  { default: '📁',  active: '📁' },
  search:   { default: '🔍',  active: '🔍' },
  settings: { default: '⚙️', active: '⚙️' },
};

interface Props {
  name: string;
  color: string;
  focused: boolean;
}

export function TabIcon({ name, focused }: Props) {
  const icon = ICONS[name] ?? ICONS.vault;
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>
      {focused ? icon.active : icon.default}
    </Text>
  );
}
