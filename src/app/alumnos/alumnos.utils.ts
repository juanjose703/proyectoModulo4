import type { Alumno } from './alumnos.reducer';

/** Promedio de calificaciones con 2 decimales (texto). */
export function promedio(alumno: Alumno): string {
  if (!alumno.materias.length) { return '0.00'; }
  return (alumno.materias.reduce((total, m) => total + m.calificacion, 0) / alumno.materias.length).toFixed(2);
}

/** Valida latitud (-90..90) y longitud (-180..180) escritas como texto. */
export function coordenadasValidas(lat: string, lng: string): boolean {
  return lat.trim() !== '' && lng.trim() !== '' &&
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
}
