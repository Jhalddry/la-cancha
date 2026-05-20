import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import type { Player } from '@/types/domain';

import { Avatar } from './Avatar';
import { Text } from './Text';

interface Props {
  players: Player[];
  max?: number;
  size?: number;
  extraCount?: number;
}

export function AvatarStack({ players, max = 3, size = 32, extraCount }: Props) {
  const shown = players.slice(0, max);
  const remaining = extraCount ?? Math.max(0, players.length - shown.length);
  return (
    <View style={styles.row}>
      {shown.map((p, i) => (
        <View key={p.id} style={[i > 0 && { marginLeft: -size / 3 }]}>
          <Avatar name={p.name} uri={p.avatarUrl} size={size} bordered />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            styles.more,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -size / 3,
            },
          ]}
        >
          <Text variant="caption" color="primary">
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  more: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
