import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function CrearLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
