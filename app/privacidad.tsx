import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import type { ColorPalette } from '@/theme/palettes';
import { spacing } from '@/theme';

export default function PrivacidadScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <Screen edges={['top']}>
      <BackHeader
        title="Política de Privacidad"
        onBack={() => router.back()}
        transparent
      />
      <ScrollView
        contentContainerStyle={staticStyles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="caption" color="textTertiary">
          Última actualización: 18 de mayo de 2026
        </Text>

        <Section title="Información que Recopilamos">
          <Text variant="body" color="textSecondary">
            En La Cancha recopilamos información necesaria para brindarte el mejor servicio:
          </Text>
          <Bullet text="Datos de perfil: nombre, correo electrónico, foto y preferencias deportivas." dotStyle={s.dot} />
          <Bullet text="Datos de ubicación: para mostrarte partidas cercanas (solo cuando la app está en uso)." dotStyle={s.dot} />
          <Bullet text="Información de uso: cómo interactúas con la plataforma para mejorar la experiencia." dotStyle={s.dot} />
          <Bullet text="Comunicaciones: mensajes dentro de la app entre jugadores y organizadores." dotStyle={s.dot} />
        </Section>

        <Section title="Cómo Usamos tu Información">
          <Text variant="body" color="textSecondary">
            Utilizamos tus datos exclusivamente para:
          </Text>
          <Bullet text="Conectarte con jugadores y partidas cercanas a tu ubicación." dotStyle={s.dot} />
          <Bullet text="Mostrarte partidas relevantes según tu deporte, nivel y posición." dotStyle={s.dot} />
          <Bullet text="Gestionar pagos y transacciones dentro de la plataforma." dotStyle={s.dot} />
          <Bullet text="Enviarte notificaciones sobre tus partidas y mensajes." dotStyle={s.dot} />
          <Bullet text="Mejorar continuamente el servicio basándonos en el uso." dotStyle={s.dot} />
        </Section>

        <Section title="Compartir Información">
          <Text variant="body" color="textSecondary">
            La Cancha no vende ni comparte tu información personal con terceros con fines comerciales. Solo compartimos datos en estos casos:
          </Text>
          <Bullet text="Con otros jugadores: tu nombre, foto y nivel de juego son visibles en tu perfil público." dotStyle={s.dot} />
          <Bullet text="Con organizadores: al unirte a una partida, el organizador puede ver tu perfil." dotStyle={s.dot} />
          <Bullet text="Por obligación legal: si una autoridad competente lo requiere debidamente." dotStyle={s.dot} />
        </Section>

        <Section title="Seguridad de Datos">
          <Text variant="body" color="textSecondary">
            Implementamos medidas de seguridad estándar de la industria para proteger tu información, incluyendo cifrado en tránsito y en reposo. No almacenamos información de tarjetas de crédito ni datos bancarios completos.
          </Text>
        </Section>

        <Section title="Tus Derechos">
          <Text variant="body" color="textSecondary">
            Como usuario de La Cancha tienes derecho a:
          </Text>
          <Bullet text="Acceder a toda la información personal que tenemos sobre ti." dotStyle={s.dot} />
          <Bullet text="Rectificar datos incorrectos o incompletos desde tu perfil." dotStyle={s.dot} />
          <Bullet text="Eliminar tu cuenta y todos tus datos de nuestra plataforma." dotStyle={s.dot} />
          <Bullet text="Portar tus datos a otra plataforma en formato estándar." dotStyle={s.dot} />
          <Bullet text="Oponerte al procesamiento de tus datos para fines de marketing." dotStyle={s.dot} />
        </Section>

        <Section title="Contacto">
          <Text variant="body" color="textSecondary">
            Para ejercer tus derechos o consultas sobre privacidad, contáctanos en:
          </Text>
          <Text variant="bodyMedium" color="primary" style={staticStyles.email}>
            privacidad@lacancha.app
          </Text>
          <Text variant="small" color="textTertiary">
            Respondemos en un plazo máximo de 72 horas hábiles.
          </Text>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={staticStyles.section}>
      <Text variant="h3" color="textPrimary">
        {title}
      </Text>
      <View style={staticStyles.sectionBody}>{children}</View>
    </View>
  );
}

function Bullet({ text, dotStyle }: { text: string; dotStyle: object }) {
  return (
    <View style={staticStyles.bullet}>
      <View style={dotStyle} />
      <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 80,
    gap: spacing.xl,
  },
  section: { gap: spacing.md },
  sectionBody: { gap: spacing.sm },
  bullet: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  email: { marginTop: spacing.xs },
});

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
      marginTop: 7,
      flexShrink: 0,
    },
  });
}
