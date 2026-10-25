import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';

import { useSession } from '@/store/session';

/**
 * Returns a guard for actions that need an account (join, create, notifications).
 * Logged-in users run the action; guests get a prompt to sign in.
 */
export function useRequireAuth() {
  const router = useRouter();
  const isAuthed = useSession((s) => s.isAuthed);

  return useCallback(
    (action: () => void) => {
      if (isAuthed) {
        action();
        return;
      }
      // RN-web's Alert.alert is a no-op.
      if (Platform.OS === 'web') {
        if (window.confirm('Necesitas una cuenta para hacer esto. ¿Iniciar sesión?')) {
          router.push('/login');
        }
        return;
      }
      Alert.alert(
        'Inicia sesión',
        'Necesitas una cuenta para hacer esto.',
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/login') },
        ],
      );
    },
    [isAuthed, router],
  );
}
