import { NgModule } from '@angular/core';
import { NativeScriptRouterModule } from '@nativescript/angular';
@NgModule({
  imports: [NativeScriptRouterModule.forRoot([
    { path: '', redirectTo: '/alumnos', pathMatch: 'full' },
    { path: 'alumnos', loadChildren: () => import('./alumnos/alumnos.module').then(m => m.AlumnosModule) },
    { path: 'notificaciones', loadChildren: () => import('./notifications/notificaciones.module').then(m => m.NotificacionesModule) },
    { path: '**', redirectTo: '/alumnos' },
  ])],
  exports: [NativeScriptRouterModule],
})
export class AppRoutingModule {}
