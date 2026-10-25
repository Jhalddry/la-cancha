import { useRouter } from 'expo-router';
import { LockSimple } from 'phosphor-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

interface Props {
  title: string;
  description: string;
}

export function GuestPrompt({ title, description }: Props) {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <Screen>
      <View style={s.root}>
        <View style={s.icon}>
          <LockSimple size={32} color={c.primary} weight="fill" />
        </View>
        <Text variant="h2" color="textPrimary" style={s.center}>{title}</Text>
        <Text variant="body" color="textSecondary" style={s.center}>{description}</Text>
        <View style={s.actions}>
          <Button label="Iniciar sesión" onPress={() => router.push('/login')} />
          <Button label="Crear cuenta" variant="secondary" onPress={() => router.push('/register')} />
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    icon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    center: { textAlign: 'center' },
    actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  });
}
