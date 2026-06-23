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
      <BackHeader title="Política de Privacidad" onBack={() => router.back()} transparent />
      <ScrollView contentContainerStyle={staticStyles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="caption" color="textTertiary">
          Última actualización: 22 de junio de 2026
        </Text>

        <Section title="Información que Recopilamos">
          <Text variant="body" color="textSecondary">
            Recopilamos únicamente los datos necesarios para brindarte el servicio:
          </Text>
          <Bullet text="Datos de cuenta: nombre, correo electrónico y contraseña (almacenada con hash, nunca en texto plano)." dotStyle={s.dot} />
          <Bullet text="Perfil deportivo: nombre de usuario, foto de perfil, deportes, nivel de juego, posiciones preferidas, ciudad y biografía." dotStyle={s.dot} />
          <Bullet text="Ubicación: coordenadas GPS para mostrarte distancias a partidas cercanas. Solo se accede mientras la app está en uso y con tu permiso explícito." dotStyle={s.dot} />
          <Bullet text="Contenido generado: mensajes de chat (texto y notas de voz), fotos de partida y calificaciones." dotStyle={s.dot} />
          <Bullet text="Datos de uso: eventos anónimos de interacción (pantallas visitadas, acciones realizadas) para mejorar la experiencia. No incluyen datos personales identificables." dotStyle={s.dot} />
          <Bullet text="Token de notificaciones push: si otorgas permiso, almacenamos el token del dispositivo para enviarte avisos de partidas, mensajes y calificaciones." dotStyle={s.dot} />
          <Bullet text="Lista de usuarios bloqueados: se almacena localmente en tu dispositivo (AsyncStorage) y no se sincroniza con nuestros servidores." dotStyle={s.dot} />
        </Section>

        <Section title="Cómo Usamos tu Información">
          <Text variant="body" color="textSecondary">
            Usamos tus datos exclusivamente para:
          </Text>
          <Bullet text="Autenticarte y mantener tu sesión activa de forma segura." dotStyle={s.dot} />
          <Bullet text="Mostrarte partidas relevantes filtradas por deporte, nivel, ubicación y distancia." dotStyle={s.dot} />
          <Bullet text="Facilitar la comunicación entre jugadores y organizadores vía chat de partida y mensajes privados." dotStyle={s.dot} />
          <Bullet text="Reproducir y almacenar notas de voz enviadas en los chats." dotStyle={s.dot} />
          <Bullet text="Calcular y mostrar tu reputación en base a calificaciones recibidas de otros jugadores." dotStyle={s.dot} />
          <Bullet text="Asignar insignias automáticamente según tus estadísticas de partidas jugadas y organizadas." dotStyle={s.dot} />
          <Bullet text="Enviarte notificaciones push sobre solicitudes de unión, aprobaciones, inicio/fin de partidas, mensajes y calificaciones." dotStyle={s.dot} />
          <Bullet text="Detectar y prevenir comportamientos abusivos o fraudulentos en la plataforma." dotStyle={s.dot} />
        </Section>

        <Section title="Compartir Información con Terceros">
          <Text variant="body" color="textSecondary">
            La Cancha no vende ni comparte tu información personal con fines comerciales. Los datos se comparten únicamente en estos casos:
          </Text>
          <Bullet text="Con otros usuarios: tu nombre, foto, nivel y deportes son visibles en tu perfil público. Tu ciudad y bio son opcionales." dotStyle={s.dot} />
          <Bullet text="Con organizadores de partida: al unirte, el organizador ve tu perfil y el método de pago que seleccionaste." dotStyle={s.dot} />
          <Bullet text="Con Supabase (proveedor de infraestructura): almacenamos todos los datos en servidores de Supabase con cifrado en reposo y en tránsito. Supabase no accede a tu información con fines propios." dotStyle={s.dot} />
          <Bullet text="Por obligación legal: únicamente si una autoridad competente lo requiere mediante proceso legal debidamente fundado." dotStyle={s.dot} />
        </Section>

        <Section title="Almacenamiento y Seguridad">
          <Text variant="body" color="textSecondary">
            Tomamos las siguientes medidas para proteger tu información:
          </Text>
          <Bullet text="Todas las comunicaciones usan HTTPS/TLS." dotStyle={s.dot} />
          <Bullet text="Las contraseñas se almacenan con hash seguro; nunca las vemos en texto plano." dotStyle={s.dot} />
          <Bullet text="Los archivos (fotos de perfil, fotos de partida, notas de voz) se guardan en Supabase Storage con acceso restringido por políticas de seguridad." dotStyle={s.dot} />
          <Bullet text="Los tokens de sesión se renuevan automáticamente y expiran si no se usa la app." dotStyle={s.dot} />
          <Bullet text="La lista de usuarios bloqueados se almacena localmente y no viaja a nuestros servidores." dotStyle={s.dot} />
        </Section>

        <Section title="Retención de Datos">
          <Text variant="body" color="textSecondary">
            Conservamos tu información mientras tengas una cuenta activa. Al eliminar tu cuenta:
          </Text>
          <Bullet text="Tu perfil, mensajes y datos de partidas son eliminados de forma permanente." dotStyle={s.dot} />
          <Bullet text="Las calificaciones que otros usuarios te dieron pueden conservarse de forma anonimizada para integridad del sistema." dotStyle={s.dot} />
          <Bullet text="Las fotos que subiste son eliminadas del almacenamiento." dotStyle={s.dot} />
          <Bullet text="Los datos de uso anónimos pueden conservarse con fines estadísticos." dotStyle={s.dot} />
        </Section>

        <Section title="Tus Derechos">
          <Text variant="body" color="textSecondary">
            Como usuario de La Cancha tienes derecho a:
          </Text>
          <Bullet text="Acceder a toda la información personal que tenemos sobre ti." dotStyle={s.dot} />
          <Bullet text="Rectificar datos incorrectos o incompletos desde tu perfil en cualquier momento." dotStyle={s.dot} />
          <Bullet text="Eliminar tu cuenta y todos tus datos. Escríbenos a privacidad@lacancha.app." dotStyle={s.dot} />
          <Bullet text="Revocar el permiso de ubicación o notificaciones desde la configuración de tu dispositivo." dotStyle={s.dot} />
          <Bullet text="Bloquear a otros usuarios desde los chats privados para impedir la comunicación." dotStyle={s.dot} />
        </Section>

        <Section title="Contacto">
          <Text variant="body" color="textSecondary">
            Para ejercer tus derechos o resolver dudas sobre privacidad:
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
      <Text variant="h3" color="textPrimary">{title}</Text>
      <View style={staticStyles.sectionBody}>{children}</View>
    </View>
  );
}

function Bullet({ text, dotStyle }: { text: string; dotStyle: object }) {
  return (
    <View style={staticStyles.bullet}>
      <View style={dotStyle} />
      <Text variant="body" color="textSecondary" style={{ flex: 1 }}>{text}</Text>
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
