import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

let lastNetworkAlertAt = 0;
const ALERT_COOLDOWN_MS = 30_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Global network error handler — fires Alert once per 30s when fetch fails
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.query.state.status === 'error') {
    const err = event.query.state.error;
    if (err instanceof Error && err.message === 'Network request failed') {
      const now = Date.now();
      if (now - lastNetworkAlertAt > ALERT_COOLDOWN_MS) {
        lastNetworkAlertAt = now;
        setTimeout(() => {
          Alert.alert(
            'Sin conexión',
            'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta de nuevo.',
            [{ text: 'Entendido' }],
          );
        }, 300);
      }
    }
  }
});
