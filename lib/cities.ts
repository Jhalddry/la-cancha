export const VENEZUELAN_CITIES = [
  'Barquisimeto',
  'Caracas',
  'Ciudad Guayana',
  'Cumaná',
  'Maracaibo',
  'Maracay',
  'Margarita',
  'Maturín',
  'Puerto La Cruz',
  'Valencia',
] as const;

export type VenezuelanCity = (typeof VENEZUELAN_CITIES)[number];

/** Best-effort match of a raw geocoded city name against our list. */
export function matchCity(raw: string): string | null {
  const lower = raw.toLowerCase();
  const found = VENEZUELAN_CITIES.find((c) => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase()));
  return found ?? null;
}
