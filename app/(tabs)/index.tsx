import { useRouter } from 'expo-router';
import { Bell, CaretRight, MagnifyingGlass, MapPin, Plus, WifiSlash } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { Text } from '@/components/ui/Text';
import { CityPickerSheet } from '@/components/feature/CityPickerSheet';
import { useSession } from '@/store/session';
import { useMatches } from '@/hooks/useMatches';
import { useUnreadCount } from '@/hooks/useNotifications';
import { MatchCard } from '@/features/match/MatchCard';
import { MatchTypePromoCard } from '@/features/match/MatchTypePromoCard';
import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Buenos días', emoji: '☀️' };
  if (h >= 12 && h < 19) return { text: 'Buenas tardes', emoji: '⛅' };
  return { text: 'Buenas noches', emoji: '🌙' };
}


const PROMO_TYPES = ['chill', 'seria', 'competencia'] as const;

export default function HomeScreen() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const setCityStore = useSession((s) => s.setCity);
  const displayName = user?.name ?? '…';
  const city = user?.city ?? '';
  const [locationOpen, setLocationOpen] = useState(false);
  const {
    data: nearbyMatches = [],
    isLoading: matchesLoading,
    isError: matchesError,
    refetch: refetchMatches,
    isRefetching: matchesRefreshing,
  } = useMatches({ limit: 3 });
  const { data: unreadCount = 0 } = useUnreadCount();

  // Bell shake
  const bellRotate = useSharedValue(0);
  const prevUnread = useRef(0);
  useEffect(() => {
    if (unreadCount > prevUnread.current && unreadCount > 0) {
      bellRotate.value = withSequence(
        withTiming(-18, { duration: 60 }),
        withTiming(18, { duration: 80 }),
        withTiming(-12, { duration: 70 }),
        withTiming(12, { duration: 70 }),
        withTiming(0, { duration: 60 }),
      );
    }
    prevUnread.current = unreadCount;
  }, [unreadCount, bellRotate]);
  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotate.value}deg` }],
  }));

  const { text: greetText, emoji: greetEmoji } = useMemo(() => getGreeting(), []);
  const handleSelectCity = (selected: string) => { setCityStore(selected); };
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={matchesRefreshing}
            onRefresh={() => void refetchMatches()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Avatar name={displayName} uri={user?.avatarUrl} size={44} />
            <View>
              <View style={s.greetRow}>
                <Text variant="h3" color="textPrimary">
                  {greetText}, {displayName}
                </Text>
                <Text variant="h3" color="textPrimary">{' '}{greetEmoji}</Text>
              </View>
              <Text variant="small" color="textSecondary">
                ¿Qué vas a jugar hoy?
              </Text>
            </View>
          </View>
          <Animated.View style={bellStyle}>
            <PressableScale
              style={s.bellBtn}
              scaleTo={0.92}
              onPress={() => router.push('/notificaciones')}
            >
              <Bell size={22} color={c.textPrimary} weight="regular" />
              {unreadCount > 0 ? <View style={s.bellDot} /> : null}
            </PressableScale>
          </Animated.View>
        </View>

        {/* City */}
        <PressableScale style={s.locationCard} scaleTo={0.98} onPress={() => setLocationOpen(true)}>
          <MapPin size={16} color={c.primary} weight="fill" />
          <Text variant="body" color={city ? 'textSecondary' : 'textTertiary'} style={{ flex: 1 }}>
            {city || 'Selecciona tu ciudad'}
          </Text>
          <CaretRight size={16} color={c.textTertiary} weight="bold" />
        </PressableScale>

        {/* CTAs */}
        <View style={s.ctaRow}>
          <PressableScale style={[s.cta, s.ctaPrimary]} scaleTo={0.97} onPress={() => router.push('/(tabs)/buscar')}>
            <View style={s.ctaIconWrapPrimary}>
              <MagnifyingGlass size={22} color={c.bg} weight="bold" />
            </View>
            <Text variant="h3" color="bg">Buscar{'\n'}partida</Text>
            <Text variant="small" color="bg" style={s.ctaSubPrimary}>Encuentra partidas cerca de ti</Text>
          </PressableScale>
          {!user?.isAdmin ? (
            <PressableScale style={[s.cta, s.ctaSecondary]} scaleTo={0.97} onPress={() => router.push('/crear')}>
              <View style={s.ctaIconWrapSecondary}>
                <Plus size={22} color={c.primary} weight="bold" />
              </View>
              <Text variant="h3" color="textPrimary">Crear{'\n'}partida</Text>
              <Text variant="small" color="textSecondary">Publica tu partida y encuentra jugadores</Text>
            </PressableScale>
          ) : null}
        </View>

        {/* Match types — staggered entrance */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text variant="h3" color="textPrimary">Tipo de partida</Text>
          </View>
          <View style={s.typesRow}>
            {PROMO_TYPES.map((type, i) => (
              <Animated.View key={type} entering={FadeInDown.delay(i * 80).duration(400).springify().damping(18)} style={{ flex: 1 }}>
                <MatchTypePromoCard type={type} />
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Nearby matches — staggered entrance */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text variant="h3" color="textPrimary">Partidas cerca de ti</Text>
            <PressableScale scaleTo={0.95} onPress={() => router.push('/(tabs)/buscar')}>
              <Text variant="smallMedium" color="primary">Ver todas</Text>
            </PressableScale>
          </View>
          <View style={s.matchList}>
            {matchesLoading && nearbyMatches.length === 0 ? (
              <>
                <ShimmerSkeleton width="100%" height={120} borderRadius={radius.lg} />
                <ShimmerSkeleton width="100%" height={120} borderRadius={radius.lg} />
              </>
            ) : matchesError ? (
              <View style={s.inlineError}>
                <WifiSlash size={18} color={c.alert} weight="bold" />
                <Text variant="small" color="textTertiary" style={{ flex: 1 }}>Error al cargar partidas</Text>
                <PressableScale scaleTo={0.95} onPress={() => void refetchMatches()}>
                  <Text variant="smallMedium" color="primary">Reintentar</Text>
                </PressableScale>
              </View>
            ) : (
              nearbyMatches.map((m, i) => (
                <Animated.View key={m.id} entering={FadeInDown.delay(i * 80).duration(400).springify().damping(18)}>
                  <MatchCard match={m} onPress={() => router.push(`/match/${m.id}`)} />
                </Animated.View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <CityPickerSheet
        visible={locationOpen}
        onClose={() => setLocationOpen(false)}
        currentCity={city}
        onSelect={handleSelectCity}
      />
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.xl },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
    greetRow: { flexDirection: 'row', alignItems: 'center' },
    locationCard: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg,
    },
    bellBtn: {
      width: 44, height: 44, borderRadius: radius.full,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    bellDot: {
      position: 'absolute', top: 10, right: 12,
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: c.alert, borderWidth: 1.5, borderColor: c.surface,
    },
    ctaRow: { flexDirection: 'row', gap: spacing.md },
    cta: { flex: 1, borderRadius: radius.lg, padding: spacing.lg, minHeight: 168, justifyContent: 'space-between' },
    ctaPrimary: { backgroundColor: c.primary },
    ctaSecondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    ctaIconWrapPrimary: {
      width: 44, height: 44, borderRadius: radius.full,
      backgroundColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center',
    },
    ctaIconWrapSecondary: {
      width: 44, height: 44, borderRadius: radius.full,
      backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    ctaSubPrimary: { opacity: 0.8 },
    section: { gap: spacing.sm },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    typesRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
    matchList: { gap: spacing.md, marginTop: spacing.xs },
    inlineError: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingVertical: spacing.md, paddingHorizontal: spacing.md,
      backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border,
    },
  });
}
