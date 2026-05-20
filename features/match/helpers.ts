import type {
  BasketPosition,
  FootballPosition,
  Modality,
  Sport,
} from '@/types/domain';

export const sportModalities: Record<Sport, Modality[]> = {
  futbol: ['futbol5', 'futbol7', 'futbol11'],
  basket: ['basket3v3', 'basket5v5'],
  tenis: ['tenisSingles', 'tenisDobles'],
  padel: ['padelDobles'],
  beachTennis: ['beachDobles', 'beachSimples'],
};

// Modalities where the wizard skips the modality step (single option / no choice).
export const SINGLE_MODALITY_SPORTS: Sport[] = ['padel'];

// Sports that don't require position selection.
export const NO_POSITION_SPORTS: Sport[] = ['tenis', 'padel', 'beachTennis'];

// Football positions vary by modality.
export const footballPositionsByModality: Record<
  'futbol5' | 'futbol7' | 'futbol11',
  FootballPosition[]
> = {
  futbol5: ['portero', 'defensa', 'mediocampo', 'delantero'],
  futbol7: ['portero', 'defensa', 'mediocampo', 'delantero'],
  futbol11: [
    'portero',
    'defensa',
    'lateral',
    'mediocampo',
    'extremo',
    'delantero',
  ],
};

// Basket positions vary by modality.
export const basketPositionsByModality: Record<
  'basket3v3' | 'basket5v5',
  BasketPosition[]
> = {
  basket3v3: ['base', 'alero', 'pivot'],
  basket5v5: ['base', 'escolta', 'alero', 'aleroPivot', 'pivot'],
};

// Convenience: get positions for any sport+modality combo.
export function positionsForModality(
  sport: Sport | null,
  modality: Modality | null,
): (FootballPosition | BasketPosition)[] {
  if (!sport || !modality) return [];
  if (sport === 'futbol' && modality in footballPositionsByModality) {
    return footballPositionsByModality[
      modality as 'futbol5' | 'futbol7' | 'futbol11'
    ];
  }
  if (sport === 'basket' && modality in basketPositionsByModality) {
    return basketPositionsByModality[modality as 'basket3v3' | 'basket5v5'];
  }
  return [];
}
