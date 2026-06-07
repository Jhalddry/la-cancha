import { Star } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface Props {
  /** Accepts floats (e.g. 4.5) — renders half-stars for fractional values. */
  level: number;
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
        const diff = level - (i - 1); // portion of this star that is filled (0–1+)
        const isFull = diff >= 0.75;
        const isHalf = !isFull && diff >= 0.25;

        if (isFull) {
          return <Star key={i} size={size} weight="fill" color={filled} />;
        }
        if (isHalf) {
          return (
            <View key={i} style={{ width: size, height: size }}>
              {/* Empty background star */}
              <Star size={size} weight="regular" color={empty} />
              {/* Filled left-half overlay */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: size / 2,
                  overflow: 'hidden',
                }}
              >
                <Star size={size} weight="fill" color={filled} />
              </View>
            </View>
          );
        }
        return <Star key={i} size={size} weight="regular" color={empty} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
});
