import { create } from 'zustand';

import type {
  Currency,
  ExchangeRateSource,
  MatchType,
  Modality,
  PaymentMethod,
  Position,
  SkillLevel,
  Sport,
} from '@/types/domain';

export interface DraftMatch {
  sport: Sport | null;
  modality: Modality | null;
  type: MatchType | null;
  skillLevel: SkillLevel | null;
  positions: Position[];
  missingCount: number;
  locationName: string;
  locationAddress: string;
  locationLat: number | null;
  locationLng: number | null;
  date: Date;
  durationMin: number;
  pricePerHour: string;
  currency: Currency;
  paymentMethods: PaymentMethod[];
  exchangeRate: ExchangeRateSource;
  requirements: string[];
  extraRequirement: string;
}

function defaultDate(): Date {
  const d = new Date();
  d.setHours(20, 0, 0, 0);
  return d;
}

const initial: DraftMatch = {
  sport: null,
  modality: null,
  type: null,
  skillLevel: null,
  positions: [],
  missingCount: 2,
  locationName: '',
  locationAddress: '',
  locationLat: null,
  locationLng: null,
  date: defaultDate(),
  durationMin: 90,
  pricePerHour: '20',
  currency: 'USD',
  paymentMethods: ['pagoMovil'],
  exchangeRate: 'bcv',
  requirements: [],
  extraRequirement: '',
};

interface State {
  draft: DraftMatch;
  step: number;
  set: <K extends keyof DraftMatch>(key: K, value: DraftMatch[K]) => void;
  togglePosition: (p: Position) => void;
  togglePayment: (m: PaymentMethod) => void;
  toggleRequirement: (req: string) => void;
  setStep: (n: number) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
}

export const useDraftMatch = create<State>((set) => ({
  draft: initial,
  step: 1,
  set: (key, value) =>
    set((s) => ({ draft: { ...s.draft, [key]: value } })),
  togglePosition: (p) =>
    set((s) => {
      const has = s.draft.positions.includes(p);
      return {
        draft: {
          ...s.draft,
          positions: has
            ? s.draft.positions.filter((x) => x !== p)
            : [...s.draft.positions, p],
        },
      };
    }),
  togglePayment: (m) =>
    set((s) => {
      const has = s.draft.paymentMethods.includes(m);
      return {
        draft: {
          ...s.draft,
          paymentMethods: has
            ? s.draft.paymentMethods.filter((x) => x !== m)
            : [...s.draft.paymentMethods, m],
        },
      };
    }),
  toggleRequirement: (req) =>
    set((s) => {
      const has = s.draft.requirements.includes(req);
      return {
        draft: {
          ...s.draft,
          requirements: has
            ? s.draft.requirements.filter((x) => x !== req)
            : [...s.draft.requirements, req],
        },
      };
    }),
  setStep: (n) => set({ step: Math.max(1, Math.min(5, n)) }),
  next: () => set((s) => ({ step: Math.min(5, s.step + 1) })),
  prev: () => set((s) => ({ step: Math.max(1, s.step - 1) })),
  reset: () => set({ draft: { ...initial, date: defaultDate() }, step: 1 }),
}));
