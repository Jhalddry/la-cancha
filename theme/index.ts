export { colors, type ColorName } from './colors';
export { spacing, type SpacingKey } from './spacing';
export { radius, type RadiusKey } from './radius';
export { fonts, text, type TextVariant } from './typography';
export { shadows } from './shadows';

import { colors } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { fonts, text } from './typography';
import { shadows } from './shadows';

export const theme = {
  colors,
  spacing,
  radius,
  fonts,
  text,
  shadows,
} as const;

export type Theme = typeof theme;
