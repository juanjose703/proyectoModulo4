import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { Application } from '@nativescript/core';
import { RadSideDrawer } from 'nativescript-ui-sidedrawer';
import { filter } from 'rxjs';
import { FirebaseNotificationsService } from './notifications/firebase-notifications.service';

@Component({ selector: 'ns-app', templateUrl: './app.component.html', standalone: false })
export class AppComponent implements OnInit {
  urlActual = '/alumnos';

  constructor(private router: RouterExtensions, enrutador: Router, private notifications: FirebaseNotificationsService) {
    enrutador.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.urlActual = (e as NavigationEnd).urlAfterRedirects);
  }

  ngOnInit(): void { void this.notifications.start(); }

  esActiva(ruta: string): boolean { return this.urlActual.startsWith(ruta); }

  navegar(ruta: string): void {
    this.router.navigate([ruta], { clearHistory: true });
    (Application.getRootView() as RadSideDrawer).closeDrawer();
  }
}
