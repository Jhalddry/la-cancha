export const radius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
