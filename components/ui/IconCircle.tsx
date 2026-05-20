import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

interface Props {
  size?: number;
  bg?: string;
  border?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function IconCircle({
  size = 40,
  bg = colors.surface,
  border = colors.border,
  children,
  style,
}: Props) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor: bg,
          borderColor: border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
