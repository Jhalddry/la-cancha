import { Star } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import type { SkillLevel } from '@/types/domain';

interface Props {
  level: SkillLevel;
  size?: number;
  filledColor?: string;
  emptyColor?: string;
}

export function Stars({ level, size = 14, filledColor, emptyColor }: Props) {
  const c = useColors();
  const filled = filledColor ?? c.primary;
  const empty = emptyColor ?? c.border;
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const isFilled = i <= level;
        return (
          <Star
            key={i}
            size={size}
            weight={isFilled ? 'fill' : 'regular'}
            color={isFilled ? filled : empty}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
});
