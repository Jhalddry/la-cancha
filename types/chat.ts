import type { Player } from './domain';

export interface Message {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  sentAt: string;
}

export interface ChatThread {
  id: string;
  matchId: string;
  title: string;
  subtitle?: string;
  participants: Player[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
