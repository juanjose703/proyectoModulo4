import { Component } from '@angular/core';
import { Application } from '@nativescript/core';
import * as socialShare from '@nativescript/social-share';
import { RadSideDrawer } from 'nativescript-ui-sidedrawer';
import { EstadoFirebase, FirebaseNotificationsService } from './firebase-notifications.service';
import { ToastService } from './toast.service';

const ETIQUETAS: Record<EstadoFirebase, string> = {
  'sin-configurar': 'Firebase sin configurar: completa tus claves en el archivo .env',
  'iniciando': 'Conectando con Firebase...',
  'activo': 'Firebase activo: ya puedes enviar notificaciones desde la consola',
  'permiso-denegado': 'Permiso de notificaciones denegado en el dispositivo',
  'error': 'No se pudo iniciar Firebase (la app continúa funcionando)',
};

@Component({ selector: 'ns-notificaciones', templateUrl: './notificaciones.component.html', standalone: false })
export class NotificacionesComponent {
  mensaje = '';
  etiqueta = (estado: EstadoFirebase | null): string => ETIQUETAS[estado ?? 'sin-configurar'];

  constructor(public notificaciones: FirebaseNotificationsService, private toast: ToastService) {}

  /** Comparte el token como texto (social-share) para pegarlo en la consola de Firebase. */
  compartirToken(): void {
    const token = this.notificaciones.token$.value;
    if (!token) { this.mensaje = 'Todavía no hay token para compartir.'; return; }
    try { socialShare.shareText(token, 'Token de Firebase'); }
    catch { this.mensaje = 'No se pudo abrir el menú de compartir.'; }
  }

  probarToast(): void {
    this.notificaciones.simularMensaje('Mensaje de prueba\nAsí se ve una notificación entrante.');
  }

  menu(): void { (Application.getRootView() as RadSideDrawer).showDrawer(); }
}
