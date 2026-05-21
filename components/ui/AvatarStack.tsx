import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { radius } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
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
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
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

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    more: {
      backgroundColor: c.primarySoft,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
