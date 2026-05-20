import { colors } from '@/theme';
import type { MatchType } from '@/types/domain';

export interface MatchTypeMeta {
  label: string;
  emoji: string;
  color: string;
  softBg: string;
  description: string;
}

export const matchTypeMeta: Record<MatchType, MatchTypeMeta> = {
  chill: {
    label: 'Chill',
    emoji: '😎',
    color: colors.chill,
    softBg: colors.chillSoft,
    description: 'Partida relajada entre panas, sin reglas estrictas ni código de vestimenta.',
  },
  seria: {
    label: 'Seria',
    emoji: '👕',
    color: colors.seria,
    softBg: colors.seriaSoft,
    description: 'Puede incluir código de vestimenta y árbitro. Más estructurada.',
  },
  competencia: {
    label: 'Torneo',
    emoji: '🏆',
    color: colors.competencia,
    softBg: colors.competenciaSoft,
    description:
      'Reglas completas, equipación obligatoria, árbitros y requisitos extras.',
  },
};
