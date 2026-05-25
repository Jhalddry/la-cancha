import { useRouter } from 'expo-router';
import { CaretRight, MagnifyingGlass, MapPin, ShieldCheck, UsersThree } from 'phosphor-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollView as ScrollViewType,
} from 'react-native';

import { Crosshair } from '@/components/brand/Crosshair';
import { CityPickerSheet } from '@/components/feature/CityPickerSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconCircle } from '@/components/ui/IconCircle';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { Screen } from '@/components/ui/Screen';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { basketPositionsByModality, footballPositionsByModality } from '@/features/match/helpers';
import { useColors } from '@/hooks/useColors';
import { labelPosition, labelSkill, labelSport } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/store/session';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Position, SkillLevel, Sport } from '@/types/domain';

const ALL_SPORTS: Sport[] = ['futbol', 'basket', 'tenis', 'padel', 'beachTennis'];
const SPORT_EMOJIS: Record<Sport, string> = {
  futbol: '⚽',
  basket: '🏀',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
};
const ALL_LEVELS: SkillLevel[] = [1, 2, 3, 4, 5];
const TOTAL_STEPS = 4; // 3 intro + 1 setup

interface IntroSlide {
  icon: (c: ColorPalette) => React.ReactNode;
  title: string;
  description: string;
}

