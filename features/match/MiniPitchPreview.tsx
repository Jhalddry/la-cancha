import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { colors, radius } from '@/theme';
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
  if (sport === 'futbol') return <MiniFootballField modality={modality} active={active} />;
  if (sport === 'basket') return <MiniBasketCourt modality={modality} active={active} />;
  if (sport === 'tenis') return <MiniTennisCourt modality={modality} active={active} />;
  if (sport === 'padel') return <MiniPadelCourt active={active} />;
  if (sport === 'beachTennis') return <MiniBeachTennisCourt modality={modality} active={active} />;
  return null;
}

function MiniFootballField({ modality, active }: { modality: Modality; active?: boolean }) {
  const spots = FOOTBALL_LAYOUTS[modality] ?? [];
  return (
    <View style={[styles.field, active ? styles.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={colors.border} strokeWidth={1} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={colors.border} strokeWidth={0.8} />
        <Circle cx={50} cy={50} r={9} fill="none" stroke={colors.border} strokeWidth={0.8} />
        {spots.map((spot, i) => (
          <Circle key={`${spot.position}-${i}`} cx={spot.x} cy={spot.y} r={4} fill={colors.primary} />
        ))}
      </Svg>
    </View>
  );
}

function MiniBasketCourt({ modality, active }: { modality: Modality; active?: boolean }) {
  const spots = BASKET_LAYOUTS[modality] ?? [];
  return (
    <View style={[styles.court, active ? styles.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={colors.border} strokeWidth={1} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={colors.border} strokeWidth={0.8} />
        <Circle cx={50} cy={50} r={7} fill="none" stroke={colors.border} strokeWidth={0.8} />
        <Rect x={36} y={2} width={28} height={16} fill="none" stroke={colors.border} strokeWidth={0.8} />
        <Rect x={36} y={82} width={28} height={16} fill="none" stroke={colors.border} strokeWidth={0.8} />
        {spots.map((spot, i) => (
          <Circle key={`${spot.position}-${i}`} cx={spot.x} cy={spot.y} r={4} fill={colors.primary} />
        ))}
      </Svg>
    </View>
  );
}

function MiniTennisCourt({ modality, active }: { modality: Modality; active?: boolean }) {
  const isDoubles = modality === 'tenisDobles';
  return (
    <View style={[styles.field, active ? styles.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={colors.border} strokeWidth={1} />
        <Line x1={16} y1={2} x2={16} y2={98} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={84} y1={2} x2={84} y2={98} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={colors.border} strokeWidth={1.5} />
        <Line x1={16} y1={27} x2={84} y2={27} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={16} y1={73} x2={84} y2={73} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={50} y1={27} x2={50} y2={73} stroke={colors.border} strokeWidth={0.8} />
        {isDoubles ? (
          <>
            <Circle cx={28} cy={80} r={4} fill={colors.primary} />
            <Circle cx={72} cy={80} r={4} fill={colors.primary} />
            <Circle cx={28} cy={20} r={4} fill={colors.primary} />
            <Circle cx={72} cy={20} r={4} fill={colors.primary} />
          </>
        ) : (
          <>
            <Circle cx={50} cy={80} r={4} fill={colors.primary} />
            <Circle cx={50} cy={20} r={4} fill={colors.primary} />
          </>
        )}
      </Svg>
    </View>
  );
}

function MiniPadelCourt({ active }: { active?: boolean }) {
  return (
    <View style={[styles.field, active ? styles.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={colors.border} strokeWidth={1} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={colors.border} strokeWidth={1.5} />
        <Line x1={2} y1={32} x2={98} y2={32} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={2} y1={68} x2={98} y2={68} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={50} y1={32} x2={50} y2={68} stroke={colors.border} strokeWidth={0.8} />
        <Circle cx={30} cy={82} r={4} fill={colors.primary} />
        <Circle cx={70} cy={82} r={4} fill={colors.primary} />
        <Circle cx={30} cy={18} r={4} fill={colors.primary} />
        <Circle cx={70} cy={18} r={4} fill={colors.primary} />
      </Svg>
    </View>
  );
}

function MiniBeachTennisCourt({ modality, active }: { modality: Modality; active?: boolean }) {
  const isDoubles = modality !== 'beachSimples';
  return (
    <View style={[styles.field, active ? styles.fieldActive : null]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect x={2} y={2} width={96} height={96} rx={3} ry={3} fill="none" stroke={colors.border} strokeWidth={1} />
        <Line x1={2} y1={50} x2={98} y2={50} stroke={colors.border} strokeWidth={1.5} />
        <Line x1={2} y1={28} x2={98} y2={28} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={2} y1={72} x2={98} y2={72} stroke={colors.border} strokeWidth={0.8} />
        <Line x1={50} y1={28} x2={50} y2={72} stroke={colors.border} strokeWidth={0.8} />
        {isDoubles ? (
          <>
            <Circle cx={30} cy={80} r={4} fill={colors.primary} />
            <Circle cx={70} cy={80} r={4} fill={colors.primary} />
            <Circle cx={30} cy={20} r={4} fill={colors.primary} />
            <Circle cx={70} cy={20} r={4} fill={colors.primary} />
          </>
        ) : (
          <>
            <Circle cx={50} cy={80} r={4} fill={colors.primary} />
            <Circle cx={50} cy={20} r={4} fill={colors.primary} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    width: FIELD_W,
    height: FIELD_H,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  court: {
    width: COURT_W,
    height: COURT_H,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fieldActive: {
    borderColor: colors.primary,
  },
});
