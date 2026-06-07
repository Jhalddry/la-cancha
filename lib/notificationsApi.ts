import { supabase } from '@/lib/supabase';
import { labelModality, labelSport } from '@/lib/format';
import type { Modality, Sport } from '@/types/domain';

export type NotificationKind =
  | 'join_request'
  | 'join_approved'
  | 'join_rejected'
  | 'match_started'
  | 'match_ended'
  | 'match_cancelled'
  | 'rating_received'
  | 'match_invitation';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  read: boolean;
  createdAt: string;
  payload: Record<string, unknown>;
  // Derived display fields
  title: string;
  navigateTo?: string;
}

function deriveDisplay(
  kind: NotificationKind,
  payload: Record<string, unknown>,
): { title: string; navigateTo?: string } {
  const matchId = payload.matchId as string | undefined;
  const sport = payload.sport as string | undefined;
  const modality = payload.modality as string | undefined;
  let sportLabel = 'partida';
  try {
    if (sport && modality) {
      sportLabel = `${labelSport(sport as Sport)} ${labelModality(modality as Modality)}`;
    } else if (modality) {
      sportLabel = labelModality(modality as Modality);
    } else if (sport) {
      sportLabel = labelSport(sport as Sport);
    }
  } catch {
    sportLabel = modality ?? sport ?? 'partida';
  }

  switch (kind) {
    case 'join_request':
      return {
        title: `${payload.playerName ?? 'Alguien'} quiere unirse a tu ${sportLabel}`,
        navigateTo: matchId ? `/match/${matchId}` : undefined,
      };
    case 'join_approved':
      return {
        title: `¡Tu solicitud para ${sportLabel} fue aprobada! ✅`,
        navigateTo: matchId ? `/match/${matchId}` : undefined,
      };
    case 'join_rejected':
      return {
        title: `Tu solicitud para ${sportLabel} no fue aceptada`,
        navigateTo: matchId ? `/match/${matchId}` : undefined,
      };
    case 'match_started':
      return {
        title: `Tu ${sportLabel} ha iniciado ⚡`,
        navigateTo: matchId ? `/match/${matchId}` : undefined,
      };
    case 'match_ended':
      return {
        title: `La partida de ${sportLabel} finalizó. ¡Califica a tus compañeros!`,
        navigateTo: '/(tabs)/mis-partidas',
      };
    case 'match_cancelled':
      return {
        title: `La partida de ${sportLabel} fue cancelada`,
        navigateTo: undefined,
      };
    case 'rating_received':
      return {
        title: `${payload.raterName ?? 'Alguien'} te calificó con ${payload.stars ?? '?'} ⭐`,
        navigateTo: '/reputacion',
      };
    case 'match_invitation':
      return {
        title: `${payload.organizerName ?? 'Un organizador'} te invitó a jugar ${sportLabel}`,
        navigateTo: matchId ? `/unirse/${matchId}` : undefined,
      };
    default:
      return { title: 'Nueva notificación' };
  }
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, read, created_at, payload')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[notifications] fetchNotifications error:', error.message, error.code);
    return [];
  }
  if (!data) return [];

  return data.map((row) => {
    const kind = row.kind as NotificationKind;
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const { title, navigateTo } = deriveDisplay(kind, payload);
    return {
      id: row.id as string,
      kind,
      read: row.read as boolean,
      createdAt: row.created_at as string,
      payload,
      title,
      navigateTo,
    };
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', userId)
    .eq('read', false);
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function deleteNotification(id: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', id);
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  await supabase.from('notifications').delete().eq('profile_id', userId);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .eq('read', false);
  return count ?? 0;
}
