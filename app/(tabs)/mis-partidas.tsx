import { useRouter } from 'expo-router';
import { PencilSimple, Plus, SoccerBall } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Text } from '@/components/ui/Text';
import { mockMatches } from '@/data/matches';
import { mockCurrentUser } from '@/data/players';
import { MatchCard } from '@/features/match/MatchCard';
import { colors, radius, spacing } from '@/theme';

type Tab = 'proximas' | 'pasadas' | 'creadas';

const OPTIONS: { value: Tab; label: string }[] = [
  { value: 'proximas', label: 'Próximas' },
  { value: 'pasadas', label: 'Pasadas' },
  { value: 'creadas', label: 'Creadas' },
];

export default function MisPartidasScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('proximas');

  const list = useMemo(() => {
    const now = Date.now();
    const joined = mockMatches.filter((m) =>
      m.joinedPlayers.some((p) => p.id === mockCurrentUser.id),
    );
    if (tab === 'proximas') return joined.filter((m) => new Date(m.startsAt).getTime() > now);
    if (tab === 'pasadas') return joined.filter((m) => new Date(m.startsAt).getTime() <= now);
    return mockMatches.filter((m) => m.organizer.id === mockCurrentUser.id);
  }, [tab]);

  return (
    <Screen>
      <View style={styles.head}>
        <Text variant="h2">Mis Partidas</Text>
      </View>

      <View style={styles.tabsWrap}>
        <SegmentedTabs options={OPTIONS} value={tab} onChange={setTab} />
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon={<SoccerBall size={36} color={colors.primary} weight="fill" />}
          title={tab === 'creadas' ? 'Sin partidas creadas' : 'Sin partidas'}
          description={
            tab === 'proximas'
              ? 'No te has unido a ninguna partida próxima.'
              : tab === 'pasadas'
                ? 'Aquí verás el historial de partidas jugadas.'
                : 'Crea tu primera partida para empezar a jugar.'
          }
          action={
            <Button
              label="Crear partida"
              onPress={() => router.push('/crear')}
              fullWidth={false}
              leading={<Plus size={18} color={colors.bg} weight="bold" />}
              style={{ marginTop: spacing.md }}
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {list.map((m) => (
            <View key={m.id} style={styles.cardWrap}>
              <MatchCard
                match={m}
                onPress={() => router.push(`/match/${m.id}`)}
              />
              {tab === 'creadas' ? (
                <PressableScale
                  style={styles.editBtn}
                  scaleTo={0.96}
                  onPress={() => router.push(`/editar/${m.id}`)}
                >
                  <PencilSimple size={15} color={colors.primary} weight="fill" />
                  <Text variant="smallMedium" color="primary">
                    Editar partida
                  </Text>
                </PressableScale>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  tabsWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 160,
    gap: spacing.md,
  },
  cardWrap: { gap: spacing.xs },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
