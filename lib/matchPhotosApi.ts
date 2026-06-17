import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export interface MatchPhoto {
  id: string;
  matchId: string;
  uploaderId: string;
  url: string;
  createdAt: string;
}

function rowToPhoto(row: Record<string, unknown>): MatchPhoto {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    uploaderId: row.uploader_id as string,
    url: row.url as string,
    createdAt: row.created_at as string,
  };
}

export async function fetchMatchPhotos(matchId: string): Promise<MatchPhoto[]> {
  const { data, error } = await supabase
    .from('match_photos')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToPhoto(r as Record<string, unknown>));
}

export async function pickAndUploadMatchPhoto(
  matchId: string,
  uploaderId: string,
): Promise<MatchPhoto | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    aspect: [4, 3],
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${matchId}/${uploaderId}_${Date.now()}.${ext}`;

  const response = await fetch(asset.uri);
  const blob = await response.blob();

  const { error: uploadErr } = await supabase.storage
    .from('match-photos')
    .upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
  if (uploadErr) throw uploadErr;

  const { data: { publicUrl } } = supabase.storage.from('match-photos').getPublicUrl(path);

  const { data, error } = await supabase
    .from('match_photos')
    .insert({ match_id: matchId, uploader_id: uploaderId, url: publicUrl })
    .select()
    .single();
  if (error) throw error;

  return rowToPhoto(data as Record<string, unknown>);
}

export async function deleteMatchPhoto(photoId: string, storagePath: string): Promise<void> {
  await supabase.from('match_photos').delete().eq('id', photoId);
  await supabase.storage.from('match-photos').remove([storagePath]);
}
