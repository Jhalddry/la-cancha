import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme';
import type { MatchType } from '@/types/domain';

import { matchTypeMeta } from './matchTypeMeta';

interface Props {
  type: MatchType;
  onPress?: () => void;
}

export function MatchTypePromoCard({ type, onPress }: Props) {
  const m = matchTypeMeta[type];
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.card,
        { borderColor: m.color, backgroundColor: m.softBg },
      ]}
      scaleTo={0.97}
    >
      <Text variant="h1" style={{ color: m.color, fontSize: 36, lineHeight: 40 }}>
        {m.emoji}
      </Text>
      <View style={styles.body}>
        <Text variant="h3" style={{ color: m.color }}>
          {m.label}
        </Text>
        <Text variant="small" color="textSecondary">
          {m.description}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 168,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
  },
  body: { gap: spacing.xs },
});
