import { useLocalSearchParams, useRouter } from 'expo-router';
import { CaretRight, Check, Lightning, MapPin, RocketLaunch, Shield, Users, X } from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollView as ScrollViewType,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Crosshair } from '@/components/brand/Crosshair';
import { SportOrbs } from '@/components/feature/SportOrbs';
import { CityPickerSheet } from '@/components/feature/CityPickerSheet';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { PositionPitch } from '@/features/match/PositionPitch';
import { basketPositionsByModality, footballPositionsByModality } from '@/features/match/helpers';
import { useColors } from '@/hooks/useColors';
import { labelPosition } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Position, SkillLevel, Sport } from '@/types/domain';

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_SPORTS: Sport[] = ['futbol', 'basket', 'tenis', 'padel', 'beachTennis'];
const ALL_LEVELS: SkillLevel[] = [1, 2, 3, 4, 5];
const TOTAL_STEPS = 4; // 3 intro + 1 setup

const SPORT_CONFIG: Record<Sport, { color: string; emoji: string; label: string; sub: string }> = {
  futbol:      { color: '#4ade80', emoji: '⚽', label: 'Fútbol',       sub: '5 · 7 · 11' },
  basket:      { color: '#fb923c', emoji: '🏀', label: 'Basket',       sub: '3v3 · 5v5' },
  tenis:       { color: '#38bdf8', emoji: '🎾', label: 'Tenis',        sub: 'Singles · Dobles' },
  padel:       { color: '#a78bfa', emoji: '🏓', label: 'Pádel',        sub: 'Dobles' },
  beachTennis: { color: '#fbbf24', emoji: '🏖️', label: 'Beach Tennis', sub: 'Dobles · Singles' },
};

const LEVEL_COLOR: Record<SkillLevel, string> = {
  1: '#FF3B30', 2: '#FF6B00', 3: '#FF9500', 4: '#ADDE2F', 5: '#7BFF00',
};

const LEVEL_LABEL: Record<SkillLevel, string> = {
  1: 'Principiante', 2: 'Básico', 3: 'Intermedio', 4: 'Avanzado', 5: 'Elite',
};

const FOOTBALL_POSITION_IDS = ['portero', 'defensa', 'lateral', 'mediocampo', 'extremo', 'delantero'];
const BASKET_POSITION_IDS   = ['base', 'escolta', 'alero', 'aleroPivot', 'pivot'];

const FUTBOL_MODS = [
  { id: 'futbol5'  as const, label: 'F5' },
  { id: 'futbol7'  as const, label: 'F7' },
  { id: 'futbol11' as const, label: 'F11' },
];
const BASKET_MODS = [
  { id: 'basket3v3' as const, label: '3v3' },
  { id: 'basket5v5' as const, label: '5v5' },
];

// ── Animated pulse hero (slides 2 & 3) ───────────────────────────────────────

function PulseHero({
  children,
  color,
  accentColor,
}: {
  children: React.ReactNode;
  color: string;
  accentColor?: string;
}) {
  const r1Scale   = useSharedValue(1);
  const r1Opacity = useSharedValue(0.4);
  const r2Scale   = useSharedValue(1);
  const r2Opacity = useSharedValue(0.4);
  const r3Scale   = useSharedValue(1);
  const r3Opacity = useSharedValue(0.4);
  const centerGlow = useSharedValue(0.1);
  const centerScale = useSharedValue(1);

  const ringAnim = (scale: typeof r1Scale, opacity: typeof r1Opacity, delay: number) => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.8, { duration: 1400, easing: Easing.out(Easing.quad) }),
          withTiming(1,   { duration: 0 }),
        ),
        -1,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 1400, easing: Easing.out(Easing.quad) }),
          withTiming(0.4, { duration: 0 }),
        ),
        -1,
      ),
    );
  };

  useEffect(() => {
    ringAnim(r1Scale, r1Opacity, 0);
    ringAnim(r2Scale, r2Opacity, 470);
    ringAnim(r3Scale, r3Opacity, 940);

    centerGlow.value = withRepeat(
      withSequence(
        withTiming(0.28, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.08, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    centerScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1,    { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );

    return () => {
      cancelAnimation(r1Scale); cancelAnimation(r1Opacity);
      cancelAnimation(r2Scale); cancelAnimation(r2Opacity);
      cancelAnimation(r3Scale); cancelAnimation(r3Opacity);
      cancelAnimation(centerGlow); cancelAnimation(centerScale);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: r1Scale.value }], opacity: r1Opacity.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: r2Scale.value }], opacity: r2Opacity.value }));
  const ring3Style = useAnimatedStyle(() => ({ transform: [{ scale: r3Scale.value }], opacity: r3Opacity.value }));
  const glowStyle  = useAnimatedStyle(() => ({ opacity: centerGlow.value }));
  const circStyle  = useAnimatedStyle(() => ({ transform: [{ scale: centerScale.value }] }));

  const glowColor = accentColor ?? color;

  return (
    <View style={heroStyles.wrap}>
      <Animated.View style={[heroStyles.ring, { borderColor: color }, ring1Style]} />
      <Animated.View style={[heroStyles.ring, { borderColor: color }, ring2Style]} />
      <Animated.View style={[heroStyles.ring, { borderColor: color }, ring3Style]} />
      {/* breathing center glow */}
      <Animated.View style={[heroStyles.glow, { backgroundColor: glowColor }, glowStyle]} />
      <Animated.View style={[heroStyles.circle, { backgroundColor: `${color}14`, borderColor: `${color}55` }, circStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
  },
  glow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Slide 1 hero — SportOrbs with glow ring ───────────────────────────────────

function OrbsHero() {
  const ringScale   = useSharedValue(0.88);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    ringScale.value = withDelay(200, withSpring(1, { damping: 12 }));
    ringOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));

    return () => { cancelAnimation(ringScale); cancelAnimation(ringOpacity); };
  }, [ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={orbStyles.wrap}>
      <Animated.View style={[orbStyles.backdrop, ringStyle]} />
      <SportOrbs size={160} />
    </View>
  );
}

