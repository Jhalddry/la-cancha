import type {
  Currency,
  MatchType,
  Modality,
  PaymentMethod,
  Position,
  SkillLevel,
  Sport,
} from '@/types/domain';

const SPORT_LABEL: Record<Sport, string> = {
  futbol: 'Fútbol',
  tenis: 'Tenis',
  padel: 'Pádel',
  beachTennis: 'Beach Tennis',
  basket: 'Basket',
};

const MODALITY_LABEL: Record<Modality, string> = {
  futbol5: 'Fútbol 5',
  futbol7: 'Fútbol 7',
  futbol11: 'Fútbol 11',
  basket3v3: 'Basket 3v3',
  basket5v5: 'Basket 5v5',
  tenisSingles: 'Singles',
  tenisDobles: 'Dobles',
  padelDobles: 'Dobles',
  beachDobles: 'Dobles',
  beachSimples: 'Singles',
};

const MODALITY_SHORT: Record<Modality, string> = {
  futbol5: '5 vs 5',
  futbol7: '7 vs 7',
  futbol11: '11 vs 11',
  basket3v3: '3 vs 3',
  basket5v5: '5 vs 5',
  tenisSingles: 'Singles',
  tenisDobles: 'Dobles',
  padelDobles: 'Dobles',
  beachDobles: 'Dobles',
  beachSimples: 'Singles',
};

const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  chill: 'Chill',
  seria: 'Seria',
  competencia: 'Torneo',
};

const SKILL_LABEL: Record<SkillLevel, string> = {
  1: 'Principiante',
  2: 'Básico',
  3: 'Intermedio',
  4: 'Avanzado',
  5: 'Competitivo',
};

const POSITION_LABEL: Record<Position, string> = {
  cualquiera: 'Cualquiera',
  portero: 'Portero',
  defensa: 'Defensa',
  lateral: 'Lateral',
  mediocampo: 'Mediocampo',
  extremo: 'Extremo',
  delantero: 'Delantero',
  base: 'Base',
  escolta: 'Escolta',
  alero: 'Alero',
  aleroPivot: 'Ala-Pívot',
  pivot: 'Pívot',
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pagoMovil: 'Pago Móvil',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  zelle: 'Zelle',
  usdt: 'USDT (Binance)',
};

export const labelSport = (s: Sport) => SPORT_LABEL[s];
export const labelModality = (m: Modality) => MODALITY_LABEL[m];
export const labelModalityShort = (m: Modality) => MODALITY_SHORT[m];
export const labelMatchType = (t: MatchType) => MATCH_TYPE_LABEL[t];
export const labelSkill = (l: SkillLevel) => SKILL_LABEL[l];
export const labelPosition = (p: Position) => POSITION_LABEL[p];
export const labelPayment = (p: PaymentMethod) => PAYMENT_LABEL[p];

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === 'USD') return `$${amount}`;
  return `Bs. ${amount.toLocaleString('es-VE')}`;
}

const DAY = 86_400_000;
const PAD = (n: number) => n.toString().padStart(2, '0');

export function formatMatchTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now.getTime() + DAY);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const hours = d.getHours();
  const mins = d.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const time = `${h12}:${PAD(mins)} ${period}`;
  if (sameDay) return `Hoy ${time}`;
  if (isTomorrow) return `Mañana ${time}`;
  const months = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${time}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
