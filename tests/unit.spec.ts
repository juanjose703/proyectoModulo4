import { createStore } from 'redux';
import {
  alumnosReducer, AlumnosState, editarCalificacion, editarDireccion, editarFoto, editarNombre, estadoInicial,
} from '../src/app/alumnos/alumnos.reducer';
import { coordenadasValidas, promedio } from '../src/app/alumnos/alumnos.utils';
import { firebaseConfigured } from '../src/app/notifications/firebase-config';
import { agregarMensaje } from '../src/app/notifications/historial';
import { NotificationController, PushClient, PushMessage } from '../src/app/notifications/notification-controller';

/** Congela el estado de forma profunda: cualquier mutación en el reducer lanzaría un error. */
function congelar<T>(valor: T): T {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.freeze(valor);
    Object.values(valor).forEach(congelar);
  }
  return valor;
}
const nuevoEstado = (): AlumnosState => congelar(JSON.parse(JSON.stringify(estadoInicial)));
const alumno = (estado: AlumnosState, id: number) => estado.alumnos.find(a => a.id === id)!;

describe('alumnosReducer (Redux)', () => {
  it('devuelve el estado inicial con tres alumnos', () => {
    const estado = alumnosReducer(undefined, { type: '@@init' });
    expect(estado.alumnos.length).toBe(3);
    expect(estado).toBe(estadoInicial);
  });

  it('ignora acciones desconocidas devolviendo el mismo estado', () => {
    const estado = nuevoEstado();
    expect(alumnosReducer(estado, { type: 'otra/accion', id: 1 })).toBe(estado);
  });

  describe('editarNombre', () => {
    it('guarda el nombre sin espacios sobrantes y sin mutar el estado anterior', () => {
      const antes = nuevoEstado();
      const despues = alumnosReducer(antes, editarNombre(1, '  María  '));
      expect(alumno(despues, 1).nombre).toBe('María');
      expect(alumno(antes, 1).nombre).toBe('Ana Morales');
      expect(despues).not.toBe(antes);
    });

    it('conserva la misma referencia de los alumnos que no cambian', () => {
      const antes = nuevoEstado();
      const despues = alumnosReducer(antes, editarNombre(1, 'María'));
      expect(alumno(despues, 2)).toBe(alumno(antes, 2));
      expect(alumno(despues, 3)).toBe(alumno(antes, 3));
    });

    it('rechaza nombres vacíos, en blanco o que no son texto', () => {
      const estado = nuevoEstado();
      expect(alumnosReducer(estado, editarNombre(1, ''))).toBe(estado);
      expect(alumnosReducer(estado, editarNombre(1, '   '))).toBe(estado);
      expect(alumnosReducer(estado, { type: 'alumnos/nombre', id: 1, nombre: 42 })).toBe(estado);
    });

    it('no cambia el estado si el nombre es el mismo o el alumno no existe', () => {
      const estado = nuevoEstado();
      expect(alumnosReducer(estado, editarNombre(1, 'Ana Morales'))).toBe(estado);
      expect(alumnosReducer(estado, editarNombre(99, 'Nadie'))).toBe(estado);
    });
  });

  describe('editarCalificacion', () => {
    it('actualiza solo la materia indicada y recalcula el promedio', () => {
      const antes = nuevoEstado();
      const despues = alumnosReducer(antes, editarCalificacion(1, 'Matematicas', 100));
      expect(alumno(despues, 1).materias[0].calificacion).toBe(100);
      expect(alumno(despues, 1).materias[1]).toBe(alumno(antes, 1).materias[1]);
      expect(promedio(alumno(antes, 1))).toBe('85.00');
      expect(promedio(alumno(despues, 1))).toBe('91.67');
    });

    it('acepta los límites 0 y 100', () => {
      const estado = nuevoEstado();
      expect(alumno(alumnosReducer(estado, editarCalificacion(1, 'Lenguaje', 0)), 1).materias[1].calificacion).toBe(0);
      expect(alumno(alumnosReducer(estado, editarCalificacion(1, 'Lenguaje', 100)), 1).materias[1].calificacion).toBe(100);
    });

    it('rechaza valores fuera de rango, NaN, infinitos o que no son número', () => {
      const estado = nuevoEstado();
      for (const valor of [-1, 101, NaN, Infinity, '90' as unknown as number]) {
        expect(alumnosReducer(estado, editarCalificacion(1, 'Matematicas', valor))).toBe(estado);
      }
    });

    it('ignora materias inexistentes y calificaciones sin cambios', () => {
      const estado = nuevoEstado();
      expect(alumnosReducer(estado, editarCalificacion(1, 'Historia', 90))).toBe(estado);
      expect(alumnosReducer(estado, editarCalificacion(1, 'Matematicas', 80))).toBe(estado);
    });
  });

  describe('editarFoto', () => {
    it('guarda la ruta de la foto tomada con la cámara', () => {
      const despues = alumnosReducer(nuevoEstado(), editarFoto(2, '/documentos/alumno-2-1.jpg'));
      expect(alumno(despues, 2).foto).toBe('/documentos/alumno-2-1.jpg');
    });

    it('rechaza fotos vacías', () => {
      const estado = nuevoEstado();
      expect(alumnosReducer(estado, editarFoto(2, ''))).toBe(estado);
    });
  });

  describe('editarDireccion', () => {
    it('guarda las coordenadas y las copia (sin compartir la referencia del objeto)', () => {
      const entrada = { lat: 14.5, lng: -90.6 };
      const despues = alumnosReducer(nuevoEstado(), editarDireccion(3, entrada));
      entrada.lat = 0;
      expect(alumno(despues, 3).direccion).toEqual({ lat: 14.5, lng: -90.6 });
    });

    it('rechaza coordenadas inválidas', () => {
      const estado = nuevoEstado();
      for (const direccion of [{ lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: NaN, lng: 0 }, null]) {
        expect(alumnosReducer(estado, editarDireccion(1, direccion as never))).toBe(estado);
      }
    });
  });
});

