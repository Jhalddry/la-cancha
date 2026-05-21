import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';
import type { MatchType } from '@/types/domain';

import { matchTypeMeta } from './matchTypeMeta';

interface Props {
  type: MatchType;
  size?: 'sm' | 'md';
}

function typeColors(type: MatchType, c: ColorPalette) {
  switch (type) {
    case 'chill':       return { color: c.chill,       softBg: c.chillSoft };
    case 'seria':       return { color: c.seria,       softBg: c.seriaSoft };
    case 'competencia': return { color: c.competencia, softBg: c.competenciaSoft };
  }
}

export function MatchTypeBadge({ type, size = 'sm' }: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(), []);
  const m = matchTypeMeta[type];
  const { color, softBg } = typeColors(type, c);
  const pad =
    size === 'sm'
      ? { paddingHorizontal: spacing.sm, paddingVertical: 4 }
      : { paddingHorizontal: spacing.md, paddingVertical: spacing.xs };
  return (
    <View
      style={[
        s.base,
        { backgroundColor: softBg },
        pad,
      ]}
    >
      <Text variant="caption" style={{ color }}>
        {m.emoji}  {m.label}
      </Text>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    base: {
      borderRadius: radius.sm,
      alignSelf: 'flex-start',
    },
  });
}

export { matchTypeMeta };
