import { useRouter } from 'expo-router';
import { Bell, CaretRight, Check, MagnifyingGlass, MapPin, Plus } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
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
import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

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
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Avatar name={mockCurrentUser.name} size={44} />
            <View>
              <View style={s.greetRow}>
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
            style={s.bellBtn}
            scaleTo={0.92}
            onPress={() => router.push('/notificaciones')}
          >
            <Bell size={22} color={c.textPrimary} weight="regular" />
            <View style={s.bellDot} />
          </PressableScale>
        </View>

        <PressableScale
          style={s.locationCard}
          scaleTo={0.98}
          onPress={() => setLocationOpen(true)}
        >
          <MapPin size={16} color={c.primary} weight="fill" />
          <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
            {city}
          </Text>
          <CaretRight size={16} color={c.textTertiary} weight="bold" />
        </PressableScale>

        <View style={s.ctaRow}>
          <PressableScale
            style={[s.cta, s.ctaPrimary]}
            scaleTo={0.97}
            onPress={() => router.push('/(tabs)/buscar')}
          >
            <View style={s.ctaIconWrapPrimary}>
              <MagnifyingGlass size={22} color={c.bg} weight="bold" />
            </View>
            <Text variant="h3" color="bg">
              Buscar{'\n'}partida
            </Text>
            <Text variant="small" color="bg" style={s.ctaSubPrimary}>
              Encuentra partidas cerca de ti
            </Text>
          </PressableScale>
          <PressableScale
            style={[s.cta, s.ctaSecondary]}
            scaleTo={0.97}
            onPress={() => router.push('/crear')}
          >
            <View style={s.ctaIconWrapSecondary}>
              <Plus size={22} color={c.primary} weight="bold" />
            </View>
            <Text variant="h3" color="textPrimary">
              Crear{'\n'}partida
            </Text>
            <Text variant="small" color="textSecondary">
              Publica tu partida y encuentra jugadores
            </Text>
          </PressableScale>
        </View>

        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text variant="h3" color="textPrimary">
              Tipo de partida
            </Text>
          </View>
          <View style={s.typesRow}>
            <MatchTypePromoCard type="chill" />
            <MatchTypePromoCard type="seria" />
            <MatchTypePromoCard type="competencia" />
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text variant="h3" color="textPrimary">
              Partidas cerca de ti
            </Text>
          </View>
          <View style={s.matchList}>
            {mockMatches.slice(0, 3).map((m) => (
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
        <View style={s.cityList}>
          {CITIES.map((city_item) => (
            <PressableScale
              key={city_item}
              style={s.cityRow}
              scaleTo={0.98}
              onPress={() => {
                setCity(city_item);
                setLocationOpen(false);
              }}
            >
              <MapPin size={16} color={c.primary} weight="fill" />
              <Text variant="body" color="textPrimary" style={{ flex: 1 }}>
                {city_item}
              </Text>
              {city === city_item ? (
                <Check size={18} color={c.primary} weight="bold" />
              ) : (
                <CaretRight size={16} color={c.textTertiary} weight="bold" />
              )}
            </PressableScale>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 120,
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
    },
    bellBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
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
      backgroundColor: c.alert,
      borderWidth: 1.5,
      borderColor: c.surface,
    },
    ctaRow: { flexDirection: 'row', gap: spacing.md },
    cta: {
      flex: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      minHeight: 168,
      justifyContent: 'space-between',
    },
    ctaPrimary: { backgroundColor: c.primary },
    ctaSecondary: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
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
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
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
      borderBottomColor: c.border,
    },
  });
}
