import { useRouter } from 'expo-router';
import { CheckCircle } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme';

export default function ConfirmacionScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.iconCircle}>
          <CheckCircle size={64} color={colors.primary} weight="fill" />
        </View>
        <Text variant="h1" color="textPrimary" style={styles.center}>
          ¡Tu partida ha sido creada!
        </Text>
        <Text variant="body" color="textSecondary" style={styles.center}>
          Ahora los jugadores podrán unirse.
        </Text>

        <Card style={styles.summary}>
          <View style={styles.row}>
            <Text style={styles.emoji}>⚽</Text>
            <Text variant="bodySemibold">Fútbol 7</Text>
            <Text variant="small" color="textSecondary">
              Chill
            </Text>
          </View>
          <View style={styles.divider} />
          <Text variant="small" color="textSecondary">
            Cancha Los Naranjos · 18 May, 8:00 PM
          </Text>
          <Text variant="bodySemibold" color="primary">
            $20/h · 1h 30m
          </Text>
        </Card>
      </View>

      <View style={styles.footer}>
        <Button label="Ver mi partida" onPress={() => router.replace('/(tabs)/mis-partidas')} />
        <Button
          label="Ir al inicio"
          variant="secondary"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  center: { textAlign: 'center' },
  summary: { width: '100%', marginTop: spacing.xl, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 22, lineHeight: 28, width: 28, textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
