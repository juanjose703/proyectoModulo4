# Aula Móvil

App móvil (NativeScript + Angular + Redux) para gestionar estudiantes y sus calificaciones, con capacidades nativas:
cámara, compartir texto e imágenes, Google Maps, notificaciones push (Firebase) y pruebas automáticas con Jasmine + Karma + reporte JUnit.

## Entorno y versiones

Angular declara Node ^22.22.3 || ^24.15.0 || >=26.0.0.

    npm install -g nativescript@9.1.1
    ns doctor

Android: compile/target SDK **35**, Build Tools **35**, mínimo Android API **24**. Dispositivo o emulador con Google Play Services.

    npm install
    npm run android      # o: npm run ios (macOS)

## Tus propias claves (no se suben al repositorio)

Copia `.env.example` a **`.env`** (junto a `package.json`) y completa **tus** valores. `npm run android` ejecuta `scripts/configure.cjs`,
que genera `src/config/environment.generated.ts`, `values/maps.xml` y `values/firebase.xml`. Todo eso está en `.gitignore`.

### Google Maps

    GOOGLE_MAPS_ANDROID_KEY=tu_clave_android
    GOOGLE_MAPS_IOS_KEY=tu_clave_ios

Crea la clave en Google Cloud Console (proyecto propio) y habilita **Maps SDK for Android** / **Maps SDK for iOS**.

### Firebase Cloud Messaging

Registra una app **Android** con el paquete `org.nativescript.aulamovil` (y/o iOS con el mismo bundle id) en **tu** proyecto de Firebase y copia:

    FIREBASE_API_KEY=            # current_key
    FIREBASE_PROJECT_ID=         # project_id
    FIREBASE_MESSAGING_SENDER_ID=# project_number
    FIREBASE_ANDROID_APP_ID=     # mobilesdk_app_id (1:numero:android:id)
    FIREBASE_IOS_APP_ID=         # GOOGLE_APP_ID de GoogleService-Info.plist

Con las claves completas, la app inicia Firebase, pide el permiso y obtiene el **token**. Sin claves o con formato inválido, no se inicia Firebase y la app sigue funcionando.
No uses credenciales de administrador ni claves privadas de cuentas de servicio.

**Probar una notificación:**

1. Abre la app → menú → **Notificaciones**. Ahí se muestra el estado de Firebase y el **token** del dispositivo.
2. Pulsa **Compartir token** (usa social-share) para enviártelo y copiarlo.
3. En Firebase Console → Messaging → **Enviar mensaje de prueba**, pega el token y envía.
4. Con la app abierta se muestra un **toast** y el mensaje queda en el historial; en segundo plano la presenta el sistema operativo y, al pulsarla, se muestra el toast al abrir la app.

El botón **Probar toast** muestra un mensaje local para comprobar el toast sin Firebase. En iOS hace falta además habilitar Push Notifications y cargar la clave APNs en Firebase.

## Consigna del módulo

| # | Requisito | Dónde verlo |
|---|-----------|-------------|
| 1 | Token de Firebase con tus claves | `.env` (tus claves) → `firebase-notifications.service.ts` (`token$`) → pantalla **Notificaciones** (muestra el token) |
| 2 | Toast para notificaciones entrantes | `notifications/toast.service.ts` (Toasty), usado por `FirebaseNotificationsService` al llegar un mensaje |
| 3 | social-share con texto | `alumnos.component.ts` → `compartirPromedio()` (`shareText`) y `compartirToken()` en `notificaciones.component.ts` |
| 4 | social-share con imagen | `alumnos.component.ts` → `compartirFoto()` (`shareImage`) |
| 5 | Plugin camera | `alumnos.component.ts` → `tomarFoto()` (`@nativescript/camera`) |
| 6 | Imagen de la cámara compartible | La foto se guarda como archivo, su ruta va al store de Redux y `compartirFoto()` la comparte |
| 7 | Plugin de Google Maps con cuenta propia | `alumnos/direccion.component.*` (`<MapView>`), clave en `.env` → `maps.xml` / `Info.plist` |
| 8 | Marker en el mapa | `direccion.component.ts` → `actualizarMarcador()` (`addMarker`) |
| 9 | Suite Jasmine que prueba un reducer de Redux | `tests/unit.spec.ts` → `describe('alumnosReducer (Redux)')` (+ store, utilidades, Firebase y notificaciones: 31 pruebas) |
| 10 | Karma + JUnit Reporter | `karma.conf.cjs` (`reporters: ['progress', 'junit']`); `npm test` genera **`reports/junit/unit-tests.xml`** y `scripts/test-unit.cjs` verifica que exista |

## Pruebas

Necesitas Chrome, Chromium o Edge (se detectan las rutas habituales; si no, define `CHROME_BIN`). En CI/Linux como root usa `CI=true` (agrega `--no-sandbox`).

    npm test                # Jasmine en Chrome Headless + reporte JUnit
    npm run typecheck       # TypeScript de la app
    npm run typecheck:tests # TypeScript de las pruebas
    npm run check:angular   # compila las plantillas Angular (AOT)

Al terminar `npm test` se imprime `Reporte JUnit generado: reports/junit/unit-tests.xml (N pruebas, M fallos)`. El script borra el reporte anterior antes de ejecutar,
así que si el archivo existe lo generó esa ejecución. El XML puede abrirse como texto o importarse en cualquier CI compatible con JUnit.

## Estructura

    src/app/
    ├── alumnos/        # reducer de Redux, servicio (store), pantallas de estudiantes y de dirección (mapa)
    ├── notifications/  # Firebase, toast, historial y pantalla Notificaciones (token)
    └── app.*           # drawer y ruteo
    tests/unit.spec.ts  # suite Jasmine
    karma.conf.cjs      # Karma + karma-junit-reporter
    scripts/            # configure.cjs (genera claves) y test-unit.cjs (esbuild + Karma + verificación del XML)
