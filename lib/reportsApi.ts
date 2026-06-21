import { supabase } from '@/lib/supabase';

export interface ReportOptions {
  reporterId: string;
  reporterName?: string;
  reportedId?: string;
  kind: 'player' | 'chat';
  reason: string;
  detail?: string;
  contextId?: string;
}

export async function submitReport(opts: ReportOptions): Promise<void> {
  const { data: admin } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .limit(1)
    .maybeSingle();

  if (!admin) return;

  await supabase.from('notifications').insert({
    profile_id: (admin as { id: string }).id,
    kind: 'report',
    payload: {
      reporter_id: opts.reporterId,
      reporter_name: opts.reporterName ?? 'Usuario',
      reported_id: opts.reportedId ?? null,
      report_kind: opts.kind,
      reason: opts.reason,
      detail: opts.detail ?? '',
      context_id: opts.contextId ?? null,
    },
    read: false,
    navigate_to: opts.reportedId ? `/perfil/${opts.reportedId}` : null,
  });
}
