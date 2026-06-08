import { initSentry, Sentry } from '@/lib/sentry';
initSentry();

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { queryClient } from '@/lib/queryClient';
import { useColors } from '@/hooks/useColors';
import { useSession } from '@/store/session';
import { useTheme } from '@/store/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default Sentry.wrap(function RootLayout() {
  const initialize = useSession((s) => s.initialize);
  const isLoading = useSession((s) => s.isLoading);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  const systemScheme = useColorScheme();
  const mode = useTheme((s) => s.mode);
  const resolved = mode === 'system' ? (systemScheme ?? 'dark') : mode;
  const c = useColors();

  const navTheme = resolved === 'light'
    ? {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: c.bg,
          card: c.surface,
          primary: c.primary,
          border: c.border,
          text: c.textPrimary,
          notification: c.alert,
        },
      }
    : {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: c.bg,
          card: c.surface,
          primary: c.primary,
          border: c.border,
          text: c.textPrimary,
          notification: c.alert,
        },
      };

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      void (async () => {
        try {
          await SplashScreen.hideAsync();
        } catch {
          // Not registered on this view controller (hot-reload / already hidden)
        }
      })();
    }
  }, [fontsLoaded, isLoading]);

  if (!fontsLoaded || isLoading) return null;

  return (
    <QueryClientProvider client={queryClient}>
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <View style={[styles.root, { backgroundColor: c.bg }]}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: c.bg },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="match/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="perfil/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="unirse/[id]"
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="editar/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="calificar/[id]"
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="chat/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="direct/[id]"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="perfil/editar"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="crear"
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="notificaciones"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="ajustes"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="historial"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="reputacion"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="terminos"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="privacidad"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="cuenta/correo"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="cuenta/contrasena"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="admin/verificaciones"
                options={{ animation: 'slide_from_right' }}
              />
            </Stack>
            <StatusBar style="auto" />
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
});
