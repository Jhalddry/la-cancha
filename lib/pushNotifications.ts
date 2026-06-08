import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request permission + get Expo push token + save to profile. */
export async function registerForPushNotifications(userId: string): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      status = asked;
    }
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      Constants.easConfig?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  } catch (e) {
    console.warn('[push] registerForPushNotifications failed:', e);
  }
}

/** Send a push notification to a user by their profile ID. */
export async function sendPushToUser(
  recipientId: string,
  title: string,
  body: string,
  navigateTo?: string,
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', recipientId)
      .maybeSingle();

    const token = profile?.push_token as string | null | undefined;
    if (!token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data: { navigateTo: navigateTo ?? null },
        sound: 'default',
        priority: 'high',
      }),
    });
  } catch (e) {
    console.warn('[push] sendPushToUser failed:', e);
  }
}
