/**
 * Metro inlines process.env.EXPO_PUBLIC_* at bundle time.
 * This declaration lets TypeScript accept those references.
 */
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL: string | undefined;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string | undefined;
    NODE_ENV: 'development' | 'test' | 'production';
    [key: string]: string | undefined;
  };
};
