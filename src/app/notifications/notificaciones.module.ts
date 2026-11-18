import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptRouterModule } from '@nativescript/angular';
import { NotificacionesComponent } from './notificaciones.component';

@NgModule({
  imports: [NativeScriptCommonModule, NativeScriptRouterModule.forChild([{ path: '', component: NotificacionesComponent }])],
  declarations: [NotificacionesComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NotificacionesModule {}
