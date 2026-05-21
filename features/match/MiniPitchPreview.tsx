import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { radius } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { Modality, Sport } from '@/types/domain';

import { BASKET_LAYOUTS, FOOTBALL_LAYOUTS } from './pitchLayouts';

interface Props {
  sport: Sport;
  modality: Modality;
  active?: boolean;
}

const FIELD_W = 66;  // landscape for football
const FIELD_H = 58;
const COURT_W = 44;  // portrait for basket / racket sports
const COURT_H = 66;

export function MiniPitchPreview({ sport, modality, active }: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  if (sport === 'futbol') return <MiniFootballField modality={modality} active={active} c={c} s={s} />;
  if (sport === 'basket') return <MiniBasketCourt modality={modality} active={active} c={c} s={s} />;
  if (sport === 'tenis') return <MiniTennisCourt modality={modality} active={active} c={c} s={s} />;
  if (sport === 'padel') return <MiniPadelCourt active={active} c={c} s={s} />;
  if (sport === 'beachTennis') return <MiniBeachTennisCourt modality={modality} active={active} c={c} s={s} />;
  return null;
}

function MiniFootballField({ modality, active, c, s }: { modality: Modality; active?: boolean; c: ColorPalette; s: ReturnType<typeof makeStyles> }) {
  const spots = FOOTBALL_LAYOUTS[modality] ?? [];
  return (
    <View style={[s.field, active ? s.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={c.border} strokeWidth={1} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={c.border} strokeWidth={0.8} />
        <Circle cx={50} cy={50} r={9} fill="none" stroke={c.border} strokeWidth={0.8} />
        {spots.map((spot, i) => (
          <Circle key={`${spot.position}-${i}`} cx={spot.x} cy={spot.y} r={4} fill={c.primary} />
        ))}
      </Svg>
    </View>
  );
}

function MiniBasketCourt({ modality, active, c, s }: { modality: Modality; active?: boolean; c: ColorPalette; s: ReturnType<typeof makeStyles> }) {
  const spots = BASKET_LAYOUTS[modality] ?? [];
  return (
    <View style={[s.court, active ? s.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={c.border} strokeWidth={1} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={c.border} strokeWidth={0.8} />
        <Circle cx={50} cy={50} r={7} fill="none" stroke={c.border} strokeWidth={0.8} />
        <Rect x={36} y={2} width={28} height={16} fill="none" stroke={c.border} strokeWidth={0.8} />
        <Rect x={36} y={82} width={28} height={16} fill="none" stroke={c.border} strokeWidth={0.8} />
        {spots.map((spot, i) => (
          <Circle key={`${spot.position}-${i}`} cx={spot.x} cy={spot.y} r={4} fill={c.primary} />
        ))}
      </Svg>
    </View>
  );
}

function MiniTennisCourt({ modality, active, c, s }: { modality: Modality; active?: boolean; c: ColorPalette; s: ReturnType<typeof makeStyles> }) {
  const isDoubles = modality === 'tenisDobles';
  return (
    <View style={[s.field, active ? s.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={c.border} strokeWidth={1} />
        <Line x1={16} y1={2} x2={16} y2={98} stroke={c.border} strokeWidth={0.8} />
        <Line x1={84} y1={2} x2={84} y2={98} stroke={c.border} strokeWidth={0.8} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={c.border} strokeWidth={1.5} />
        <Line x1={16} y1={27} x2={84} y2={27} stroke={c.border} strokeWidth={0.8} />
        <Line x1={16} y1={73} x2={84} y2={73} stroke={c.border} strokeWidth={0.8} />
        <Line x1={50} y1={27} x2={50} y2={73} stroke={c.border} strokeWidth={0.8} />
        {isDoubles ? (
          <>
            <Circle cx={28} cy={80} r={4} fill={c.primary} />
            <Circle cx={72} cy={80} r={4} fill={c.primary} />
            <Circle cx={28} cy={20} r={4} fill={c.primary} />
            <Circle cx={72} cy={20} r={4} fill={c.primary} />
          </>
        ) : (
          <>
            <Circle cx={50} cy={80} r={4} fill={c.primary} />
            <Circle cx={50} cy={20} r={4} fill={c.primary} />
          </>
        )}
      </Svg>
    </View>
  );
}

function MiniPadelCourt({ active, c, s }: { active?: boolean; c: ColorPalette; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[s.field, active ? s.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={c.border} strokeWidth={1} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={c.border} strokeWidth={1.5} />
        <Line x1={2} y1={32} x2={98} y2={32} stroke={c.border} strokeWidth={0.8} />
        <Line x1={2} y1={68} x2={98} y2={68} stroke={c.border} strokeWidth={0.8} />
        <Line x1={50} y1={32} x2={50} y2={68} stroke={c.border} strokeWidth={0.8} />
        <Circle cx={30} cy={82} r={4} fill={c.primary} />
        <Circle cx={70} cy={82} r={4} fill={c.primary} />
        <Circle cx={30} cy={18} r={4} fill={c.primary} />
        <Circle cx={70} cy={18} r={4} fill={c.primary} />
      </Svg>
    </View>
  );
}

function MiniBeachTennisCourt({ modality, active, c, s }: { modality: Modality; active?: boolean; c: ColorPalette; s: ReturnType<typeof makeStyles> }) {
  const isDoubles = modality !== 'beachSimples';
  return (
    <View style={[s.field, active ? s.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={c.border} strokeWidth={1} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={c.border} strokeWidth={1.5} />
        <Line x1={2} y1={28} x2={98} y2={28} stroke={c.border} strokeWidth={0.8} />
        <Line x1={2} y1={72} x2={98} y2={72} stroke={c.border} strokeWidth={0.8} />
        <Line x1={50} y1={28} x2={50} y2={72} stroke={c.border} strokeWidth={0.8} />
        {isDoubles ? (
          <>
            <Circle cx={30} cy={80} r={4} fill={c.primary} />
            <Circle cx={70} cy={80} r={4} fill={c.primary} />
            <Circle cx={30} cy={20} r={4} fill={c.primary} />
            <Circle cx={70} cy={20} r={4} fill={c.primary} />
          </>
        ) : (
          <>
            <Circle cx={50} cy={80} r={4} fill={c.primary} />
            <Circle cx={50} cy={20} r={4} fill={c.primary} />
          </>
        )}
      </Svg>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    field: {
      width: FIELD_W,
      height: FIELD_H,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    court: {
      width: COURT_W,
      height: COURT_H,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    fieldActive: {
      borderColor: c.primary,
    },
  });
}
