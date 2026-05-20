import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { colors, text, type TextVariant } from '@/theme';

interface Props extends Omit<RNTextProps, 'style'> {
  variant?: TextVariant;
  color?: keyof typeof colors;
  style?: StyleProp<TextStyle>;
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  style,
  children,
  ...rest
}: Props) {
  const variantStyle = text[variant] as TextStyle;
  return (
    <RNText
      allowFontScaling
      {...rest}
      style={[variantStyle, { color: colors[color] }, style]}
    >
      {children}
    </RNText>
  );
}
