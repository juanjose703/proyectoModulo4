import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Application, isAndroid } from '@nativescript/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../config/environment';
import { NotificationController, PushClient } from './notification-controller';
import { firebaseConfigured } from './firebase-config';
import { agregarMensaje, MensajeRecibido } from './historial';
import { ToastService } from './toast.service';

export type EstadoFirebase = 'sin-configurar' | 'iniciando' | 'activo' | 'permiso-denegado' | 'error';

@Injectable({ providedIn: 'root' })
export class FirebaseNotificationsService implements OnDestroy {
  /** Token FCM del dispositivo (null hasta que Firebase lo entregue). Se muestra en la pantalla Notificaciones. */
  readonly token$ = new BehaviorSubject<string | null>(null);
  readonly estado$ = new BehaviorSubject<EstadoFirebase>('sin-configurar');
  readonly historial$ = new BehaviorSubject<MensajeRecibido[]>([]);

  private foreground = true;
  private suspend = () => { this.foreground = false; };
  private resume = () => { this.foreground = true; };
  private controller: NotificationController;

  constructor(private zone: NgZone, private toast: ToastService) {
    this.controller = new NotificationController(
      text => this.zone.run(() => {
        this.historial$.next(agregarMensaje(this.historial$.value, text, new Date().toLocaleTimeString()));
        // Toast: solo si la app está visible (en segundo plano la notificación la muestra el sistema).
        if (this.foreground) { this.toast.mostrar(text, true); }
      }),
      () => this.zone.run(() => {
        console.warn('Firebase no disponible; la aplicación continúa.');
        this.estado$.next('error');
      }),
    );
    Application.on(Application.suspendEvent, this.suspend);
    Application.on(Application.resumeEvent, this.resume);
  }

  /** Muestra un mensaje de prueba local (sirve para comprobar el toast sin Firebase). */
  simularMensaje(texto: string): void {
    this.zone.run(() => {
      this.historial$.next(agregarMensaje(this.historial$.value, texto, new Date().toLocaleTimeString()));
      this.toast.mostrar(texto, true);
    });
  }

  start(): Promise<void> {
    const config = environment.firebase;
    const appId = isAndroid ? config.androidAppId : config.iosAppId;
    const platform = isAndroid ? 'android' : 'ios';
    const enabled = firebaseConfigured(config, platform);
    this.estado$.next(enabled ? 'iniciando' : 'sin-configurar');
    return this.controller.start(enabled, async (): Promise<PushClient> => {
      // Los módulos permanecen en el proyecto; solo se inicializan con configuración completa.
      const { firebase, FirebaseOptions } = await import('@nativescript/firebase-core');
      const { Messaging, AuthorizationStatus } = await import('@nativescript/firebase-messaging');
      const options = new FirebaseOptions();
      options.apiKey = config.apiKey;
      options.googleAppId = appId;
      options.gcmSenderId = config.senderId;
      options.projectId = config.projectId;
      // Android puede haber creado la app mediante los recursos generados antes de ejecutar JS.
      let initialized = false;
      try { initialized = !!firebase().app(); } catch { /* Todavía no existe una app nativa. */ }
      if (!initialized) await firebase().initializeApp(options);
      const messaging = new Messaging();
      let stopped = false;
      const guardarToken = (token: string) => {
        if (stopped) { return; }
        this.zone.run(() => { this.token$.next(token); this.estado$.next('activo'); });
      };
      return {
        start: async listener => {
          messaging.showNotificationsWhenInForeground = false;
          messaging.onMessage(listener);
          messaging.onNotificationTap(listener);
          messaging.onToken(guardarToken);
          const status = await messaging.requestPermission({ ios: { alert: true, sound: true, badge: true } });
          if (stopped) { return; }
          if (status !== AuthorizationStatus.AUTHORIZED && status !== AuthorizationStatus.PROVISIONAL) {
            this.zone.run(() => this.estado$.next('permiso-denegado'));
            return;
          }
          await messaging.registerDeviceForRemoteMessages();
          if (stopped) { return; }
          guardarToken(await messaging.getToken());
        },
        stop: () => {
          stopped = true;
          messaging.onMessage(null);
          messaging.onNotificationTap(null);
          messaging.onToken(null);
        },
      };
    });
  }

  ngOnDestroy(): void {
    this.controller.stop();
    Application.off(Application.suspendEvent, this.suspend);
    Application.off(Application.resumeEvent, this.resume);
    this.token$.complete();
    this.estado$.complete();
    this.historial$.complete();
  }
}
