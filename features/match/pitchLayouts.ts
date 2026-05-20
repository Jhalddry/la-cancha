import type {
  BasketPosition,
  FootballPosition,
  Modality,
} from '@/types/domain';

export interface FootballSpot {
  position: FootballPosition;
  x: number;
  y: number;
}

export interface BasketSpot {
  position: BasketPosition;
  x: number;
  y: number;
}

export const FOOTBALL_LAYOUTS: Partial<Record<Modality, FootballSpot[]>> = {
  futbol5: [
    { position: 'portero', x: 50, y: 90 },
    { position: 'defensa', x: 30, y: 70 },
    { position: 'defensa', x: 70, y: 70 },
    { position: 'mediocampo', x: 50, y: 45 },
    { position: 'delantero', x: 50, y: 20 },
  ],
  futbol7: [
    { position: 'portero', x: 50, y: 92 },
    { position: 'defensa', x: 25, y: 72 },
    { position: 'defensa', x: 75, y: 72 },
    { position: 'mediocampo', x: 30, y: 50 },
    { position: 'mediocampo', x: 70, y: 50 },
    { position: 'delantero', x: 35, y: 22 },
    { position: 'delantero', x: 65, y: 22 },
  ],
  futbol11: [
    { position: 'portero', x: 50, y: 94 },
    { position: 'lateral', x: 12, y: 76 },
    { position: 'defensa', x: 36, y: 80 },
    { position: 'defensa', x: 64, y: 80 },
    { position: 'lateral', x: 88, y: 76 },
    { position: 'mediocampo', x: 25, y: 54 },
    { position: 'mediocampo', x: 50, y: 50 },
    { position: 'mediocampo', x: 75, y: 54 },
    { position: 'extremo', x: 15, y: 26 },
    { position: 'delantero', x: 50, y: 18 },
    { position: 'extremo', x: 85, y: 26 },
  ],
};

export const BASKET_LAYOUTS: Partial<Record<Modality, BasketSpot[]>> = {
  basket3v3: [
    { position: 'base', x: 50, y: 75 },
    { position: 'alero', x: 22, y: 50 },
    { position: 'pivot', x: 78, y: 50 },
  ],
  basket5v5: [
    { position: 'base', x: 50, y: 82 },
    { position: 'escolta', x: 25, y: 65 },
    { position: 'alero', x: 75, y: 65 },
    { position: 'aleroPivot', x: 30, y: 35 },
    { position: 'pivot', x: 65, y: 25 },
  ],
};
