import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme';
import type { MatchType } from '@/types/domain';

import { matchTypeMeta } from './matchTypeMeta';

interface Props {
  type: MatchType;
  size?: 'sm' | 'md';
}

export function MatchTypeBadge({ type, size = 'sm' }: Props) {
  const m = matchTypeMeta[type];
  const pad =
    size === 'sm'
      ? { paddingHorizontal: spacing.sm, paddingVertical: 4 }
      : { paddingHorizontal: spacing.md, paddingVertical: spacing.xs };
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: m.softBg, borderColor: m.color },
        pad,
      ]}
    >
      <Text variant="caption" style={{ color: m.color }}>
        {m.emoji}  {m.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});

export { matchTypeMeta };