const INTRO: IntroSlide[] = [
  {
    icon: (c) => <MagnifyingGlass size={56} color={c.primary} weight="bold" />,
    title: 'Encuentra tu partida',
    description: 'Busca partidas cerca de ti por deporte, nivel y horario. Únete con un toque.',
  },
  {
    icon: (c) => <UsersThree size={56} color={c.primary} weight="fill" />,
    title: 'Conecta con jugadores',
    description: 'Arma equipo con gente verificada que comparte tu nivel y tus ganas de jugar.',
  },
  {
    icon: (c) => <ShieldCheck size={56} color={c.primary} weight="fill" />,
    title: 'Juega seguro',
    description: 'Perfiles verificados, pagos transparentes y reglas claras. Concéntrate en jugar.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width: screenWidth } = useWindowDimensions();

  const user = useSession((st) => st.user);
  const setUser = useSession((st) => st.setUser);
  const setOnboarded = useSession((st) => st.setOnboarded);

  const [step, setStep] = useState(0);
  const isIntro = step < INTRO.length;
  const introRef = useRef<ScrollViewType | null>(null);

  // Setup state
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);
  const [skill, setSkill] = useState<SkillLevel>(3);
  const [positions, setPositions] = useState<Position[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const availablePositions = useMemo<Position[]>(() => {
    const set = new Set<Position>();
    if (sports.includes('futbol')) footballPositionsByModality.futbol11.forEach((p) => set.add(p));
    if (sports.includes('basket')) basketPositionsByModality.basket5v5.forEach((p) => set.add(p));
    return Array.from(set);
  }, [sports]);

  const toggleSport = (sp: Sport) =>
    setSports((cur) => (cur.includes(sp) ? cur.filter((x) => x !== sp) : [...cur, sp]));
  const togglePosition = (p: Position) =>
    setPositions((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const next = () => {
    const nextStep = Math.min(step + 1, TOTAL_STEPS - 1);
    if (nextStep < INTRO.length) {
      introRef.current?.scrollTo({ x: nextStep * screenWidth, animated: true });
    }
    setStep(nextStep);
  };

  const skipToSetup = () => setStep(INTRO.length);

  const saveAndEnter = async () => {
    if (sports.length === 0) {
      setSaveError('Selecciona al menos un deporte.');
      return;
    }
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      setSaveError('El nombre de usuario es requerido.');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
      setSaveError('El usuario debe tener entre 3 y 20 caracteres. Solo letras, números y _.');
      return;
    }
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    // Uniqueness check
    if (trimmedUsername) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', user.id)
        .maybeSingle();
      if (existing) {
        setSaveError('Ese @usuario ya está en uso. Elige otro.');
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username: trimmedUsername || null,
        city: city.trim() || null,
        skill_level: skill,
        sports,
        positions,
        onboarded: true,
      })
      .eq('id', user.id);

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setUser({
      ...user,
      username: trimmedUsername || undefined,
      city: city.trim() || undefined,
      skillLevel: skill,
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
        {isIntro ? (
          <PressableScale onPress={skipToSetup} scaleTo={0.95} style={s.skipBtn}>
            <Text variant="smallMedium" color="textSecondary">
              Saltar
            </Text>
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
          contentContainerStyle={{ width: screenWidth * INTRO.length }}
        >
          {INTRO.map((slide) => (
            <View key={slide.title} style={[staticStyles.introContent, { width: screenWidth }]}>
              <View style={s.iconHero}>{slide.icon(c)}</View>
              <Text variant="h1" color="textPrimary" style={staticStyles.center}>
                {slide.title}
              </Text>
              <Text variant="body" color="textSecondary" style={staticStyles.center}>
                {slide.description}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.setupScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="h2" color="textPrimary">
            Configura tu perfil
          </Text>
          <Text variant="body" color="textSecondary">
            Cuéntanos cómo juegas para encontrar las mejores partidas.
          </Text>

          {/* Username */}
          <TextInput
            label="Nombre de usuario"
            placeholder="tuusuario"
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
            autoCapitalize="none"
            autoCorrect={false}
            leading={<Text variant="body" color="textSecondary">@</Text>}
          />

          {/* City */}
          <View style={s.section}>
            <Text variant="caption" color="textSecondary">
              CIUDAD DONDE JUEGAS (OPCIONAL)
            </Text>
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
            <Text variant="caption" color="textSecondary">
              DEPORTES QUE PRACTICAS *
            </Text>
            <View style={s.sportsGrid}>
              {ALL_SPORTS.map((sp) => {
                const active = sports.includes(sp);
                return (
                  <PressableScale
                    key={sp}
                    onPress={() => toggleSport(sp)}
                    style={s.sportItem}
                    scaleTo={0.94}
                  >
                    <IconCircle
                      size={56}
                      bg={active ? c.primarySoft : c.surface}
                      border={active ? c.primary : c.border}
                    >
                      <Text style={staticStyles.emoji}>{SPORT_EMOJIS[sp]}</Text>
                    </IconCircle>
                    <Text variant="caption" color={active ? 'primary' : 'textSecondary'}>
                      {labelSport(sp)}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {/* Skill level */}
          <View style={s.section}>
            <Text variant="caption" color="textSecondary">
              NIVEL DE JUEGO
            </Text>
            <View style={s.levelRow}>
              {ALL_LEVELS.map((lvl) => (
                <PressableScale
                  key={lvl}
                  onPress={() => setSkill(lvl)}
                  style={[s.levelBtn, skill === lvl && s.levelBtnActive]}
                  scaleTo={0.94}
                >
                  <Stars
                    level={lvl}
                    size={10}
                    filledColor={skill === lvl ? c.textOnPrimary : c.primary}
                    emptyColor={skill === lvl ? `${c.textOnPrimary}55` : c.border}
                  />
                  <Text
                    variant="caption"
                    color={skill === lvl ? 'textOnPrimary' : 'textSecondary'}
                    style={staticStyles.levelLabel}
                  >
                    {labelSkill(lvl)}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </View>

          {/* Positions */}
          {availablePositions.length > 0 && (
            <View style={s.section}>
              <Text variant="caption" color="textSecondary">
                POSICIÓN PREFERIDA
              </Text>
              <View style={s.chipsRow}>
                {availablePositions.map((p) => (
                  <Chip
                    key={p}
                    label={labelPosition(p)}
                    selected={positions.includes(p)}
                    onPress={() => togglePosition(p)}
                  />
                ))}
              </View>
            </View>
          )}

          {saveError ? (
            <Text variant="small" color="alert" style={staticStyles.center}>
              {saveError}
            </Text>
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
            label={step === INTRO.length - 1 ? 'Configurar perfil' : 'Siguiente'}
            onPress={next}
          />
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
    gap: spacing.lg,
  },
  center: { textAlign: 'center' },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
    alignItems: 'stretch',
  },
  emoji: { fontSize: 24, lineHeight: 30, textAlign: 'center' },
  levelLabel: { fontSize: 9, textAlign: 'center', marginTop: 2 },
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
    skipBtnPlaceholder: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    iconHero: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
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
    sportsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    sportItem: { alignItems: 'center', gap: spacing.xs, width: 64 },
    levelRow: { flexDirection: 'row', gap: spacing.xs },
    levelBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      minHeight: 52,
    },
    levelBtnActive: { backgroundColor: c.primaryBg, borderColor: c.primary },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  });
}
