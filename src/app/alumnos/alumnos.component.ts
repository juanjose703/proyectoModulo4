import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Application, File, ImageSource, knownFolders, path } from '@nativescript/core';
import { RouterExtensions } from '@nativescript/angular';
import { RadSideDrawer } from 'nativescript-ui-sidedrawer';
import * as camera from '@nativescript/camera';
import * as socialShare from '@nativescript/social-share';
import { editarNombre, editarCalificacion, editarFoto } from './alumnos.reducer';
import { Alumno, AlumnosService, promedio } from './alumnos.service';

@Component({ selector: 'ns-alumnos', templateUrl: './alumnos.component.html', standalone: false })
export class AlumnosComponent implements OnDestroy {
  private unsubscribe: () => void;
  mensaje = '';
  ocupada = false;
  abierto: number | null = null;   // id del alumno cuya sección de edición está desplegada
  promedio = promedio;

  constructor(public datos: AlumnosService, private router: RouterExtensions, private vista: ChangeDetectorRef) {
    this.unsubscribe = datos.subscribe(() => this.vista.markForCheck());
  }

  ngOnDestroy(): void { this.unsubscribe(); }

  porId(_indice: number, alumno: Alumno): number { return alumno.id; }

  alternarEdicion(id: number): void {
    this.abierto = this.abierto === id ? null : id;
    this.mensaje = '';
  }

  guardarNombre(id: number, nombre: string): void {
    if (!nombre.trim()) { this.mensaje = 'El nombre es obligatorio.'; return; }
    this.datos.dispatch(editarNombre(id, nombre));
    this.mensaje = 'Nombre guardado durante esta sesión.';
  }

  guardarCalificacion(id: number, materia: string, valor: string): void {
    const nota = Number(valor);
    if (!valor.trim() || !Number.isFinite(nota) || nota < 0 || nota > 100) {
      this.mensaje = 'La calificación debe estar entre 0 y 100.'; return;
    }
    this.datos.dispatch(editarCalificacion(id, materia, nota));
    this.mensaje = 'Calificación guardada durante esta sesión.';
  }

  // ---- social-share: contenido de tipo TEXTO ----
  compartirPromedio(alumno: Alumno): void {
    try { socialShare.shareText(alumno.nombre + ': promedio ' + promedio(alumno), 'Compartir promedio'); }
    catch { this.mensaje = 'No se pudo abrir el menú de compartir.'; }
  }

  // ---- camera: tomar la fotografía y guardarla como archivo ----
  async tomarFoto(alumno: Alumno): Promise<void> {
    if (this.ocupada) { return; }
    this.ocupada = true;
    this.mensaje = '';
    try {
      if (!camera.isAvailable()) { this.mensaje = 'Este dispositivo no tiene cámara disponible.'; return; }
      const permiso = await camera.requestCameraPermissions();
      if (!permiso.Success) { this.mensaje = 'Se necesita permiso para usar la cámara.'; return; }

      const asset = await camera.takePicture({ width: 512, height: 512, keepAspectRatio: true, saveToGallery: false });
      if (!asset) { return; }

      // En Redux se guarda la RUTA (texto serializable); el archivo queda en la carpeta de documentos de la app.
      const fuente = await ImageSource.fromAsset(asset);
      const archivo = path.join(knownFolders.documents().path, `alumno-${alumno.id}-${Date.now()}.jpg`);
      if (!fuente.saveToFile(archivo, 'jpg')) { throw new Error('No se pudo guardar la foto'); }

      const anterior = alumno.foto;
      this.datos.dispatch(editarFoto(alumno.id, archivo));
      if (typeof anterior === 'string' && anterior.includes('/alumno-')) {
        try { File.fromPath(anterior).removeSync(); } catch { /* la foto anterior ya no existe */ }
      }
      this.mensaje = 'Foto actualizada. Ya puedes compartirla.';
    } catch {
      this.mensaje = 'No se tomó la foto, vuelve a intentarlo.';
    } finally {
      this.ocupada = false;
      this.vista.markForCheck();
    }
  }

  // ---- social-share: contenido de tipo IMAGEN (la foto tomada con la cámara) ----
  async compartirFoto(alumno: Alumno): Promise<void> {
    try {
      const foto = typeof alumno.foto === 'string' ? await ImageSource.fromFile(alumno.foto) : alumno.foto;
      if (!foto) { throw new Error('Foto no disponible'); }
      socialShare.shareImage(foto, 'Foto de ' + alumno.nombre);
    } catch {
      this.mensaje = 'No se pudo compartir la foto.';
    } finally {
      this.vista.markForCheck();
    }
  }

  actualizar(): void { this.vista.markForCheck(); }

  verDireccion(alumno: Alumno): void { this.router.navigate(['/alumnos', alumno.id, 'direccion']); }

  menu(): void { (Application.getRootView() as RadSideDrawer).showDrawer(); }
}
