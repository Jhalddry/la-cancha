import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return; // gracefully skip if not configured
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.2,
    enableNativeNagger: false,
  });
}

export { Sentry };
