import type { MicErrorCode } from '../audio/mic';

const MENSAJES: Record<MicErrorCode, string> = {
  'permiso-denegado':
    'El navegador no tiene permiso para usar el micrófono. Actívalo en la configuración del sitio (el candado junto a la dirección) y recarga la página.',
  'sin-microfono': 'No se encontró ningún micrófono. Conecta uno o revisa tu configuración de audio.',
  desconocido: 'No se pudo acceder al micrófono. Recarga la página e intenta de nuevo.',
};

export function PantallaErrorMic({ code }: { code: MicErrorCode }) {
  return (
    <section>
      <h2>Micrófono no disponible 🎤</h2>
      <p>{MENSAJES[code]}</p>
    </section>
  );
}