describe('Store de Redux con alumnosReducer', () => {
  it('aplica las acciones y notifica a los suscriptores', () => {
    const store = createStore(alumnosReducer);
    const avisos: number[] = [];
    store.subscribe(() => avisos.push(store.getState().alumnos.length));
    store.dispatch(editarNombre(1, 'Nuevo nombre'));
    expect(store.getState().alumnos[0].nombre).toBe('Nuevo nombre');
    expect(avisos.length).toBe(1);
  });

  it('deja de notificar cuando el suscriptor se da de baja', () => {
    const store = createStore(alumnosReducer);
    let llamadas = 0;
    const baja = store.subscribe(() => llamadas++);
    store.dispatch(editarNombre(1, 'Uno'));
    baja();
    store.dispatch(editarNombre(1, 'Dos'));
    expect(llamadas).toBe(1);
  });

  it('mantiene aislados los estados de dos stores (dos sesiones)', () => {
    const a = createStore(alumnosReducer);
    const b = createStore(alumnosReducer);
    a.dispatch(editarNombre(1, 'Solo en A'));
    expect(b.getState().alumnos[0].nombre).toBe('Ana Morales');
  });
});

describe('Utilidades de alumnos', () => {
  it('promedio con dos decimales y 0.00 sin materias', () => {
    expect(promedio(alumno(estadoInicial, 2))).toBe('85.00');
    expect(promedio({ ...alumno(estadoInicial, 1), materias: [] })).toBe('0.00');
  });

  it('coordenadasValidas valida rangos y texto', () => {
    expect(coordenadasValidas('14.63', '-90.5')).toBe(true);
    expect(coordenadasValidas('90', '180')).toBe(true);
    expect(coordenadasValidas('91', '0')).toBe(false);
    expect(coordenadasValidas('0', '-181')).toBe(false);
    expect(coordenadasValidas('', '10')).toBe(false);
    expect(coordenadasValidas('abc', '10')).toBe(false);
  });
});

describe('firebaseConfigured', () => {
  const base = {
    apiKey: 'AIza' + 'A'.repeat(35), projectId: 'aula-movil-1234', senderId: '123456789012',
    androidAppId: '1:123456789012:android:abcdef123456', iosAppId: '1:123456789012:ios:abcdef123456',
  };

  it('acepta una configuración completa para cada plataforma', () => {
    expect(firebaseConfigured(base, 'android')).toBe(true);
    expect(firebaseConfigured(base, 'ios')).toBe(true);
  });

  it('rechaza valores vacíos o con formato inválido', () => {
    expect(firebaseConfigured({ ...base, apiKey: '' }, 'android')).toBe(false);
    expect(firebaseConfigured({ ...base, projectId: 'X' }, 'android')).toBe(false);
    expect(firebaseConfigured({ ...base, senderId: 'abc' }, 'android')).toBe(false);
    expect(firebaseConfigured({ ...base, androidAppId: '1:999:android:abc' }, 'android')).toBe(false);
    expect(firebaseConfigured({ ...base, iosAppId: '' }, 'ios')).toBe(false);
  });
});

