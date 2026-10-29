import type { Href } from 'expo-router';
import type { NombreIcono } from '../components/ui/Icono';
import type { ItemFaltante, Producto } from '../data/mock';
import type { Hogar } from '../state/SesionProvider';
import { UBICACIONES } from '../data/catalogo';
import { estaCaducado, estaPorCaducar, estadoCaducidad, ordenarPorCaducidad } from '../utils/caducidad';
import { cantidadTexto } from '../utils/cantidad';
import { haceCuanto } from '../utils/fechas';
import { ui } from '../theme/tokens';

// Conversaciones de Freddy. El usuario no escribe: elige opciones y Freddy
// responde con los datos reales del hogar. Cada sección de la app tiene su
// propio tema (lo que dice la burbuja y lo que se puede preguntar), y una
// opción con `ir` lleva a otra pantalla en vez de responder.

export type TemaId = 'general' | 'despensa' | 'lista' | 'cocina' | 'soporte';

export type Opcion = { id: string; etiqueta: string; icono?: NombreIcono; ir?: Href };

/** Renglón de una lista: nombre a la izquierda y un detalle a la derecha. */
export type Item = { texto: string; detalle?: string; tono?: string };

/**
 * Un globo de Freddy: texto solo, o texto con una lista debajo.
 * `numerada` muestra la lista como pasos (1, 2, 3…).
 */
export type Globo = string | { texto: string; items: (string | Item)[]; numerada?: boolean };

export type Respuesta = { globos: Globo[]; opciones?: Opcion[] };

export type Contexto = { productos: Producto[]; faltantes: ItemFaltante[]; hogar: Hogar };

export type Tema = {
  titulo: string;
  saludo: string;
  bienvenida: (ctx: Contexto) => Globo[];
  menu: Opcion[];
  responder: (opcion: string, ctx: Contexto) => Respuesta;
};

// --- Ayudas -----------------------------------------------------------------

/** Elige la forma singular o plural según n. */
const segun = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
const plural = (n: number, uno: string, varios: string) => `${n} ${segun(n, uno, varios)}`;

const conEstado = (p: Producto): Item => {
  const { texto, tono } = estadoCaducidad(p);
  return { texto: p.nombre, detalle: texto, tono };
};

const porCaducar = (ctx: Contexto) => ctx.productos.filter(estaPorCaducar).sort(ordenarPorCaducidad);
const caducados = (ctx: Contexto) => ctx.productos.filter(estaCaducado).sort(ordenarPorCaducidad);

const NO_ENTENDI: Respuesta = { globos: ['Mmm, esa no me la sé. Elige otra pregunta.'] };

const IR_POR_CADUCAR: Opcion = { id: 'ir-por-caducar', etiqueta: 'Ver por caducar', icono: 'reloj', ir: '/inventario?filtro=por-caducar' };
const IR_CADUCADOS: Opcion = { id: 'ir-caducados', etiqueta: 'Ver caducados', icono: 'alerta', ir: '/inventario?filtro=caducados' };
const IR_DESPENSA: Opcion = { id: 'ir-despensa', etiqueta: 'Ir a mi despensa', icono: 'frasco', ir: '/inventario' };
const IR_LISTA: Opcion = { id: 'ir-lista', etiqueta: 'Ir a mi lista', icono: 'carrito', ir: '/faltantes' };
const IR_AGREGAR: Opcion = { id: 'ir-agregar', etiqueta: 'Agregar producto', icono: 'mas', ir: '/producto/registrar' };
const IR_COCINA: Opcion = { id: 'ir-cocina', etiqueta: 'Ver recetas', icono: 'olla', ir: '/cocina' };

const SIN_PRODUCTOS: Respuesta = {
  globos: ['Todavía no tienes productos registrados.', 'Agrega el primero y te cuento cómo va tu despensa.'],
  opciones: [IR_AGREGAR],
};

