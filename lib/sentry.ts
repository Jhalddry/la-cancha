/**
 * Sentry stub — @sentry/react-native requires a native build (EAS/Xcode).
 * In Expo Go this module is a no-op. Replace with real implementation once
 * you have a native build:
 *
 *   import * as Sentry from '@sentry/react-native';
 *   export function initSentry() {
 *     const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
 *     if (!dsn) return;
 *     Sentry.init({ dsn, tracesSampleRate: 0.2 });
 *   }
 *   export { Sentry };
 */

export function initSentry(): void {
  // no-op until native build
}

// Minimal stub so call sites don't break when switched to real Sentry later
export const Sentry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrap: <T>(component: T): T => component,
  captureException: (_e: unknown): void => {},
  captureMessage: (_m: string): void => {},
  setUser: (_u: unknown): void => {},
};
