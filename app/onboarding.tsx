import { useRouter } from 'expo-router';
import { MagnifyingGlass, ShieldCheck, UsersThree } from 'phosphor-react-native';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Crosshair } from '@/components/brand/Crosshair';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import type { ColorPalette } from '@/theme/palettes';
import { radius, spacing } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  icon: (c: ColorPalette) => ReactNode;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
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
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * SCREEN_WIDTH, animated: true });
    } else {
      router.replace('/login');
    }
  };

  const skip = () => router.replace('/login');

  return (
    <Screen>
      <View style={staticStyles.topBar}>
        <Crosshair size={32} />
        {index < SLIDES.length - 1 ? (
          <PressableScale onPress={skip} scaleTo={0.95} style={s.skipBtn}>
            <Text variant="smallMedium" color="textSecondary">
              Saltar
            </Text>
          </PressableScale>
        ) : (
          <View style={s.skipBtn} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={staticStyles.scroll}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[staticStyles.slide, { width: SCREEN_WIDTH }]}>
            <View style={s.iconHero}>{slide.icon(c)}</View>
            <Text variant="h1" color="textPrimary" style={staticStyles.title}>
              {slide.title}
            </Text>
            <Text variant="body" color="textSecondary" style={staticStyles.desc}>
              {slide.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={staticStyles.footer}>
        <ProgressDots total={SLIDES.length} current={index} />
        <Button
          label={index === SLIDES.length - 1 ? 'Empezar' : 'Siguiente'}
          onPress={next}
        />
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
  scroll: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.lg,
  },
  title: { textAlign: 'center' },
  desc: { textAlign: 'center' },
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
  });
}
