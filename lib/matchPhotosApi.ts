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

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
  const { data: { session } } = await supabase.auth.getSession();

  // FormData with { uri, type, name } is the reliable way to upload local files
  // in React Native — fetch reads the file from the filesystem correctly.
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: asset.mimeType ?? 'image/jpeg',
    name: `photo.${ext}`,
  } as unknown as Blob);

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/match-photos/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        apikey: supabaseKey,
      },
      body: formData,
    },
  );
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    console.error('[matchPhotos] storage upload error:', uploadRes.status, body);
    throw new Error(`Upload failed (${uploadRes.status}): ${body}`);
  }

  const { data: { publicUrl } } = supabase.storage.from('match-photos').getPublicUrl(path);

  const { data, error } = await supabase
    .from('match_photos')
    .insert({ match_id: matchId, uploader_id: uploaderId, url: publicUrl })
    .select()
    .single();
  if (error) {
    console.error('[matchPhotos] insert error:', JSON.stringify(error));
    throw new Error(error.message ?? JSON.stringify(error));
  }

  return rowToPhoto(data as Record<string, unknown>);
}

export async function deleteMatchPhoto(photoId: string, storagePath: string): Promise<void> {
  await supabase.from('match_photos').delete().eq('id', photoId);
  await supabase.storage.from('match-photos').remove([storagePath]);
}
