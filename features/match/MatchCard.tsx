import { LinearGradient } from 'expo-linear-gradient';
import { Clock, MapPin, UsersThree } from 'phosphor-react-native';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { AvatarStack } from '@/components/ui/AvatarStack';
import { Card } from '@/components/ui/Card';
import { Stars } from '@/components/ui/Stars';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import {
  formatMatchTime,
  formatPrice,
  labelPosition,
  labelSkill,
  pluralize,
} from '@/lib/format';
import { formatVes, usdToVes } from '@/lib/exchange';
import { useBcvRate } from '@/hooks/useExchange';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Match, Sport } from '@/types/domain';

import { MatchTypeBadge } from './MatchTypeBadge';

const SPORTS_WITH_POSITIONS = new Set(['futbol', 'basket']);

const SPORT_EMOJI: Record<Sport, string> = {
  futbol: '⚽',
  basket: '🏀',
  tenis: '🎾',
  padel: '🏓',
  beachTennis: '🏖️',
};

interface Props {
  match: Match;
  onPress?: () => void;
  cardStyle?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  header?: ReactNode;
  footer?: ReactNode;
}

function typeColor(type: Match['type'], c: ColorPalette): string {
  switch (type) {
    case 'chill':       return c.chill;
    case 'seria':       return c.seria;
    case 'competencia': return c.competencia;
  }
}

const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };
const MAX_TILT = 14;

