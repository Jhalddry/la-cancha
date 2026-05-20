import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

interface PastMatch {
  id: string;
  sport: string;
  location: string;
  date: string;
  result: string;
  type: 'Chill' | 'Seria' | 'Torneo';
  role: 'Jugador' | 'Organizador';
}

const PAST_MATCHES: PastMatch[] = [
  { id: '1', sport: 'Fútbol 7', location: 'Cancha Los Naranjos', date: '12 Mayo, 2025', result: 'Victoria 4-2', type: 'Chill', role: 'Jugador' },
  { id: '2', sport: 'Basket 3v3', location: 'Gimnasio Central', date: '8 Mayo, 2025', result: 'Derrota 10-15', type: 'Seria', role: 'Jugador' },
  { id: '3', sport: 'Fútbol 5', location: 'Cancha Pro', date: '2 Mayo, 2025', result: 'Empate 3-3', type: 'Chill', role: 'Organizador' },
  { id: '4', sport: 'Pádel Dobles', location: 'Padel Club', date: '25 Abr, 2025', result: 'Victoria 6-4', type: 'Seria', role: 'Jugador' },
  { id: '5', sport: 'Fútbol 7', location: 'Cancha Los Naranjos', date: '18 Abr, 2025', result: 'Victoria 2-1', type: 'Torneo', role: 'Jugador' },
];

function resultColor(result: string): 'primary' | 'alert' | 'textPrimary' {
  if (result.startsWith('Victoria')) return 'primary';
  if (result.startsWith('Derrota')) return 'alert';
  return 'textPrimary';
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text variant="h3" color="primary">
        {value}
      </Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

export default function HistorialScreen() {
  const router = useRouter();

  return (
    <Screen>
      <BackHeader title="Historial" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <Card>
          <View style={styles.statsRow}>
            <StatBox value="5" label="Partidas jugadas" />
            <View style={styles.statDivider} />
            <StatBox value="3" label="Victorias" />
            <View style={styles.statDivider} />
            <StatBox value="60%" label="Efectividad" />
          </View>
        </Card>

        {/* Match cards */}
        {PAST_MATCHES.map((match) => (
          <Card key={match.id}>
            {/* Top row */}
            <View style={styles.cardTopRow}>
              <Text variant="bodySemibold" color="textPrimary">
                {match.sport}
              </Text>
              <Badge
                label={match.role}
                tone={match.role === 'Organizador' ? 'primary' : 'neutral'}
              />
            </View>

            {/* Middle row */}
            <View style={styles.cardMidRow}>
              <Text variant="small" color="textSecondary">
                {match.location}
              </Text>
              <Text variant="small" color="textSecondary">
                {match.date}
              </Text>
            </View>

            {/* Bottom row */}
            <View style={styles.cardBottomRow}>
              <Text variant="bodyMedium" color={resultColor(match.result)}>
                {match.result}
              </Text>
              <Chip label={match.type} selected={match.type === 'Chill'} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