const orbStyles = StyleSheet.create({
  wrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  backdrop: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(123,255,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(123,255,0,0.15)',
  },
});

// ── Slide text fade ───────────────────────────────────────────────────────────

function SlideText({
  badge,
  badgeColor,
  title,
  description,
  step,
}: {
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
  step: number;
}) {
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(14);

  useEffect(() => {
    opacity.value    = 0;
    translateY.value = 14;
    opacity.value    = withDelay(80, withTiming(1, { duration: 340 }));
    translateY.value = withDelay(80, withTiming(0, { duration: 340, easing: Easing.out(Easing.quad) }));
  }, [step, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, { alignItems: 'center', gap: spacing.sm }]}>
      <View style={[staticStyles.badge, { backgroundColor: `${badgeColor}18`, borderColor: `${badgeColor}44` }]}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: badgeColor, letterSpacing: 0.8 }}>
          {badge}
        </Text>
      </View>
      <Text variant="h1" color="textPrimary" style={staticStyles.center}>{title}</Text>
      <Text variant="body" color="textSecondary" style={staticStyles.center}>{description}</Text>
    </Animated.View>
  );
}

// ── Intro slide definitions ───────────────────────────────────────────────────

interface IntroSlide {
  hero: (c: ColorPalette) => React.ReactNode;
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
}

