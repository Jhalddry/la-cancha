import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { PressableScale } from '@/components/ui/PressableScale';
import { useColors } from '@/hooks/useColors';
import { radius } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type {
  BasketPosition,
  FootballPosition,
  Modality,
  Position,
  Sport,
} from '@/types/domain';

import { BASKET_LAYOUTS, FOOTBALL_LAYOUTS } from './pitchLayouts';

const COURT_ASPECT = 1.1;

interface Props {
  sport?: Sport;
  modality?: Modality;
  selectedPositions?: Position[];
  onSetPositions?: (positions: Position[]) => void;
}

export function PositionPitch({
  sport = 'futbol',
  modality,
  selectedPositions = [],
  onSetPositions,
}: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  if (sport === 'basket') {
    return (
      <BasketCourt
        modality={modality}
        selectedPositions={selectedPositions as BasketPosition[]}
        onSetPositions={onSetPositions}
        c={c}
        s={s}
      />
    );
  }
  return (
    <FootballField
      modality={modality}
      selectedPositions={selectedPositions as FootballPosition[]}
      onSetPositions={onSetPositions}
      c={c}
      s={s}
    />
  );
}

// ---------------------------------------------------------------------------
// Football — set-based: all spots of same position toggle together
// ---------------------------------------------------------------------------

function FootballField({
  modality,
  selectedPositions,
  onSetPositions,
  c,
  s,
}: {
  modality?: Modality;
  selectedPositions: FootballPosition[];
  onSetPositions?: (positions: Position[]) => void;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  const spots = FOOTBALL_LAYOUTS[modality ?? 'futbol7'] ?? FOOTBALL_LAYOUTS.futbol7!;

  return (
    <View style={s.wrap}>
      <View style={s.field}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Rect x={1} y={1} width={98} height={98} rx={2} ry={2} fill="none" stroke={c.border} strokeWidth={0.6} />
          <Line x1={1} y1={50} x2={99} y2={50} stroke={c.border} strokeWidth={0.5} />
          <Circle cx={50} cy={50} r={10} fill="none" stroke={c.border} strokeWidth={0.5} />
          <Rect x={30} y={1} width={40} height={14} fill="none" stroke={c.border} strokeWidth={0.5} />
          <Rect x={30} y={85} width={40} height={14} fill="none" stroke={c.border} strokeWidth={0.5} />
        </Svg>
        {spots.map((spot, i) => {
          const isSelected = (selectedPositions as string[]).includes(spot.position);
          return (
            <Spot
              key={`${spot.position}-${i}`}
              x={spot.x}
              y={spot.y}
              isSelected={isSelected}
              c={c}
              s={s}
              onPress={
                onSetPositions
                  ? () => {
                      const pos = selectedPositions as Position[];
                      if (isSelected) {
                        onSetPositions(pos.filter((p) => p !== (spot.position as Position)));
                      } else {
                        onSetPositions([...pos, spot.position as Position]);
                      }
                    }
                  : undefined
              }
            />
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Basket — same set-based approach (all positions unique so no ambiguity)
// ---------------------------------------------------------------------------

function BasketCourt({
  modality,
  selectedPositions,
  onSetPositions,
  c,
  s,
}: {
  modality?: Modality;
  selectedPositions: BasketPosition[];
  onSetPositions?: (positions: Position[]) => void;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  const spots = BASKET_LAYOUTS[modality ?? 'basket5v5'] ?? BASKET_LAYOUTS.basket5v5!;

  return (
    <View style={s.wrap}>
      <View style={s.court}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Rect x={1} y={1} width={98} height={98} rx={2} ry={2} fill="none" stroke={c.border} strokeWidth={0.6} />
          <Line x1={1} y1={50} x2={99} y2={50} stroke={c.border} strokeWidth={0.5} />
          <Circle cx={50} cy={50} r={8} fill="none" stroke={c.border} strokeWidth={0.5} />
          <Rect x={36} y={1} width={28} height={18} fill="none" stroke={c.border} strokeWidth={0.5} />
          <Circle cx={50} cy={19} r={8} fill="none" stroke={c.border} strokeWidth={0.5} />
          <Rect x={36} y={81} width={28} height={18} fill="none" stroke={c.border} strokeWidth={0.5} />
          <Circle cx={50} cy={81} r={8} fill="none" stroke={c.border} strokeWidth={0.5} />
          <Circle cx={50} cy={5} r={22} fill="none" stroke={c.border} strokeWidth={0.5} />
          <Circle cx={50} cy={95} r={22} fill="none" stroke={c.border} strokeWidth={0.5} />
        </Svg>
        {spots.map((spot, i) => {
          const isSelected = (selectedPositions as string[]).includes(spot.position);
          return (
            <Spot
              key={`${spot.position}-${i}`}
              x={spot.x}
              y={spot.y}
              isSelected={isSelected}
              c={c}
              s={s}
              onPress={
                onSetPositions
                  ? () => {
                      const pos = selectedPositions as Position[];
                      if (isSelected) {
                        onSetPositions(pos.filter((p) => p !== (spot.position as Position)));
                      } else {
                        onSetPositions([...pos, spot.position as Position]);
                      }
                    }
                  : undefined
              }
            />
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared spot
// ---------------------------------------------------------------------------

function Spot({
  x,
  y,
  isSelected,
  onPress,
  c,
  s,
}: {
  x: number;
  y: number;
  isSelected: boolean;
  onPress?: () => void;
  c: ColorPalette;
  s: ReturnType<typeof makeStyles>;
}) {
  const dotStyle = [
    s.spot,
    {
      left: `${x}%` as const,
      top: `${y}%` as const,
      backgroundColor: isSelected ? c.primary : `${c.primary}22`,
      borderColor: isSelected ? c.primary : c.textSecondary,
    },
  ];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.8} style={dotStyle}>
        <View />
      </PressableScale>
    );
  }
  return <View style={dotStyle} />;
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      width: '100%',
      alignItems: 'center',
    },
    field: {
      width: '100%',
      aspectRatio: COURT_ASPECT,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    court: {
      width: '100%',
      aspectRatio: COURT_ASPECT,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    spot: {
      position: 'absolute',
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      marginLeft: -11,
      marginTop: -11,
    },
  });
}
