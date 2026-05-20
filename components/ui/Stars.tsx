import { Star } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import type { SkillLevel } from '@/types/domain';

interface Props {
  level: SkillLevel;
  size?: number;
  filledColor?: string;
  emptyColor?: string;
}

export function Stars({
  level,
  size = 14,
  filledColor = colors.primary,
  emptyColor = colors.border,
}: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= level;
        return (
          <Star
            key={i}
            size={size}
            weight={filled ? 'fill' : 'regular'}
            color={filled ? filledColor : emptyColor}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
});