function respuestaPorCaducar(ctx: Contexto): Respuesta {
  const lista = porCaducar(ctx);
  if (lista.length === 0) return { globos: ['Nada caduca en los próximos 5 días. ¡Vas muy bien!'] };
  const n = lista.length;
  return {
    globos: [
      { texto: `${segun(n, 'Esto caduca', 'Estos caducan')} en los próximos 5 días:`, items: lista.map(conEstado) },
      `Te conviene ${segun(n, 'usarlo', 'usarlos')} primero.`,
    ],
    opciones: [IR_POR_CADUCAR],
  };
}

function respuestaCaducados(ctx: Contexto): Respuesta {
  const lista = caducados(ctx);
  if (lista.length === 0) return { globos: ['No tienes nada caducado. ¡Bien hecho!'] };
  const n = lista.length;
  return {
    globos: [
      { texto: `${segun(n, 'Ya caducó', 'Ya caducaron')} ${plural(n, 'producto', 'productos')}:`, items: lista.map(conEstado) },
      n === 1
        ? 'Revísalo: si ya no sirve, elimínalo o márcalo como agotado para reponerlo.'
        : 'Revísalos: si ya no sirven, elimínalos o márcalos como agotados para reponerlos.',
    ],
    opciones: [IR_CADUCADOS],
  };
}

// --- Temas ------------------------------------------------------------------

const general: Tema = {
  titulo: 'Asistente de tu hogar',
  saludo: '¡Hola! ¿Te ayudo con tu despensa?',
  bienvenida: (ctx) => [`¡Hola! Soy Freddy, el asistente de ${ctx.hogar.nombre}.`, '¿En qué te ayudo?'],
  menu: [
    { id: 'resumen', etiqueta: '¿Cómo va mi despensa?', icono: 'frasco' },
    { id: 'pronto', etiqueta: '¿Qué caduca pronto?', icono: 'reloj' },
    { id: 'agregar', etiqueta: '¿Cómo agrego un producto?', icono: 'mas' },
    { id: 'secciones', etiqueta: '¿Qué puedo hacer aquí?', icono: 'chispas' },
  ],
  responder: (opcion, ctx) => {
    switch (opcion) {
      case 'resumen': {
        if (ctx.productos.length === 0) return SIN_PRODUCTOS;
        const pc = porCaducar(ctx).length;
        const cad = caducados(ctx).length;
        return {
          globos: [
            {
              texto: `Así va ${ctx.hogar.nombre} hoy:`,
              items: [
                { texto: 'Productos registrados', detalle: String(ctx.productos.length) },
                { texto: 'Caducan en 5 días', detalle: String(pc), tono: pc ? ui.porVencer : undefined },
                { texto: 'Ya caducaron', detalle: String(cad), tono: cad ? ui.urgente : undefined },
                { texto: 'En tu lista de compras', detalle: String(ctx.faltantes.length) },
              ],
            },
            cad > 0
              ? `Te recomiendo revisar primero ${segun(cad, 'lo que ya caducó', 'los productos caducados')}.`
              : pc > 0 ? 'Todo bien, solo usa primero lo que está por caducar.' : 'Todo está en orden. ¡Buen trabajo!',
          ],
          opciones: [
            ...(cad > 0 ? [IR_CADUCADOS] : pc > 0 ? [IR_POR_CADUCAR] : []),
            ...(ctx.faltantes.length > 0 ? [IR_LISTA] : []),
          ],
        };
      }
      case 'pronto':
        return respuestaPorCaducar(ctx);
      case 'agregar':
        return {
          globos: [
            'Toca "Agregar producto" aquí en el inicio, o el + en tu despensa.',
            {
              texto: 'Luego llenas:',
              numerada: true,
              items: ['Nombre y categoría', 'Dónde lo guardas', 'Cantidad', 'Fecha de compra y de caducidad', 'Notas, si quieres (marca, precio…)'],
            },
          ],
          opciones: [IR_AGREGAR],
        };
      case 'secciones':
        return {
          globos: [
            {
              texto: 'En la barra de abajo tienes:',
              items: [
                { texto: 'Despensa', detalle: 'lo que tienes' },
                { texto: 'Lista', detalle: 'lo que falta' },
                { texto: 'Cocina', detalle: 'ideas de recetas' },
                { texto: 'Perfil', detalle: 'tu hogar y soporte' },
              ],
            },
            'Háblame en cada sección y te ayudo con eso en específico.',
          ],
        };
      default:
        return NO_ENTENDI;
    }
  },
};

