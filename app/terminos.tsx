import { useRouter } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/hooks/useColors';
import { spacing } from '@/theme';
import type { ColorPalette } from '@/theme/palettes';

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

function P({ children }: { children: string }) {
  return (
    <Text variant="body" color="textSecondary" style={staticStyles.p}>
      {children}
    </Text>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={staticStyles.bulletRow}>
      <Text variant="body" color="primary" style={staticStyles.bulletDot}>•</Text>
      <Text variant="body" color="textSecondary" style={staticStyles.bulletText}>{children}</Text>
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
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" color="textTertiary" style={s.lastUpdated}>
          Última actualización: 22 de junio de 2026
        </Text>

        <Section title="1. Aceptación de los Términos">
          <P>
            Al registrarte y usar La Cancha aceptas quedar vinculado por estos Términos de Servicio y las leyes venezolanas aplicables. Si no estás de acuerdo con alguno de estos términos, no uses la plataforma.
          </P>
          <P>
            Podemos actualizar estos términos en cualquier momento. Los cambios serán notificados dentro de la app. El uso continuado después de una actualización implica tu aceptación.
          </P>
        </Section>

        <Section title="2. Cuenta y Perfil">
          <P>
            Para usar La Cancha debes crear una cuenta con correo y contraseña verificados. Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta.
          </P>
          <Bullet>Proporciona información veraz en tu perfil (nombre, deporte, nivel, posición).</Bullet>
          <Bullet>El nombre de usuario debe ser único y no puede suplantar a otra persona.</Bullet>
          <Bullet>La foto de perfil debe ser una imagen tuya o un avatar inofensivo.</Bullet>
          <Bullet>Puedes modificar tu perfil en cualquier momento desde Ajustes.</Bullet>
        </Section>

        <Section title="3. Uso de la Plataforma">
          <P>
            La Cancha es una herramienta de coordinación deportiva. Al usarla, te comprometes a:
          </P>
          <Bullet>Crear y unirte únicamente a partidas que puedes asistir.</Bullet>
          <Bullet>Respetar a los demás jugadores dentro y fuera de la app.</Bullet>
          <Bullet>No publicar contenido ofensivo, discriminatorio o inapropiado en chats, perfiles o fotos de partida.</Bullet>
          <Bullet>No usar la plataforma para actividades fraudulentas, spam o acoso.</Bullet>
          <Bullet>No intentar acceder a datos de otros usuarios sin autorización.</Bullet>
          <Bullet>No eludir bloqueos ni restricciones de forma malintencionada.</Bullet>
        </Section>

        <Section title="4. Responsabilidades del Organizador">
          <P>
            Al crear una partida asumes la responsabilidad de:
          </P>
          <Bullet>Publicar fecha, hora, lugar, precio y requisitos con información exacta.</Bullet>
          <Bullet>Notificar con anticipación cualquier cambio o cancelación.</Bullet>
          <Bullet>Gestionar la aprobación o rechazo de solicitudes de unión de forma oportuna.</Bullet>
          <Bullet>Marcar el inicio y fin de la partida dentro de la app para habilitar las calificaciones.</Bullet>
          <Bullet>Coordinar los pagos con los jugadores conforme a los métodos indicados (Pago Móvil, Zelle, efectivo, USDT, etc.).</Bullet>
        </Section>

        <Section title="5. Responsabilidades del Jugador">
          <P>
            Al unirte a una partida aceptas:
          </P>
          <Bullet>Confirmar tu asistencia solo si puedes asistir.</Bullet>
          <Bullet>Cumplir con los requisitos de equipamiento y nivel indicados por el organizador.</Bullet>
          <Bullet>Respetar las reglas del organizador y del espacio deportivo.</Bullet>
          <Bullet>Realizar el pago acordado en el método y momento estipulados.</Bullet>
        </Section>

        <Section title="6. Pagos">
          <P>
            La Cancha no procesa pagos. La plataforma muestra precios referenciales en bolívares (con conversión BCV) y dólares, y facilita la coordinación entre jugadores, pero los acuerdos económicos se realizan directamente entre las partes.
          </P>
          <P>
            La tasa de cambio BCV mostrada es de referencia y puede diferir del valor real al momento de la transacción. No somos responsables de discrepancias cambiarias.
          </P>
        </Section>

        <Section title="7. Chat y Mensajes Privados">
          <P>
            La Cancha ofrece chat dentro de las partidas y mensajes directos entre jugadores que han compartido una partida. Queda prohibido:
          </P>
          <Bullet>Enviar spam, publicidad no solicitada o contenido malicioso.</Bullet>
          <Bullet>Acosar, amenazar o insultar a otros usuarios.</Bullet>
          <Bullet>Compartir datos personales de terceros sin su consentimiento.</Bullet>
          <P>
            Los mensajes de voz tienen un límite de 60 segundos. Las notas de voz se almacenan en nuestros servidores y pueden ser eliminadas junto con la cuenta.
          </P>
        </Section>

        <Section title="8. Fotos de Partida">
          <P>
            Al finalizar una partida, el organizador y los jugadores confirmados pueden subir fotos. Al hacerlo garantizas que:
          </P>
          <Bullet>Las imágenes son de la partida en cuestión y no infringen derechos de terceros.</Bullet>
          <Bullet>No contienen contenido violento, sexual o inapropiado.</Bullet>
          <Bullet>Tienes el consentimiento de las personas identificables que aparecen en ellas.</Bullet>
        </Section>

        <Section title="9. Sistema de Reputación y Calificaciones">
          <P>
            Después de cada partida finalizada, los participantes pueden calificarse mutuamente con estrellas, etiquetas y comentarios. Las calificaciones son públicas en el perfil de cada usuario.
          </P>
          <P>
            Las calificaciones falsas, malintencionadas o que violen estos términos pueden ser eliminadas y la cuenta responsable suspendida.
          </P>
        </Section>

        <Section title="10. Bloqueo de Usuarios">
          <P>
            Puedes bloquear a cualquier usuario desde los chats privados. Al bloquear a alguien, ninguna de las partes puede enviarse mensajes. El bloqueo se almacena localmente en tu dispositivo y puede revertirse en cualquier momento.
          </P>
        </Section>

        <Section title="11. Conducta y Sanciones">
          <P>
            El incumplimiento reiterado de estas normas puede resultar en suspensión temporal o eliminación permanente de la cuenta, a criterio de La Cancha. Entre las causas de sanción se incluyen:
          </P>
          <Bullet>Cancelaciones repetidas sin aviso previo.</Bullet>
          <Bullet>Comportamiento tóxico o acoso reportado por otros usuarios.</Bullet>
          <Bullet>Publicación de información falsa o engañosa.</Bullet>
          <Bullet>Intentos de manipular el sistema de reputación.</Bullet>
        </Section>

        <Section title="12. Limitación de Responsabilidad">
          <P>
            La Cancha es una plataforma de coordinación. No somos responsables por: lesiones o incidentes ocurridos durante las partidas, incumplimientos de pago entre usuarios, pérdidas o daños a equipamiento deportivo, ni por cancelaciones de partidas por parte de organizadores.
          </P>
        </Section>

        <Section title="13. Contacto">
          <P>
            Para consultas sobre estos Términos de Servicio, reportes o solicitudes de eliminación de cuenta:
          </P>
          <View style={s.contactBox}>
            <Text variant="bodyMedium" color="primary">soporte@lacancha.app</Text>
          </View>
        </Section>
      </ScrollView>
    </Screen>
  );
}

const staticStyles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionTitle: { marginBottom: spacing.xs },
  p: { lineHeight: 22 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.sm },
  bulletDot: { lineHeight: 22 },
  bulletText: { flex: 1, lineHeight: 22 },
});

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