export function MatchCard({ match, onPress, cardStyle, header, footer }: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const bcvRate = useBcvRate();
  const accent = typeColor(match.type, c);
  const tint = `${accent}12`;
  const emoji = SPORT_EMOJI[match.sport];

  // SharedValues for layout — refs can't be mutated inside worklets
  const cardW = useSharedValue(320);
  const cardH = useSharedValue(130);

  // Tilt shared values
  const rotX = useSharedValue(0);
  const rotY = useSharedValue(0);
  const glareX = useSharedValue(0.5);
  const glareY = useSharedValue(0.5);
  const lift = useSharedValue(1);

  const reset = () => {
    'worklet';
    rotX.value = withSpring(0, SPRING);
    rotY.value = withSpring(0, SPRING);
    glareX.value = withSpring(0.5, SPRING);
    glareY.value = withSpring(0.5, SPRING);
    lift.value = withSpring(1, SPRING);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const nx = Math.max(0, Math.min(1, e.x / cardW.value));
      const ny = Math.max(0, Math.min(1, e.y / cardH.value));
      rotY.value = interpolate(nx, [0, 1], [-MAX_TILT, MAX_TILT]);
      rotX.value = interpolate(ny, [0, 1], [MAX_TILT * 0.6, -MAX_TILT * 0.6]);
      glareX.value = nx;
      glareY.value = ny;
      lift.value = 1.022;
    })
    .onEnd(reset)
    .onFinalize(reset);

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateX: `${rotX.value}deg` },
      { rotateY: `${rotY.value}deg` },
      { scale: lift.value },
    ],
  }));

  // Glare highlight: white sheen that sits opposite the touch (light-source illusion)
  const glareStyle = useAnimatedStyle(() => {
    const tiltMag = Math.sqrt(rotX.value ** 2 + rotY.value ** 2);
    const opacity = interpolate(tiltMag, [0, MAX_TILT], [0, 0.22]);
    // Glare moves OPPOSITE to touch (catch light from the other side)
    const tx = (0.5 - glareX.value) * 80;
    const ty = (0.5 - glareY.value) * 60;
    return {
      opacity,
      transform: [{ translateX: tx }, { translateY: ty }],
    };
  });

  // Colored edge glow: accent shadow intensifies with tilt
  const shadowStyle = useAnimatedStyle(() => {
    const tiltMag = Math.sqrt(rotX.value ** 2 + rotY.value ** 2);
    const intensity = interpolate(tiltMag, [0, MAX_TILT], [0.18, 0.45]);
    return { shadowOpacity: intensity };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[tiltStyle, { borderRadius: 16 }]}>
        <Animated.View
          style={[
            shadowStyle,
            {
              borderRadius: 16,
              shadowColor: accent,
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: 16,
              elevation: 6,
            },
          ]}
          onLayout={(e) => {
            cardW.value = e.nativeEvent.layout.width;
            cardH.value = e.nativeEvent.layout.height;
          }}
        >
          {header}
          <Card
            onPress={onPress}
            padded={false}
            style={[s.card, { borderColor: accent, backgroundColor: tint }, cardStyle]}
          >
            {/* Glare overlay */}
            <Animated.View style={[StyleSheet.absoluteFill, s.glareWrap, glareStyle]} pointerEvents="none">
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'transparent']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={s.glare}
              />
            </Animated.View>

            {/* Watermark emoji */}
            <Text style={s.watermark} allowFontScaling={false}>{emoji}</Text>

            <View style={s.body}>
              <View style={s.headRow}>
                <MatchTypeBadge type={match.type} />
                <View style={s.priceCol}>
                  <Text variant="bodySemibold" color="primary">
                    {formatPrice(match.pricePerHour, match.currency)}/h
                  </Text>
                  {match.currency === 'USD' ? (
                    <Text variant="caption" color="textTertiary">
                      {formatVes(usdToVes(match.pricePerHour, bcvRate))}/h
                    </Text>
                  ) : (
                    <Text variant="caption" color="textTertiary">Por hora</Text>
                  )}
                </View>
              </View>

              <Text variant="h3" color="textPrimary">
                Faltan {match.missingCount}{' '}
                {pluralize(match.missingCount, 'jugador', 'jugadores')}
              </Text>

              <View style={s.metaRow}>
                <MapPin size={14} color={c.textSecondary} weight="fill" />
                <Text variant="small" color="textSecondary" style={s.metaText}>
                  {match.location.name}
                  {match.location.distanceKm != null
                    ? ` · ${match.location.distanceKm.toFixed(1)} km`
                    : ''}
                </Text>
              </View>
              <View style={s.metaRow}>
                <Clock size={14} color={c.textSecondary} weight="fill" />
                <Text variant="small" color="textSecondary" style={s.metaText}>
                  {formatMatchTime(match.startsAt)}
                </Text>
              </View>

              {SPORTS_WITH_POSITIONS.has(match.sport) ? (
                <View style={s.metaRow}>
                  <UsersThree size={14} color={c.primary} weight="fill" />
                  <Text variant="small" color="textSecondary" style={s.metaText}>
                    {match.missingPositions.length === 0 ||
                    match.missingPositions.includes('cualquiera')
                      ? 'Cualquier posición'
                      : match.missingPositions.map(labelPosition).join(' · ')}
                  </Text>
                </View>
              ) : null}

              <View style={s.footRow}>
                <View style={s.skillRow}>
                  <Stars level={match.skillLevel} size={13} />
                  <Text variant="caption" color="textSecondary">
                    {labelSkill(match.skillLevel)}
                  </Text>
                </View>
                <AvatarStack players={match.joinedPlayers} max={3} size={28} />
              </View>
            </View>
          </Card>
          {footer}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    card: { flexDirection: 'row', overflow: 'hidden' },
    glareWrap: { zIndex: 10, overflow: 'hidden', borderRadius: 16 },
    glare: { width: '70%', height: '100%', alignSelf: 'center' },
    watermark: {
      position: 'absolute',
      right: -6,
      bottom: -10,
      fontSize: 80,
      lineHeight: 96,
      opacity: 0.1,
      transform: [{ rotate: '12deg' }],
      pointerEvents: 'none',
    },
    body: { flex: 1, padding: spacing.lg, gap: spacing.sm },
    headRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    priceCol: { alignItems: 'flex-end' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    metaText: { flexShrink: 1 },
    footRow: {
      marginTop: spacing.xs,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    skillRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  });
}