const despensa: Tema = {
  titulo: 'Ayuda con tu despensa',
  saludo: '¿Buscas algo de tu despensa?',
  bienvenida: (ctx) => [
    ctx.productos.length
      ? `Tienes ${plural(ctx.productos.length, 'producto', 'productos')} en tu despensa.`
      : 'Tu despensa todavía está vacía.',
    '¿Qué quieres saber?',
  ],
  menu: [
    { id: 'por-caducar', etiqueta: '¿Qué está por caducar?', icono: 'reloj' },
    { id: 'caducados', etiqueta: '¿Qué ya caducó?', icono: 'alerta' },
    { id: 'ubicaciones', etiqueta: '¿Qué hay en cada lugar?', icono: 'alacena' },
    { id: 'antiguos', etiqueta: '¿Qué compré hace más tiempo?', icono: 'calendario' },
    { id: 'agotado', etiqueta: '¿Cómo marco algo como agotado?', icono: 'carrito' },
  ],
  responder: (opcion, ctx) => {
    switch (opcion) {
      case 'por-caducar':
        return respuestaPorCaducar(ctx);
      case 'caducados':
        return respuestaCaducados(ctx);
      case 'ubicaciones': {
        if (ctx.productos.length === 0) return SIN_PRODUCTOS;
        const items = UBICACIONES
          .map((u) => ({ u: u.nombre, n: ctx.productos.filter((p) => p.ubicacion === u.nombre).length }))
          .filter((x) => x.n > 0)
          .map((x): Item => ({ texto: x.u, detalle: plural(x.n, 'producto', 'productos') }));
        return { globos: [{ texto: 'Así está repartida tu despensa:', items }], opciones: [IR_DESPENSA] };
      }
      case 'antiguos': {
        if (ctx.productos.length === 0) return SIN_PRODUCTOS;
        const lista = [...ctx.productos].sort((a, b) => a.fechaCompra.localeCompare(b.fechaCompra)).slice(0, 3);
        return {
          globos: [
            {
              texto: 'Esto es lo que llevas más tiempo guardando:',
              items: lista.map((p): Item => ({ texto: p.nombre, detalle: `comprado ${haceCuanto(p.fechaCompra)}` })),
            },
            `Revisa que ${segun(lista.length, 'siga', 'sigan')} en buen estado.`,
          ],
          opciones: [IR_DESPENSA],
        };
      }
      case 'agotado':
        return {
          globos: [
            { texto: 'Es muy fácil:', numerada: true, items: ['Abre el producto en tu despensa', 'Toca "Se acabó, agregar a mi lista"'] },
            'Sale de tu despensa y pasa a tu lista de compras para que no se te olvide.',
          ],
          opciones: [IR_DESPENSA],
        };
      default:
        return NO_ENTENDI;
    }
  },
};

