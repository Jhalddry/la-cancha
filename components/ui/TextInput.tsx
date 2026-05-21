import { forwardRef, useMemo, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useColors } from '@/hooks/useColors';
import { fonts, radius, spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

import { Text } from './Text';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  variant?: 'default' | 'plain';
}

export const TextInput = forwardRef<RNTextInput, Props>(function TextInput(
  {
    label,
    leading,
    trailing,
    error,
    containerStyle,
    inputStyle,
    variant = 'default',
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? c.alert
    : focused
      ? c.primary
      : c.border;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          variant === 'default' ? styles.field : styles.plain,
          variant === 'default' ? { borderColor } : null,
        ]}
      >
        {leading ? <View style={styles.adornment}>{leading}</View> : null}
        <RNTextInput
          ref={ref}
          placeholderTextColor={c.textTertiary}
          selectionColor={c.primary}
          {...rest}
          style={[styles.input, inputStyle]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {trailing ? <View style={styles.adornment}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text variant="small" color="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    label: { marginBottom: spacing.xs },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      minHeight: 50,
    },
    plain: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 0,
      minHeight: 44,
    },
    input: {
      flex: 1,
      color: c.textPrimary,
      fontFamily: fonts.regular,
      fontSize: 15,
      paddingVertical: spacing.md,
    },
    adornment: { paddingHorizontal: spacing.sm },
    error: { marginTop: spacing.xs },
  });
}
