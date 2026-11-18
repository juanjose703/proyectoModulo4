export interface MensajeRecibido {
  texto: string;
  hora: string;
}

export const MAXIMO_HISTORIAL = 20;

/** Agrega un mensaje al inicio, sin mutar la lista y conservando solo los más recientes. */
export function agregarMensaje(historial: readonly MensajeRecibido[], texto: string, hora: string,
  maximo: number = MAXIMO_HISTORIAL): MensajeRecibido[] {
  return [{ texto, hora }, ...historial].slice(0, Math.max(1, maximo));
}
