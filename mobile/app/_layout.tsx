import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { initDb } from '@/services/db';
import { useDocumentStore } from '@/store';
import { Colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { loadDocuments, loadFolders, loadTags } = useDocumentStore();

  useEffect(() => {
    async function bootstrap() {
      await initDb();
      await Promise.all([loadDocuments(), loadFolders(), loadTags()]);
      await SplashScreen.hideAsync();
    }
    bootstrap();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle:      { backgroundColor: Colors.bg },
            headerTintColor:  Colors.text,
            headerTitleStyle: { color: Colors.text, fontWeight: '600' },
            headerShadowVisible: false,
            contentStyle:     { backgroundColor: Colors.bg },
            animation:        'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="document/[id]"
            options={{ title: 'Document', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="folder/[id]"
            options={{ title: 'Folder', headerBackTitle: 'Back' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
