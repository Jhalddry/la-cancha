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
import * as Notifications from 'expo-notifications';
import { useRouter, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';


import { queryClient } from '@/lib/queryClient';
import { registerForPushNotifications } from '@/lib/pushNotifications';
import { setAnalyticsUser } from '@/lib/analytics';
import { useColors } from '@/hooks/useColors';
import { useNotificationsSync } from '@/hooks/useNotifications';
import { useSession } from '@/store/session';
import { useTheme } from '@/store/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});
WebBrowser.maybeCompleteAuthSession();

function NotificationsSyncMount() {
  useNotificationsSync();
  return null;
}

export default function RootLayout() {
  const initialize = useSession((s) => s.initialize);
  const isLoading = useSession((s) => s.isLoading);
  const userId = useSession((s) => s.user?.id);
  const router = useRouter();
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

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
    // Safety net: if session init stalls (network timeout, cold start race),
    // unblock the UI after 8s rather than showing a permanent black screen.
    const timeout = setTimeout(() => {
      if (useSession.getState().isLoading) {
        useSession.setState({ isLoading: false });
      }
    }, 8000);
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [initialize]);

  // Register push token + analytics user when user logs in
  useEffect(() => {
    setAnalyticsUser(userId);
    if (userId) void registerForPushNotifications(userId);
  }, [userId]);

  // Handle notification tap → deep link
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const navigateTo = response.notification.request.content.data?.navigateTo as string | undefined;
      if (navigateTo) {
        try { router.push(navigateTo as Parameters<typeof router.push>[0]); } catch { /* ignore */ }
      }
    });
    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);

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

  if (!fontsLoaded || isLoading) {
    return <View style={[styles.root, { backgroundColor: c.bg }]} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <View style={[styles.root, { backgroundColor: c.bg }]}>
            <NotificationsSyncMount />
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
                name="cuenta"
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
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
