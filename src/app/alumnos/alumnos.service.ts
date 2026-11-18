import { Injectable } from '@angular/core';
import { createStore } from 'redux';
import { alumnosReducer } from './alumnos.reducer';
import type { Alumno } from './alumnos.reducer';

export { Alumno } from './alumnos.reducer';
export { promedio, coordenadasValidas } from './alumnos.utils';

/** Envuelve un store de Redux propio (uno por instancia del servicio). */
@Injectable({ providedIn: 'root' })
export class AlumnosService {
  private readonly store = createStore(alumnosReducer);
  get alumnos(): Alumno[] { return this.store.getState().alumnos; }
  readonly dispatch = this.store.dispatch;
  readonly subscribe = this.store.subscribe;
}
