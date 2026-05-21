import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { MatchType } from '@/types/domain';

import { matchTypeMeta } from './matchTypeMeta';

interface Props {
  type: MatchType;
  onPress?: () => void;
}

function typeColors(type: MatchType, c: ColorPalette) {
  switch (type) {
    case 'chill':       return { color: c.chill,       softBg: c.chillSoft };
    case 'seria':       return { color: c.seria,       softBg: c.seriaSoft };
    case 'competencia': return { color: c.competencia, softBg: c.competenciaSoft };
  }
}

export function MatchTypePromoCard({ type, onPress }: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const m = matchTypeMeta[type];
  const { color, softBg } = typeColors(type, c);
  return (
    <PressableScale
      onPress={onPress}
      style={[
        s.card,
        { borderColor: color, backgroundColor: softBg },
      ]}
      scaleTo={0.97}
    >
      <Text variant="h1" style={{ color, fontSize: 36, lineHeight: 40 }}>
        {m.emoji}
      </Text>
      <View style={s.body}>
        <Text variant="h3" style={{ color }}>
          {m.label}
        </Text>
        <Text variant="small" color="textSecondary">
          {m.description}
        </Text>
      </View>
    </PressableScale>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 168,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      backgroundColor: c.surface,
      justifyContent: 'space-between',
    },
    body: { gap: spacing.xs },
  });
}
