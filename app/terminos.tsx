import { useRouter } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

const staticStyles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionTitle: { marginBottom: spacing.xs },
  paragraph: { lineHeight: 22 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.sm },
  bulletDot: { lineHeight: 22 },
  bulletText: { flex: 1, lineHeight: 22 },
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={staticStyles.section}>
      <Text variant="bodySemibold" color="textPrimary" style={staticStyles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: string }) {
  return (
    <Text variant="body" color="textSecondary" style={staticStyles.paragraph}>
      {children}
    </Text>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={staticStyles.bulletRow}>
      <Text variant="body" color="primary" style={staticStyles.bulletDot}>
        •
      </Text>
      <Text variant="body" color="textSecondary" style={staticStyles.bulletText}>
        {children}
      </Text>
    </View>
  );
}

export default function TerminosScreen() {
  const router = useRouter();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <Screen>
      <BackHeader title="Términos de Servicio" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="caption" color="textTertiary" style={s.lastUpdated}>
          Última actualización: 1 de Enero, 2025
        </Text>

        <Section title="1. Aceptación de los Términos">
          <Paragraph>
            Al acceder y utilizar La Cancha, aceptas quedar vinculado por estos Términos de Servicio y todas las leyes y regulaciones aplicables. Si no estás de acuerdo con alguno de estos términos, tienes prohibido usar o acceder a esta plataforma.
          </Paragraph>
          <Paragraph>
            Nos reservamos el derecho de modificar estos términos en cualquier momento. Es tu responsabilidad revisar periódicamente estos términos para estar al tanto de los cambios. El uso continuado de la plataforma después de cualquier cambio constituye tu aceptación de los nuevos términos.
          </Paragraph>
        </Section>

        <Section title="2. Uso de la Plataforma">
          <Paragraph>
            Al usar La Cancha, te comprometes a:
          </Paragraph>
          <Bullet>Proporcionar información verídica y actualizada en tu perfil.</Bullet>
          <Bullet>No utilizar la plataforma para actividades fraudulentas o ilegales.</Bullet>
          <Bullet>Respetar a los demás usuarios y mantener un trato deportivo.</Bullet>
          <Bullet>No publicar contenido ofensivo, discriminatorio o inapropiado.</Bullet>
          <Bullet>No intentar hackear, alterar o comprometer la seguridad de la plataforma.</Bullet>
          <Bullet>Usar la plataforma únicamente para organizar y unirte a partidas deportivas.</Bullet>
        </Section>

        <Section title="3. Responsabilidades">
          <Paragraph>
            Como organizador de una partida, eres responsable de: proporcionar información precisa sobre la fecha, hora, lugar y requisitos del juego; gestionar los pagos acordados con los jugadores; y notificar con anticipación cualquier cambio o cancelación.
          </Paragraph>
          <Paragraph>
            Como jugador, eres responsable de: confirmar tu asistencia solo si puedes asistir; cumplir con los requisitos de nivel y equipamiento indicados; y respetar las reglas del organizador y del espacio deportivo.
          </Paragraph>
        </Section>

        <Section title="4. Pagos y Cancelaciones">
          <Paragraph>
            La Cancha facilita la coordinación entre jugadores y organizadores, pero no procesa pagos directamente. Los acuerdos económicos se realizan entre las partes. En caso de cancelación por parte del organizador con menos de 2 horas de anticipación, se recomienda ofrecer un reembolso completo a los jugadores confirmados.
          </Paragraph>
          <Paragraph>
            Las cancelaciones reiteradas o el incumplimiento de compromisos pueden resultar en la suspensión o eliminación de tu cuenta de La Cancha.
          </Paragraph>
        </Section>

        <Section title="5. Contacto">
          <Paragraph>
            Si tienes preguntas sobre estos Términos de Servicio, puedes contactarnos en:
          </Paragraph>
          <View style={s.contactBox}>
            <Text variant="bodyMedium" color="primary">
              soporte@lacancha.app
            </Text>
          </View>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.huge,
      gap: spacing.xl,
    },
    lastUpdated: { marginBottom: spacing.sm },
    contactBox: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: spacing.lg,
      alignItems: 'center',
    },
  });
}
