import { supabase } from './supabase';

export type AnalyticsEvent =
  | 'match_viewed'
  | 'match_created'
  | 'match_joined'
  | 'match_left'
  | 'chat_opened'
  | 'profile_viewed'
  | 'search_performed'
  | 'rating_submitted'
  | 'match_shared'
  | 'profile_shared'
  | 'match_started'
  | 'match_ended'
  | 'onboarding_completed'
  | 'voice_message_sent'
  | 'voice_message_played';

let _userId: string | undefined;

export function setAnalyticsUser(id: string | undefined) {
  _userId = id;
}

export async function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase
      .from('custom_events')
      .insert({ user_id: _userId ?? null, event, properties: properties ?? null });
  } catch {
    // analytics must never throw
  }
}