const lista: Tema = {
  titulo: 'Ayuda con tu lista',
  saludo: '¿Te ayudo con tu lista de compras?',
  bienvenida: (ctx) => [
    ctx.faltantes.length
      ? `Tienes ${plural(ctx.faltantes.length, 'cosa', 'cosas')} por comprar.`
      : 'Tu lista de compras está vacía.',
    '¿Qué necesitas?',
  ],
  menu: [
    { id: 'falta', etiqueta: '¿Qué me falta comprar?', icono: 'carrito' },
    { id: 'reponer', etiqueta: '¿Qué debería reponer?', icono: 'alerta' },
    { id: 'agregar', etiqueta: '¿Cómo agrego algo?', icono: 'mas' },
    { id: 'terminar', etiqueta: '¿Qué pasa al terminar la compra?', icono: 'bolsa-lista' },
  ],
  responder: (opcion, ctx) => {
    switch (opcion) {
      case 'falta': {
        const n = ctx.faltantes.length;
        if (n === 0) return { globos: ['No te falta nada por ahora. ¡Despensa completa!'] };
        return {
          globos: [{
            texto: `Te ${segun(n, 'falta', 'faltan')} ${plural(n, 'cosa', 'cosas')}:`,
            items: ctx.faltantes.map((f): Item => ({ texto: f.nombre, detalle: cantidadTexto(f.cantidad, f.unidad) })),
          }],
        };
      }
      case 'reponer': {
        const enLista = new Set(ctx.faltantes.map((f) => f.nombre.toLowerCase()));
        const sugerencias = caducados(ctx).filter((p) => !enLista.has(p.nombre.toLowerCase()));
        if (sugerencias.length === 0) return { globos: ['Por ahora no hay nada que reponer: lo caducado ya está en tu lista.'] };
        const n = sugerencias.length;
        return {
          globos: [
            { texto: 'Esto ya caducó y no está en tu lista:', items: sugerencias.map(conEstado) },
            `Ábre${segun(n, 'lo', 'los')} en tu despensa y toca "Se acabó" para agregar${segun(n, 'lo', 'los')}.`,
          ],
          opciones: [IR_CADUCADOS],
        };
      }
      case 'agregar':
        return {
          globos: [
            'Escribe el nombre arriba, en "Agregar a la lista", y confirma.',
            'También se agregan solos cuando marcas un producto de tu despensa como agotado.',
          ],
        };
      case 'terminar':
        return {
          globos: [
            { texto: 'Cuando vayas al súper:', numerada: true, items: ['Toca cada cosa al meterla al carrito', 'Toca "Terminar compra"'] },
            'Lo que marcaste pasa a tu despensa con la fecha de hoy. Después puedes ponerle su caducidad.',
          ],
          opciones: [IR_DESPENSA],
        };
      default:
        return NO_ENTENDI;
    }
  },
};

const cocina: Tema = {
  titulo: 'Ayuda en la cocina',
  saludo: '¿No sabes qué cocinar?',
  bienvenida: () => ['Te ayudo a decidir qué cocinar con lo que ya tienes.', '¿Por dónde empezamos?'],
  menu: [
    { id: 'primero', etiqueta: '¿Qué uso primero?', icono: 'reloj' },
    { id: 'idea', etiqueta: 'Dame una idea rápida', icono: 'chispas' },
    { id: 'como', etiqueta: '¿Cómo funcionan las recetas?', icono: 'olla' },
  ],
  responder: (opcion, ctx) => {
    switch (opcion) {
      case 'primero': {
        const lista = porCaducar(ctx);
        if (lista.length === 0) return { globos: ['Nada está por caducar, así que cocina lo que se te antoje.'] };
        return {
          globos: [
            { texto: 'Usa primero esto, que caduca pronto:', items: lista.map(conEstado) },
            'Si quieres, te doy una idea con estos ingredientes.',
          ],
        };
      }
      case 'idea': {
        if (ctx.productos.length === 0) return SIN_PRODUCTOS;
        const utiles = ctx.productos.filter((p) => !estaCaducado(p)).sort(ordenarPorCaducidad);
        if (utiles.length === 0) {
          return {
            globos: [
              'Todo lo que tienes registrado ya caducó, así que no te propongo nada con eso.',
              'Revísalo y repón lo que haga falta; con tu despensa al día te salen recetas en "¿Qué cocino?".',
            ],
            opciones: [IR_CADUCADOS, IR_COCINA],
          };
        }
        const urgentes = porCaducar(ctx);
        const destacados = (urgentes.length > 0 ? urgentes : utiles).slice(0, 5);
        return {
          globos: [
            urgentes.length > 0
              ? { texto: 'Yo cocinaría con esto, que caduca pronto:', items: destacados.map(conEstado) }
              : { texto: 'Nada caduca pronto, así que empieza por lo que tienes más cerca de su fecha:', items: destacados.map(conEstado) },
            'Las recetas las armamos en "¿Qué cocino?": ahí toca "Sugerir recetas" y salen platillos con tu despensa, empezando por eso.',
          ],
          opciones: [IR_COCINA],
        };
      }
      case 'como':
        return {
          globos: [
            'En "¿Qué cocino?" toca "Sugerir recetas" y te propongo platillos con lo que hay en tu despensa, empezando por lo que caduca pronto.',
            'Las arma una inteligencia artificial con tu inventario, así que cada vez pueden salir distintas.',
          ],
          opciones: [IR_COCINA],
        };
      default:
        return NO_ENTENDI;
    }
  },
};

