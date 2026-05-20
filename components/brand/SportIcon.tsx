import {
  Basketball,
  SoccerBall,
  TennisBall,
  type IconProps,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';

import type { Sport } from '@/types/domain';

const ICONS: Record<Sport, ComponentType<IconProps>> = {
  futbol: SoccerBall,
  tenis: TennisBall,
  padel: TennisBall,
  beachTennis: TennisBall,
  basket: Basketball,
};

interface Props {
  sport: Sport;
  size?: number;
  color?: string;
  weight?: IconProps['weight'];
}

export function SportIcon({ sport, size = 22, color, weight = 'fill' }: Props) {
  const Icon = ICONS[sport];
  return <Icon size={size} color={color} weight={weight} />;
}
