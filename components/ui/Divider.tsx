import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

interface Props {
  vertical?: boolean;
  inset?: boolean;
}

export function Divider({ vertical, inset }: Props) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        inset ? styles.inset : null,
      ]}
    />
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    horizontal: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      alignSelf: 'stretch',
    },
    vertical: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      alignSelf: 'stretch',
    },
    inset: {
      marginHorizontal: spacing.lg,
    },
  });
}
