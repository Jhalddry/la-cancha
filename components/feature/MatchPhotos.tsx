import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Camera } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { pickAndUploadMatchPhoto, type MatchPhoto } from '@/lib/matchPhotosApi';
import { radius, spacing } from '@/theme';

interface Props {
  matchId: string;
  uploaderId?: string;
  photos: MatchPhoto[];
  onPhotoAdded: (photo: MatchPhoto) => void;
}

export function MatchPhotos({ matchId, uploaderId, photos, onPhotoAdded }: Props) {
  const c = useColors();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (photos.length === 0 && !uploaderId) return null;

  const handleAdd = async () => {
    if (!uploaderId || uploading) return;
    setError(null);
    setUploading(true);
    try {
      const photo = await pickAndUploadMatchPhoto(matchId, uploaderId);
      if (photo) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPhotoAdded(photo);
      }
    } catch {
      setError('No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {photos.map((p) => (
          <Image
            key={p.id}
            source={{ uri: p.url }}
            style={[styles.photo, { borderColor: c.border }]}
            contentFit="cover"
          />
        ))}
        {uploaderId ? (
          <PressableScale
            onPress={handleAdd}
            disabled={uploading}
            style={[styles.addBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            scaleTo={0.92}
          >
            {uploading ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : (
              <>
                <Camera size={22} color={c.primary} weight="fill" />
                <Text variant="caption" color="primary">Agregar</Text>
              </>
            )}
          </PressableScale>
        ) : null}
      </ScrollView>
      {error ? (
        <Text variant="caption" color="alert" style={{ paddingHorizontal: spacing.lg }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  photo: {
    width: 130,
    height: 98,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  addBtn: {
    width: 98,
    height: 98,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
