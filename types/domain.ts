export type Sport = 'futbol' | 'tenis' | 'padel' | 'beachTennis' | 'basket';

export type FootballModality = 'futbol5' | 'futbol7' | 'futbol11';
export type BasketModality = 'basket3v3' | 'basket5v5';
export type TennisModality = 'tenisSingles' | 'tenisDobles';
export type PadelModality = 'padelDobles';
export type BeachTennisModality = 'beachDobles' | 'beachSimples';
export type Modality =
  | FootballModality
  | BasketModality
  | TennisModality
  | PadelModality
  | BeachTennisModality;

export type MatchType = 'chill' | 'seria' | 'competencia';

export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export type FootballPosition =
  | 'portero'
  | 'defensa'
  | 'lateral'
  | 'mediocampo'
  | 'extremo'
  | 'delantero';

export type BasketPosition = 'base' | 'escolta' | 'alero' | 'aleroPivot' | 'pivot';

export type Position = FootballPosition | BasketPosition | 'cualquiera';

export type PaymentMethod = 'pagoMovil' | 'transferencia' | 'efectivo' | 'zelle' | 'usdt';

export type ExchangeRateSource = 'bcv' | 'paralelo' | 'custom';

export type Currency = 'USD' | 'VES';

export interface Player {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  skillLevel: SkillLevel;
  sports: Sport[];
  positions: Position[];
  bio?: string;
  verified?: boolean;
  verificationRequested?: boolean;
  isAdmin?: boolean;
  reputation?: number;
  matchesPlayed?: number;
  matchesOrganized?: number;
  attendancePct?: number;
  badges?: string[];
  city?: string;
  onboarded?: boolean;
}

export interface MatchLocation {
  name: string;
  address?: string;
  distanceKm?: number;
  lat?: number;
  lng?: number;
}

export interface MatchParticipant extends Player {
  paymentMethod?: PaymentMethod;
  checkedRequirements?: string[];
}

/** Same shape, explicit alias for pending-state entries */
export type PendingParticipant = MatchParticipant;

export interface Match {
  id: string;
  sport: Sport;
  modality: Modality;
  type: MatchType;
  skillLevel: SkillLevel;
  missingPositions: Position[];
  missingCount: number;
  location: MatchLocation;
  startsAt: string;
  durationMin: number;
  pricePerHour: number;
  currency: Currency;
  paymentMethods: PaymentMethod[];
  requirements: string[];
  optionalRequirements?: string[];
  organizer: Player;
  joinedPlayers: MatchParticipant[];
  startedAt?: string;
  endedAt?: string;
}
