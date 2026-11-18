import { Injectable } from '@angular/core';
import { ToastDuration, ToastPosition, Toasty } from '@triniwiz/nativescript-toasty';

/** Toast nativo (Android e iOS). Si el plugin falla, la app continúa. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  mostrar(texto: string, largo = false): void {
    try {
      new Toasty({
        text: texto,
        position: ToastPosition.BOTTOM,
        duration: largo ? ToastDuration.LONG : ToastDuration.SHORT,
        backgroundColor: '#880e4f',
        textColor: '#ffffff',
      }).show();
    } catch {
      console.warn('No se pudo mostrar el toast.');
    }
  }
}
