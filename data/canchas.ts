import type { Sport } from '@/types/domain';

export interface Cancha {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  sports: Sport[];
}

// Mock canchas around Caracas.
export const mockCanchas: Cancha[] = [
  {
    id: 'c1',
    name: 'Cancha Los Naranjos',
    address: 'Los Naranjos, Caracas',
    lat: 10.4636,
    lng: -66.8244,
    sports: ['futbol'],
  },
  {
    id: 'c2',
    name: 'Pádel Pro Las Mercedes',
    address: 'Las Mercedes, Caracas',
    lat: 10.4853,
    lng: -66.8625,
    sports: ['padel'],
  },
  {
    id: 'c3',
    name: 'Gimnasio Vertical CCS',
    address: 'Chacao, Caracas',
    lat: 10.4961,
    lng: -66.8531,
    sports: ['basket'],
  },
  {
    id: 'c4',
    name: 'Cancha La Castellana',
    address: 'La Castellana, Caracas',
    lat: 10.5025,
    lng: -66.8528,
    sports: ['futbol', 'basket'],
  },
  {
    id: 'c5',
    name: 'Club Puerto Azul',
    address: 'Naiguatá, Vargas',
    lat: 10.6125,
    lng: -66.7325,
    sports: ['tenis', 'padel'],
  },
  {
    id: 'c6',
    name: 'Cancha Altamira',
    address: 'Altamira, Caracas',
    lat: 10.4953,
    lng: -66.8478,
    sports: ['futbol', 'basket'],
  },
  {
    id: 'c7',
    name: 'Beach Tennis Macuto',
    address: 'Macuto, La Guaira',
    lat: 10.6019,
    lng: -66.8975,
    sports: ['beachTennis'],
  },
  {
    id: 'c8',
    name: 'Padel Indoor Sebucán',
    address: 'Sebucán, Caracas',
    lat: 10.5039,
    lng: -66.8244,
    sports: ['padel'],
  },
];

export const CARACAS_CENTER = { lat: 10.49, lng: -66.85, latDelta: 0.08, lngDelta: 0.08 };
