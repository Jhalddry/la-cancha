import { useRouter } from 'expo-router';
import { PencilSimple, Plus, SoccerBall, Star } from 'phosphor-react-native';
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
import { useColors } from '@/hooks/useColors';
import { useMatchOverrides } from '@/store/matchOverrides';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

type Tab = 'proximas' | 'pasadas' | 'creadas';

const OPTIONS: { value: Tab; label: string }[] = [
  { value: 'proximas', label: 'Próximas' },
  { value: 'pasadas', label: 'Pasadas' },
  { value: 'creadas', label: 'Creadas' },
];

export default function MisPartidasScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('proximas');
  const overrides = useMatchOverrides((s) => s.overrides);
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const list = useMemo(() => {
    const now = Date.now();
    const merged = mockMatches.map((m) => ({ ...m, ...overrides[m.id] }));
    const joined = merged.filter((m) =>
      m.joinedPlayers.some((p) => p.id === mockCurrentUser.id),
    );
    if (tab === 'proximas') return joined.filter((m) => new Date(m.startsAt).getTime() > now);
    if (tab === 'pasadas') return joined.filter((m) => new Date(m.startsAt).getTime() <= now);
    return merged.filter((m) => m.organizer.id === mockCurrentUser.id);
  }, [tab, overrides]);

  return (
    <Screen>
      <View style={s.head}>
        <Text variant="h2">Mis Partidas</Text>
      </View>

      <View style={s.tabsWrap}>
        <SegmentedTabs options={OPTIONS} value={tab} onChange={setTab} />
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon={<SoccerBall size={36} color={c.primary} weight="fill" />}
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
              leading={<Plus size={18} color={c.bg} weight="bold" />}
              style={{ marginTop: spacing.md }}
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {list.map((m) => (
            <View key={m.id} style={s.cardWrap}>
              <MatchCard
                match={m}
                onPress={() => router.push(`/match/${m.id}`)}
                cardStyle={
                  tab === 'creadas' || tab === 'pasadas'
                    ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }
                    : undefined
                }
              />
              {tab === 'creadas' ? (
                <PressableScale
                  style={s.editStrip}
                  scaleTo={0.98}
                  onPress={() => router.push(`/editar/${m.id}`)}
                >
                  <PencilSimple size={14} color={c.primary} weight="fill" />
                  <Text variant="smallMedium" color="primary">Editar partida</Text>
                </PressableScale>
              ) : null}
              {tab === 'pasadas' ? (() => {
                const target = m.joinedPlayers.find((p) => p.id !== mockCurrentUser.id);
                if (!target) return null;
                return (
                  <PressableScale
                    style={s.rateStrip}
                    scaleTo={0.98}
                    onPress={() => router.push(`/calificar/${target.id}`)}
                  >
                    <Star size={14} color={c.bg} weight="fill" />
                    <Text variant="smallMedium" style={{ color: c.bg }}>
                      Calificar jugadores
                    </Text>
                  </PressableScale>
                );
              })() : null}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    head: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    tabsWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 160,
      gap: spacing.md,
    },
    cardWrap: { gap: 0 },
    editStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: c.border,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
    },
    rateStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      backgroundColor: c.seria,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
    },
  });
}
