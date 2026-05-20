import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Text } from '@/components/ui/Text';

import { Crosshair } from './Crosshair';

interface Props {
  size?: number;
  showTagline?: boolean;
  horizontal?: boolean;
}

export function Logo({ size = 56, showTagline, horizontal }: Props) {
  if (horizontal) {
    return (
      <View style={styles.horizontal}>
        <Crosshair size={size} />
        <View>
          <View style={styles.wordmark}>
            <Text variant="h2" color="textPrimary" style={styles.la}>
              LA{' '}
            </Text>
            <Text variant="h2" color="primary" style={styles.la}>
              CANCHA
            </Text>
          </View>
          {showTagline ? (
            <Text variant="caption" color="textSecondary">
              Arma tu partida en segundos
            </Text>
          ) : null}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.stacked}>
      <Crosshair size={size} />
      <View style={styles.wordmark}>
        <Text variant="display" color="textPrimary" style={styles.la}>
          LA{' '}
        </Text>
        <Text variant="display" color="primary" style={styles.la}>
          CANCHA
        </Text>
      </View>
      {showTagline ? (
        <Text variant="caption" color="textSecondary">
          Arma tu partida en segundos
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stacked: { alignItems: 'center', gap: spacing.md },
  horizontal: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  la: { color: colors.textPrimary },
});