const buildSlides = (c: ColorPalette): IntroSlide[] => [
  {
    hero: () => <OrbsHero />,
    badge: 'ENCUENTRA',
    badgeColor: c.primary,
    title: 'Tu deporte, tu cancha',
    description: 'Busca partidas cerca de ti por deporte, nivel y horario. Únete con un toque.',
  },
  {
    hero: () => (
      <PulseHero color="#fb923c">
        <Users size={52} color="#fb923c" weight="fill" />
      </PulseHero>
    ),
    badge: 'CONECTA',
    badgeColor: '#fb923c',
    title: 'Arma equipo al instante',
    description: 'Conecta con jugadores verificados que comparten tu nivel y tus ganas de jugar.',
  },
  {
    hero: () => (
      <PulseHero color="#38bdf8" accentColor="#38bdf8">
        <Shield size={52} color="#38bdf8" weight="fill" />
      </PulseHero>
    ),
    badge: 'CONFIANZA',
    badgeColor: '#38bdf8',
    title: 'Juega sin dramas',
    description: 'Perfiles verificados, pagos transparentes y sistema de reputación. Solo juega.',
  },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = preview === '1';
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width: screenWidth } = useWindowDimensions();
  const slides = useMemo(() => buildSlides(c), [c]);

  const user = useSession((st) => st.user);
  const setUser = useSession((st) => st.setUser);
  const setOnboarded = useSession((st) => st.setOnboarded);

  const [step, setStep] = useState(0);
  const isIntro = step < slides.length;
  const introRef = useRef<ScrollViewType | null>(null);

  // Setup state
  const [username, setUsername]   = useState('');
  const [city, setCity]           = useState('');
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [sports, setSports]       = useState<Sport[]>([]);
  const [sportLevels, setSportLevels] = useState<Partial<Record<Sport, SkillLevel>>>({});
  const [positions, setPositions] = useState<Position[]>([]);
  const [pitchTab, setPitchTab]   = useState<'futbol' | 'basket'>('futbol');
  const [futbolMod, setFutbolMod] = useState<'futbol5' | 'futbol7' | 'futbol11'>('futbol5');
  const [basketMod, setBasketMod] = useState<'basket3v3' | 'basket5v5'>('basket3v3');
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasFutbol     = sports.includes('futbol');
  const hasBasket     = sports.includes('basket');
  const hasPitchSport = hasFutbol || hasBasket;
  const hasBothPitch  = hasFutbol && hasBasket;
  const activePitch: Sport = hasBothPitch ? pitchTab : hasFutbol ? 'futbol' : 'basket';

  const toggleSport = useCallback((sp: Sport) => {
    setSports((cur) => {
      if (cur.includes(sp)) {
        if (sp === 'futbol') setPositions((p) => p.filter((pos) => !FOOTBALL_POSITION_IDS.includes(pos)));
        if (sp === 'basket') setPositions((p) => p.filter((pos) => !BASKET_POSITION_IDS.includes(pos)));
        setSportLevels((prev) => { const n = { ...prev }; delete n[sp]; return n; });
        return cur.filter((x) => x !== sp);
      }
      return [...cur, sp];
    });
  }, []);

  const next = () => {
    const nextStep = Math.min(step + 1, TOTAL_STEPS - 1);
    if (nextStep < slides.length) {
      introRef.current?.scrollTo({ x: nextStep * screenWidth, animated: true });
    }
    setStep(nextStep);
  };

  const skipToSetup = () => setStep(slides.length);

  const saveAndEnter = async () => {
    if (isPreview) { router.back(); return; }
    if (sports.length === 0) { setSaveError('Selecciona al menos un deporte.'); return; }
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) { setSaveError('El nombre de usuario es requerido.'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
      setSaveError('El usuario debe tener entre 3 y 20 caracteres. Solo letras, números y _.');
      return;
    }
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    const { data: existing } = await supabase
      .from('profiles').select('id').eq('username', trimmedUsername).neq('id', user.id).maybeSingle();
    if (existing) { setSaveError('Ese @usuario ya está en uso. Elige otro.'); setSaving(false); return; }

    const dominantLevel: SkillLevel = sports.length > 0
      ? (Math.max(...sports.map((sp) => sportLevels[sp] ?? 3)) as SkillLevel)
      : 3;

    const { error } = await supabase.from('profiles').update({
      username: trimmedUsername,
      city: city.trim() || null,
      skill_level: dominantLevel,
      sport_levels: sportLevels,
      sports,
      positions,
      onboarded: true,
    }).eq('id', user.id);

    if (error) { setSaveError(error.message); setSaving(false); return; }

    setUser({
      ...user,
      username: trimmedUsername,
      city: city.trim() || undefined,
      skillLevel: dominantLevel,
      sportLevels,
      sports,
      positions,
      onboarded: true,
    });
    setOnboarded(true);
    router.replace('/(tabs)');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={staticStyles.topBar}>
        <Crosshair size={32} />
        {isPreview ? (
          <PressableScale onPress={() => router.back()} scaleTo={0.9} style={s.closeBtn}>
            <X size={18} color={c.textSecondary} weight="bold" />
          </PressableScale>
        ) : isIntro ? (
          <PressableScale onPress={skipToSetup} scaleTo={0.95} style={s.skipBtn}>
            <Text variant="smallMedium" color="textSecondary">Saltar</Text>
          </PressableScale>
        ) : (
          <View style={s.skipBtnPlaceholder} />
        )}
      </View>

      {/* Content */}
      {isIntro ? (
        <ScrollView
          ref={introRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={200}
          bounces={false}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setStep(page);
          }}
          style={staticStyles.introScroll}
          contentContainerStyle={{ width: screenWidth * slides.length }}
        >
          {slides.map((slide, i) => (
            <View key={slide.title} style={[staticStyles.introContent, { width: screenWidth }]}>
              {slide.hero(c)}
              <SlideText
                badge={slide.badge}
                badgeColor={slide.badgeColor}
                title={slide.title}
                description={slide.description}
                step={i}
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.setupScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="h2" color="textPrimary">Configura tu perfil</Text>
          <Text variant="body" color="textSecondary">
            Cuéntanos cómo juegas para encontrar las mejores partidas.
          </Text>

          {/* Username */}
          {!isPreview && (
            <TextInput
              label="Nombre de usuario"
              placeholder="tuusuario"
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
              autoCapitalize="none"
              autoCorrect={false}
              leading={<Text variant="body" color="textSecondary">@</Text>}
            />
          )}

          {/* City */}
          <View style={s.section}>
            <Text variant="caption" color="textSecondary">CIUDAD DONDE JUEGAS (OPCIONAL)</Text>
            <PressableScale
              onPress={() => setCitySheetOpen(true)}
              scaleTo={0.97}
              style={[s.cityRow, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <MapPin size={16} color={city ? c.primary : c.textTertiary} weight={city ? 'fill' : 'regular'} />
              <Text variant="body" color={city ? 'textPrimary' : 'textTertiary'} style={{ flex: 1 }}>
                {city || 'Selecciona tu ciudad'}
              </Text>
              <CaretRight size={16} color={c.textTertiary} weight="bold" />
            </PressableScale>
          </View>

          {/* Sports */}
          <View style={s.section}>
            <Text variant="caption" color="textSecondary">DEPORTES QUE PRACTICAS *</Text>
            <View style={s.sportsGrid}>
              {ALL_SPORTS.map((sp, i) => {
                const cfg = SPORT_CONFIG[sp];
                const active = sports.includes(sp);
                const isLast = i === ALL_SPORTS.length - 1;
                const isOdd  = ALL_SPORTS.length % 2 !== 0;
                return (
                  <PressableScale
                    key={sp}
                    onPress={() => toggleSport(sp)}
                    scaleTo={0.95}
                    style={[
                      s.sportCard,
                      isLast && isOdd ? s.sportCardFull : s.sportCardHalf,
                      {
                        borderColor: active ? cfg.color : c.border,
                        backgroundColor: active ? `${cfg.color}12` : c.surface,
                        borderWidth: active ? 1.5 : 1,
                      },
                    ]}
                  >
                    {active && (
                      <View style={[s.sportCheckBadge, { backgroundColor: cfg.color }]}>
                        <Check size={9} color="#000" weight="bold" />
                      </View>
                    )}
                    <Text style={s.sportEmoji}>{cfg.emoji}</Text>
                    <Text variant="bodyMedium" style={{ color: active ? cfg.color : c.textPrimary, marginTop: spacing.xs }}>
                      {cfg.label}
                    </Text>
                    <Text variant="caption" color="textTertiary">{cfg.sub}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {/* Level per sport */}
          {sports.length > 0 && (
            <View style={s.section}>
              <Text variant="caption" color="textSecondary">NIVEL DE JUEGO</Text>
              <View style={{ gap: spacing.sm }}>
                {sports.map((sp) => {
                  const cfg = SPORT_CONFIG[sp];
                  const lvl: SkillLevel = sportLevels[sp] ?? 3;
                  return (
                    <View key={sp} style={[s.sportLevelRow, { borderColor: c.border }]}>
                      <View style={s.sportLevelLeft}>
                        <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
                        <View>
                          <Text variant="bodyMedium" style={{ color: cfg.color }}>{cfg.label}</Text>
                          <Text variant="caption" color="textTertiary" style={{ fontSize: 10 }}>
                            {LEVEL_LABEL[lvl]}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                        {ALL_LEVELS.map((n) => {
                          const active = n <= lvl;
                          const dotColor = LEVEL_COLOR[n];
                          return (
                            <PressableScale
                              key={n}
                              onPress={() => setSportLevels((prev) => ({ ...prev, [sp]: n as SkillLevel }))}
                              scaleTo={0.85}
                              style={[s.sportLevelDot, {
                                backgroundColor: active ? dotColor : `${dotColor}20`,
                                borderColor: active ? dotColor : `${dotColor}50`,
                              }]}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#000' : dotColor }}>
                                {n}
                              </Text>
                            </PressableScale>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Positions */}
          {hasPitchSport && (
            <View style={s.section}>
              <Text variant="caption" color="textSecondary">POSICIÓN PREFERIDA</Text>

              {hasBothPitch && (
                <View style={s.pitchTabs}>
                  {(['futbol', 'basket'] as const).map((sp) => {
                    const cfg = SPORT_CONFIG[sp];
                    const active = pitchTab === sp;
                    return (
                      <PressableScale
                        key={sp}
                        onPress={() => setPitchTab(sp)}
                        scaleTo={0.96}
                        style={[s.pitchTabBtn, active && { borderColor: cfg.color, backgroundColor: `${cfg.color}12` }]}
                      >
                        <Text style={{ fontSize: 13, color: active ? cfg.color : c.textTertiary }}>
                          {cfg.emoji} {cfg.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              )}

              {(() => {
                const cfg = SPORT_CONFIG[activePitch];
                const isFutbol = activePitch === 'futbol';
                const activeMod = isFutbol ? futbolMod : basketMod;
                const mods = isFutbol ? FUTBOL_MODS : BASKET_MODS;
                const selectedForSport = positions.filter((p) =>
                  isFutbol ? FOOTBALL_POSITION_IDS.includes(p) : BASKET_POSITION_IDS.includes(p),
                );
                return (
                  <View style={[s.pitchCard, { borderColor: `${cfg.color}40` }]}>
                    <View style={[s.pitchHeader, { backgroundColor: `${cfg.color}0C` }]}>
                      <View style={s.modChipsRow}>
                        {mods.map((m) => {
                          const active = activeMod === m.id;
                          return (
                            <PressableScale
                              key={m.id}
                              onPress={() => isFutbol
                                ? setFutbolMod(m.id as typeof futbolMod)
                                : setBasketMod(m.id as typeof basketMod)
                              }
                              scaleTo={0.92}
                              style={[
                                s.modChip,
                                active
                                  ? { borderColor: cfg.color, backgroundColor: `${cfg.color}20` }
                                  : { borderColor: c.border, backgroundColor: 'transparent' },
                              ]}
                            >
                              <Text style={{ fontSize: 11, fontWeight: active ? '600' : '400', color: active ? cfg.color : c.textTertiary }}>
                                {m.label}
                              </Text>
                            </PressableScale>
                          );
                        })}
                        <Text style={{ fontSize: 11, color: c.textTertiary, marginLeft: 'auto', alignSelf: 'center' }}>
                          {selectedForSport.length > 0 ? `${selectedForSport.length} pos.` : 'Toca la cancha'}
                        </Text>
                      </View>
                    </View>
                    <PositionPitch
                      sport={activePitch}
                      modality={activeMod}
                      selectedPositions={positions}
                      onSetPositions={setPositions}
                      accentColor={cfg.color}
                    />
                    {selectedForSport.length > 0 && (
                      <View style={s.posBadgesRow}>
                        {selectedForSport.map((p) => (
                          <View key={p} style={[s.posBadge, { borderColor: `${cfg.color}60`, backgroundColor: `${cfg.color}10` }]}>
                            <Text style={{ fontSize: 11, color: cfg.color }}>{labelPosition(p)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}
            </View>
          )}

          {sports.length > 0 && !hasPitchSport && (
            <View style={s.section}>
              <Text variant="caption" color="textSecondary">POSICIÓN PREFERIDA</Text>
              <View style={s.cualquieraCard}>
                <View style={{ gap: 2 }}>
                  <Text variant="bodyMedium" color="textPrimary">Cualquiera</Text>
                  <Text variant="caption" color="textTertiary">Los deportes de raqueta no tienen posición fija</Text>
                </View>
              </View>
            </View>
          )}

          {saveError ? (
            <Text variant="small" color="alert" style={staticStyles.center}>{saveError}</Text>
          ) : null}
        </ScrollView>
      )}

      <CityPickerSheet
        visible={citySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        currentCity={city}
        onSelect={setCity}
      />

      {/* Footer */}
      <View style={staticStyles.footer}>
        <ProgressDots total={TOTAL_STEPS} current={step} />
        {saving ? (
          <ActivityIndicator color={c.primary} />
        ) : isIntro ? (
          <Button
            label={step === slides.length - 1 ? 'Configurar perfil' : 'Siguiente'}
            onPress={next}
          />
        ) : isPreview ? (
          <Button label="Cerrar vista previa" variant="secondary" onPress={() => router.back()} />
        ) : (
          <Button
            label="Empezar a jugar"
            onPress={saveAndEnter}
            disabled={sports.length === 0}
          />
        )}
      </View>
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const staticStyles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  introScroll: { flex: 1 },
  introContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.md,
  },
  center: { textAlign: 'center' },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
    alignItems: 'stretch',
  },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    skipBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipBtnPlaceholder: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    setupScroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.huge,
      gap: spacing.lg,
    },
    section: { gap: spacing.sm },
    cityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      minHeight: 50,
    },
    sportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    sportCard: {
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: 2,
    },
    sportCardHalf: { width: '48%' },
    sportCardFull: { width: '100%' },
    sportCheckBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sportEmoji: { fontSize: 28, lineHeight: 34, marginTop: spacing.sm },
    sportLevelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    sportLevelLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    sportLevelDot: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pitchTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
    pitchTabBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    pitchCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    pitchHeader: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    modChipsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    modChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    posBadgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      padding: spacing.md,
      paddingTop: spacing.sm,
    },
    posBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    cualquieraCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
  });
}
