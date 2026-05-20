import Svg, { Circle, Line } from 'react-native-svg';

import { colors } from '@/theme';

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Crosshair({ size = 96, color = colors.primary, strokeWidth = 8 }: Props) {
  const cx = 50;
  const cy = 50;
  const r = 38;
  const armOuter = 50;
  const armInner = 30;
  const armEdgeStart = 4;
  const armEdgeEnd = armInner - 4;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="44 16"
        strokeDashoffset={30}
      />
      <Line
        x1={armEdgeStart}
        y1={cy}
        x2={armEdgeEnd}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1={armOuter + 20}
        y1={cy}
        x2={armOuter + 46}
        y2={cy}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1={cx}
        y1={armEdgeStart}
        x2={cx}
        y2={armEdgeEnd}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1={cx}
        y1={armOuter + 20}
        x2={cx}
        y2={armOuter + 46}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle
        cx={cx}
        cy={cy}
        r={7}
        stroke={color}
        strokeWidth={strokeWidth - 2}
        fill="none"
      />
    </Svg>
  );
}
