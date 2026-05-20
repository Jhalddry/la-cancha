import { useRouter } from 'expo-router';
import { Bell, CaretRight, Check, MagnifyingGlass, MapPin, Plus } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { mockCurrentUser } from '@/data/players';
import { mockMatches } from '@/data/matches';
import { MatchCard } from '@/features/match/MatchCard';
import { MatchTypePromoCard } from '@/features/match/MatchTypePromoCard';
import { colors, radius, spacing } from '@/theme';

const CITIES = [
  'Barquisimeto, Venezuela',
  'Caracas, Venezuela',
  'Ciudad Guayana, Venezuela',
  'Cumaná, Venezuela',
  'Maracaibo, Venezuela',
  'Maracay, Venezuela',
  'Margarita, Venezuela',
  'Maturín, Venezuela',
  'Puerto La Cruz, Venezuela',
  'Valencia, Venezuela',
];

export default function HomeScreen() {
  const router = useRouter();
  const [city, setCity] = useState('Caracas, Venezuela');
  const [locationOpen, setLocationOpen] = useState(false);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={mockCurrentUser.name} size={44} />
            <View>
              <View style={styles.greetRow}>
                <Text variant="h3" color="textPrimary">
                  Hola, {mockCurrentUser.name}
                </Text>
                <Text variant="h3" color="textPrimary">
                  {' '}👋
                </Text>
              </View>
              <Text variant="small" color="textSecondary">
                ¿Qué vas a jugar hoy?
              </Text>
            </View>
          </View>
          <PressableScale
            style={styles.bellBtn}
            scaleTo={0.92}
            onPress={() => router.push('/notificaciones')}
          >
            <Bell size={22} color={colors.textPrimary} weight="regular" />
            <View style={styles.bellDot} />
          </PressableScale>
        </View>

        <PressableScale
          style={styles.locationCard}
          scaleTo={0.98}
          onPress={() => setLocationOpen(true)}
        >
          <MapPin size={16} color={colors.primary} weight="fill" />
          <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
            {city}
          </Text>
          <CaretRight size={16} color={colors.textTertiary} weight="bold" />
        </PressableScale>

        <View style={styles.ctaRow}>
          <PressableScale
            style={[styles.cta, styles.ctaPrimary]}
            scaleTo={0.97}
            onPress={() => router.push('/(tabs)/buscar')}
          >
            <View style={styles.ctaIconWrapPrimary}>
              <MagnifyingGlass size={22} color={colors.bg} weight="bold" />
            </View>
            <Text variant="h3" color="bg">
              Buscar{'\n'}partida
            </Text>
            <Text variant="small" color="bg" style={styles.ctaSubPrimary}>
              Encuentra partidas cerca de ti
            </Text>
          </PressableScale>
          <PressableScale
            style={[styles.cta, styles.ctaSecondary]}
            scaleTo={0.97}
            onPress={() => router.push('/crear')}
          >
            <View style={styles.ctaIconWrapSecondary}>
              <Plus size={22} color={colors.primary} weight="bold" />
            </View>
            <Text variant="h3" color="textPrimary">
              Crear{'\n'}partida
            </Text>
            <Text variant="small" color="textSecondary">
              Publica tu partida y encuentra jugadores
            </Text>
          </PressableScale>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text variant="h3" color="textPrimary">
              Tipo de partida
            </Text>
            <Text variant="smallMedium" color="primary">
              Ver todos
            </Text>
          </View>
          <View style={styles.typesRow}>
            <MatchTypePromoCard type="chill" />
            <MatchTypePromoCard type="seria" />
            <MatchTypePromoCard type="competencia" />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text variant="h3" color="textPrimary">
              Partidas cerca de ti
            </Text>
            <Text variant="smallMedium" color="primary">
              Ver todas
            </Text>
          </View>
          <View style={styles.matchList}>
            {mockMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                onPress={() => router.push(`/match/${m.id}`)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <Sheet visible={locationOpen} onClose={() => setLocationOpen(false)} title="Tu ubicación">
        <View style={styles.cityList}>
          {CITIES.map((c) => (
            <PressableScale
              key={c}
              style={styles.cityRow}
              scaleTo={0.98}
              onPress={() => {
                setCity(c);
                setLocationOpen(false);
              }}
            >
              <MapPin size={16} color={colors.primary} weight="fill" />
              <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                {c}
              </Text>
              {city === c ? (
                <Check size={18} color={colors.primary} weight="bold" />
              ) : (
                <CaretRight size={16} color={colors.textTertiary} weight="bold" />
              )}
            </PressableScale>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 160,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
  },
  greetRow: { flexDirection: 'row', alignItems: 'center' },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.alert,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  ctaRow: { flexDirection: 'row', gap: spacing.md },
  cta: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 168,
    justifyContent: 'space-between',
  },
  ctaPrimary: { backgroundColor: colors.primary },
  ctaSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaIconWrapPrimary: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconWrapSecondary: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaSubPrimary: { opacity: 0.8 },
  section: { gap: spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typesRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  matchList: { gap: spacing.md, marginTop: spacing.xs },
  cityList: { gap: spacing.xs },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