describe('agregarMensaje (historial de notificaciones)', () => {
  it('agrega al inicio sin mutar la lista original', () => {
    const original = Object.freeze([{ texto: 'a', hora: '1' }]);
    const nueva = agregarMensaje(original, 'b', '2');
    expect(nueva.map(m => m.texto)).toEqual(['b', 'a']);
    expect(original.length).toBe(1);
  });

  it('conserva solo los más recientes', () => {
    let lista = agregarMensaje([], 'm0', '0', 3);
    for (let i = 1; i < 6; i++) { lista = agregarMensaje(lista, 'm' + i, String(i), 3); }
    expect(lista.map(m => m.texto)).toEqual(['m5', 'm4', 'm3']);
  });
});

describe('NotificationController', () => {
  function clienteFalso() {
    let escuchar: (mensaje: PushMessage) => void = () => undefined;
    const client: PushClient = {
      start: jasmine.createSpy('start').and.callFake(async (l: (m: PushMessage) => void) => { escuchar = l; }),
      stop: jasmine.createSpy('stop'),
    };
    return { client, emitir: (mensaje: PushMessage) => escuchar(mensaje) };
  }

  it('no carga Firebase si no está configurado', async () => {
    const cargar = jasmine.createSpy('cargar');
    await new NotificationController(() => undefined, () => undefined).start(false, cargar);
    expect(cargar).not.toHaveBeenCalled();
  });

  it('muestra título y cuerpo de una notificación', async () => {
    const mostrar = jasmine.createSpy('mostrar');
    const { client, emitir } = clienteFalso();
    await new NotificationController(mostrar).start(true, async () => client);
    emitir({ notification: { title: 'Tarea', body: 'Entrega mañana' } });
    expect(mostrar).toHaveBeenCalledWith('Tarea\nEntrega mañana');
  });

  it('usa el payload data cuando no hay notification y descarta mensajes vacíos', async () => {
    const mostrar = jasmine.createSpy('mostrar');
    const { client, emitir } = clienteFalso();
    await new NotificationController(mostrar).start(true, async () => client);
    emitir({ data: { title: 'Aviso', body: 'Reunión' } });
    emitir({ data: { title: '  ', body: '' } });
    emitir({});
    expect(mostrar).toHaveBeenCalledTimes(1);
    expect(mostrar).toHaveBeenCalledWith('Aviso\nReunión');
  });

  it('captura los errores de carga y avisa sin lanzar excepción', async () => {
    const aviso = jasmine.createSpy('aviso');
    await expectAsync(new NotificationController(() => undefined, aviso)
      .start(true, async () => { throw new Error('sin red'); })).toBeResolved();
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('avisa si mostrar el mensaje falla, sin romper el listener', async () => {
    const aviso = jasmine.createSpy('aviso');
    const { client, emitir } = clienteFalso();
    await new NotificationController(() => { throw new Error('fallo'); }, aviso).start(true, async () => client);
    expect(() => emitir({ notification: { title: 'x' } })).not.toThrow();
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('solo se inicia una vez', async () => {
    const cargar = jasmine.createSpy('cargar').and.callFake(async () => clienteFalso().client);
    const controlador = new NotificationController(() => undefined);
    await controlador.start(true, cargar);
    await controlador.start(true, cargar);
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('detiene el cliente y deja de mostrar mensajes después de stop()', async () => {
    const mostrar = jasmine.createSpy('mostrar');
    const { client, emitir } = clienteFalso();
    const controlador = new NotificationController(mostrar);
    await controlador.start(true, async () => client);
    controlador.stop();
    emitir({ notification: { title: 'tarde' } });
    expect(client.stop).toHaveBeenCalledTimes(1);
    expect(mostrar).not.toHaveBeenCalled();
  });

  it('detiene el cliente si se destruye mientras cargaba', async () => {
    const { client } = clienteFalso();
    const controlador = new NotificationController(() => undefined);
    const inicio = controlador.start(true, async () => { controlador.stop(); return client; });
    await inicio;
    expect(client.stop).toHaveBeenCalled();
    expect(client.start).not.toHaveBeenCalled();
  });
});
