import { useMemo } from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { useColors } from '@/hooks/useColors';
import { text, type TextVariant } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

interface Props extends Omit<RNTextProps, 'style'> {
  variant?: TextVariant;
  color?: keyof ColorPalette;
  style?: StyleProp<TextStyle>;
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  style,
  children,
  ...rest
}: Props) {
  const c = useColors();
  const variantStyle = text[variant] as TextStyle;
  return (
    <RNText
      allowFontScaling
      {...rest}
      style={[variantStyle, { color: c[color] }, style]}
    >
      {children}
    </RNText>
  );
}
