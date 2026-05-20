import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

interface Props {
  vertical?: boolean;
  inset?: boolean;
}

export function Divider({ vertical, inset }: Props) {
  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        inset ? styles.inset : null,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  inset: {
    marginHorizontal: spacing.lg,
  },
});