const soporte: Tema = {
  titulo: 'Soporte',
  saludo: '¿Necesitas ayuda? Soy tu soporte',
  bienvenida: () => ['Aquí te ayudo con tu hogar y con cualquier problema de la app.', '¿Qué necesitas?'],
  menu: [
    { id: 'invitar', etiqueta: '¿Cómo invito a mi familia?', icono: 'persona' },
    { id: 'codigo', etiqueta: '¿Cuál es mi código de hogar?', icono: 'llave' },
    { id: 'clave', etiqueta: 'Olvidé la contraseña', icono: 'candado' },
    { id: 'datos', etiqueta: '¿Dónde se guardan mis datos?', icono: 'escudo' },
    { id: 'salir', etiqueta: '¿Cómo cierro sesión?', icono: 'salir' },
    { id: 'problema', etiqueta: 'Reportar un problema', icono: 'alerta' },
  ],
  responder: (opcion, ctx) => {
    switch (opcion) {
      case 'invitar':
        return {
          globos: [
            {
              texto: 'Compárteles estos dos datos:',
              items: [{ texto: 'Código del hogar', detalle: ctx.hogar.codigo }, { texto: 'Contraseña del hogar', detalle: 'la que creaste' }],
            },
            'En la pantalla de bienvenida eligen "Me invitaron: unirme con un código" y escriben su nombre.',
          ],
        };
      case 'codigo':
        return { globos: [`El código de ${ctx.hogar.nombre} es ${ctx.hogar.codigo}.`, 'Siempre lo puedes ver aquí, en tu perfil.'] };
      case 'clave':
        return {
          globos: [
            'Por seguridad no puedo mostrarte la contraseña.',
            'Pídesela a quien creó el hogar. Pronto podrás recuperarla desde la app.',
          ],
        };
      case 'datos':
        return {
          globos: [
            'Por ahora tus productos y tu lista se guardan solo en este dispositivo.',
            'Cuando la app se conecte a la nube, toda tu familia verá lo mismo desde su celular.',
          ],
        };
      case 'salir':
        return { globos: ['Baja hasta el final de tu perfil y toca "Cerrar sesión".', 'Para volver a entrar necesitarás el código y la contraseña del hogar.'] };
      case 'problema':
        return {
          globos: [
            'Lamento que algo no funcione bien.',
            'Por ahora repórtalo al equipo DevCore, que desarrolla Mi Despensa. Cuéntales qué hiciste y qué pasó.',
          ],
        };
      default:
        return NO_ENTENDI;
    }
  },
};

export const TEMAS: Record<TemaId, Tema> = { general, despensa, lista, cocina, soporte };

/** El tema que corresponde a la pantalla actual. */
export function temaDeRuta(pathname: string): TemaId {
  if (pathname.startsWith('/inventario') || pathname.startsWith('/producto')) return 'despensa';
  if (pathname.startsWith('/faltantes')) return 'lista';
  if (pathname.startsWith('/cocina')) return 'cocina';
  if (pathname.startsWith('/perfil')) return 'soporte';
  return 'general';
}
