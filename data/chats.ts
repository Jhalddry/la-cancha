import type { ChatThread, Message } from '@/types/chat';

import { mockCurrentUser, mockPlayers } from './players';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

export const mockChatThreads: ChatThread[] = [
  {
    id: 'c_1',
    matchId: 'm_1',
    title: 'Fútbol 7 · Los Naranjos',
    subtitle: 'Hoy 8:00 PM',
    participants: [mockCurrentUser, mockPlayers[0], mockPlayers[1], mockPlayers[2]],
    lastMessage: 'Yo llevo el balón, no se preocupen',
    lastMessageAt: iso(8 * MINUTE),
    unreadCount: 2,
  },
  {
    id: 'c_2',
    matchId: 'm_2',
    title: 'Pádel · Las Mercedes',
    subtitle: 'Mañana 7:00 PM',
    participants: [mockCurrentUser, mockPlayers[3], mockPlayers[1]],
    lastMessage: 'Confirmado, nos vemos allá',
    lastMessageAt: iso(45 * MINUTE),
    unreadCount: 0,
  },
  {
    id: 'c_3',
    matchId: 'm_5',
    title: 'Tenis Dobles · Club Puerto Azul',
    subtitle: 'Dom 8:00 AM',
    participants: [mockCurrentUser, mockPlayers[3]],
    lastMessage: '¿Cancha 3 o 4?',
    lastMessageAt: iso(3 * HOUR),
    unreadCount: 1,
  },
];

export const mockMessages: Record<string, Message[]> = {
  c_1: [
    {
      id: 'msg_1',
      threadId: 'c_1',
      authorId: 'u_1',
      body: 'Listo gente, todo confirmado para hoy',
      sentAt: iso(2 * HOUR),
    },
    {
      id: 'msg_2',
      threadId: 'c_1',
      authorId: 'u_2',
      body: '¿Alguien lleva pelota?',
      sentAt: iso(1 * HOUR + 50 * MINUTE),
    },
    {
      id: 'msg_3',
      threadId: 'c_1',
      authorId: 'u_self',
      body: 'Yo llevo dos pelotas',
      sentAt: iso(1 * HOUR + 20 * MINUTE),
    },
    {
      id: 'msg_4',
      threadId: 'c_1',
      authorId: 'u_1',
      body: 'Yo llevo el balón, no se preocupen',
      sentAt: iso(8 * MINUTE),
    },
  ],
  c_2: [
    {
      id: 'msg_5',
      threadId: 'c_2',
      authorId: 'u_4',
      body: 'Hola! Reservé la cancha 2 para mañana',
      sentAt: iso(2 * HOUR),
    },
    {
      id: 'msg_6',
      threadId: 'c_2',
      authorId: 'u_self',
      body: 'Perfecto, ahí estaré',
      sentAt: iso(1 * HOUR),
    },
    {
      id: 'msg_7',
      threadId: 'c_2',
      authorId: 'u_2',
      body: 'Confirmado, nos vemos allá',
      sentAt: iso(45 * MINUTE),
    },
  ],
  c_3: [
    {
      id: 'msg_8',
      threadId: 'c_3',
      authorId: 'u_4',
      body: '¿Cancha 3 o 4?',
      sentAt: iso(3 * HOUR),
    },
  ],
};
