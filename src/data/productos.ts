import type { Categoria, Ubicacion, Unidad } from './catalogo';

// Catálogo de comida común en una casa mexicana, para registrar compras sin
// escribir todo. Solo comida y bebida: la app no lleva productos de limpieza
// ni de higiene.
// Dos tipos:
//   empacado  tiene presentaciones (Coca-Cola 600 ml, 2 L, lata…); se elige
//             una y cuántas.
//   suelto    se cuenta o se pesa (fruta, verdura, carne, tortillas); se
//             pregunta cuánto, con un ejemplo de equivalencia pieza ↔ kg.
// Las marcas son las comunes en supermercados de México. Los días de
// caducidad son aproximados, sin abrir.

export type Presentacion = {
  id: string;
  nombre: string;
  /** Descripción clara de la presentación: envase y contenido. */
  detalle: string;
  unidad: Unidad;
};

type Base = {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: Categoria;
  ubicacion: Ubicacion;
  dias: number | null;
  /** Otras formas de buscarlo (sin acentos, en minúsculas). */
  alias?: string[];
};

export type Empacado = Base & { tipo: 'empacado'; presentaciones: Presentacion[] };

export type Suelto = Base & {
  tipo: 'suelto';
  /** Cómo se cuenta por defecto. */
  modo: 'pieza' | 'kg';
  /** Peso aproximado de una pieza; null si solo se vende por peso. */
  gramosPorPieza: number | null;
  plural: string;
};

export type ProductoCatalogo = Empacado | Suelto;

const p = (id: string, nombre: string, detalle: string, unidad: Unidad = 'pieza'): Presentacion => ({ id, nombre, detalle, unidad });

/** Producto empacado con sus presentaciones. */
const e = (
  id: string, nombre: string, descripcion: string, categoria: Categoria, ubicacion: Ubicacion, dias: number | null,
  alias: string[], presentaciones: Presentacion[],
): Empacado => ({ tipo: 'empacado', id, nombre, descripcion, categoria, ubicacion, dias, alias, presentaciones });

/** Producto suelto: se cuenta o se pesa. gramosPorPieza null = solo por peso. */
const s = (
  id: string, nombre: string, plural: string, descripcion: string, categoria: Categoria, ubicacion: Ubicacion,
  dias: number | null, modo: 'pieza' | 'kg', gramosPorPieza: number | null, alias: string[] = [],
): Suelto => ({ tipo: 'suelto', id, nombre, plural, descripcion, categoria, ubicacion, dias, modo, gramosPorPieza, alias });

export const CATALOGO: ProductoCatalogo[] = [
  // ——— Frutas ———
  s('platano', 'Plátano', 'plátanos', 'Plátano tabasco', 'Frutas', 'Frutero', 5, 'pieza', 150, ['platano', 'banana']),
  s('platano-macho', 'Plátano macho', 'plátanos machos', 'Para freír o cocer', 'Frutas', 'Frutero', 7, 'pieza', 300, ['platano macho']),
  s('manzana', 'Manzana', 'manzanas', 'Roja, golden o verde', 'Frutas', 'Frutero', 14, 'pieza', 180),
  s('naranja', 'Naranja', 'naranjas', 'Naranja para jugo', 'Frutas', 'Frutero', 14, 'kg', 220),
  s('mandarina', 'Mandarina', 'mandarinas', 'Mandarina', 'Frutas', 'Frutero', 10, 'kg', 120),
  s('toronja', 'Toronja', 'toronjas', 'Toronja', 'Frutas', 'Frutero', 14, 'pieza', 350),
  s('limon', 'Limón', 'limones', 'Limón verde sin semilla', 'Frutas', 'Refrigerador', 14, 'kg', 45, ['limon']),
  s('aguacate', 'Aguacate', 'aguacates', 'Aguacate Hass', 'Frutas', 'Frutero', 4, 'pieza', 200),
  s('mango', 'Mango', 'mangos', 'Ataulfo o manila', 'Frutas', 'Frutero', 5, 'pieza', 300),
  s('papaya', 'Papaya', 'papayas', 'Papaya maradol', 'Frutas', 'Frutero', 5, 'pieza', 1500),
  s('pina', 'Piña', 'piñas', 'Piña miel', 'Frutas', 'Frutero', 5, 'pieza', 1800, ['pina']),
  s('sandia', 'Sandía', 'sandías', 'Entera o en mitad', 'Frutas', 'Frutero', 7, 'pieza', 6000, ['sandia']),
  s('melon', 'Melón', 'melones', 'Melón chino', 'Frutas', 'Frutero', 6, 'pieza', 1500, ['melon']),
  s('uva', 'Uvas', 'uvas', 'Uva verde o roja sin semilla', 'Frutas', 'Refrigerador', 7, 'kg', null, ['uva']),
  s('fresa', 'Fresas', 'fresas', 'Fresa fresca', 'Frutas', 'Refrigerador', 4, 'kg', null, ['fresa']),
  s('pera', 'Pera', 'peras', 'Pera de anjou o bosc', 'Frutas', 'Frutero', 7, 'pieza', 180),
  s('guayaba', 'Guayaba', 'guayabas', 'Guayaba', 'Frutas', 'Frutero', 5, 'kg', 80),
  s('durazno', 'Durazno', 'duraznos', 'Durazno amarillo', 'Frutas', 'Frutero', 5, 'kg', 150),
  s('kiwi', 'Kiwi', 'kiwis', 'Kiwi', 'Frutas', 'Frutero', 10, 'pieza', 80),
  s('jicama', 'Jícama', 'jícamas', 'Jícama', 'Frutas', 'Refrigerador', 14, 'pieza', 600, ['jicama']),
  s('tuna', 'Tuna', 'tunas', 'Tuna verde o roja', 'Frutas', 'Refrigerador', 7, 'kg', 100),

  // ——— Verduras ———
  s('jitomate', 'Jitomate', 'jitomates', 'Jitomate saladet o bola', 'Verduras', 'Refrigerador', 7, 'kg', 120, ['tomate rojo']),
  s('tomate-verde', 'Tomate verde', 'tomates verdes', 'Tomatillo para salsa verde', 'Verduras', 'Refrigerador', 10, 'kg', 40, ['tomatillo', 'tomate']),
  s('cebolla', 'Cebolla', 'cebollas', 'Cebolla blanca o morada', 'Verduras', 'Alacena', 21, 'pieza', 220),
  s('ajo', 'Ajo', 'cabezas de ajo', 'Cabeza de ajo', 'Verduras', 'Alacena', 60, 'pieza', 50),
  s('papa', 'Papa', 'papas', 'Papa blanca', 'Verduras', 'Alacena', 21, 'kg', 170),
  s('zanahoria', 'Zanahoria', 'zanahorias', 'Zanahoria', 'Verduras', 'Refrigerador', 14, 'kg', 90),
  s('chile-serrano', 'Chile serrano', 'chiles serranos', 'Chile verde serrano', 'Verduras', 'Refrigerador', 10, 'kg', 8, ['serrano', 'chile verde']),
  s('chile-jalapeno', 'Chile jalapeño', 'chiles jalapeños', 'Chile jalapeño fresco', 'Verduras', 'Refrigerador', 10, 'kg', 25, ['jalapeno']),
  s('chile-poblano', 'Chile poblano', 'chiles poblanos', 'Para rajas o rellenos', 'Verduras', 'Refrigerador', 7, 'pieza', 120, ['poblano']),
  s('pimiento', 'Pimiento morrón', 'pimientos', 'Rojo, verde o amarillo', 'Verduras', 'Refrigerador', 10, 'pieza', 180, ['morron']),
  s('lechuga', 'Lechuga', 'lechugas', 'Romana u orejona', 'Verduras', 'Refrigerador', 6, 'pieza', 500),
  s('calabacita', 'Calabacita', 'calabacitas', 'Calabacita italiana', 'Verduras', 'Refrigerador', 7, 'kg', 200, ['calabaza']),
  s('chayote', 'Chayote', 'chayotes', 'Chayote', 'Verduras', 'Refrigerador', 14, 'pieza', 300),
  s('pepino', 'Pepino', 'pepinos', 'Pepino', 'Verduras', 'Refrigerador', 7, 'pieza', 300),
  s('brocoli', 'Brócoli', 'brócolis', 'Brócoli', 'Verduras', 'Refrigerador', 6, 'pieza', 400, ['brocoli']),
  s('coliflor', 'Coliflor', 'coliflores', 'Coliflor', 'Verduras', 'Refrigerador', 7, 'pieza', 700),
  s('ejote', 'Ejote', 'ejotes', 'Ejote', 'Verduras', 'Refrigerador', 5, 'kg', null),
  s('elote', 'Elote', 'elotes', 'Elote tierno', 'Verduras', 'Refrigerador', 4, 'pieza', 300, ['mazorca']),
  s('nopal', 'Nopales', 'nopales', 'Pencas o picados', 'Verduras', 'Refrigerador', 5, 'pieza', 80, ['nopal']),
  s('champinon', 'Champiñones', 'champiñones', 'Champiñón blanco', 'Verduras', 'Refrigerador', 5, 'kg', null, ['champinones', 'hongos']),
  s('rabano', 'Rábanos', 'rábanos', 'Manojo de rábanos', 'Verduras', 'Refrigerador', 7, 'pieza', 20, ['rabano']),
  s('betabel', 'Betabel', 'betabeles', 'Betabel', 'Verduras', 'Refrigerador', 14, 'pieza', 200),
  e('hierbas', 'Hierbas frescas', 'Cilantro, perejil, epazote y más', 'Verduras', 'Refrigerador', 7, ['cilantro', 'perejil', 'epazote', 'hierbabuena', 'espinaca', 'acelga'], [
    p('hi-cilantro', 'Cilantro', 'Manojo', 'manojo'),
    p('hi-perejil', 'Perejil', 'Manojo', 'manojo'),
    p('hi-epazote', 'Epazote', 'Manojo', 'manojo'),
    p('hi-hierbabuena', 'Hierbabuena', 'Manojo', 'manojo'),
    p('hi-espinaca', 'Espinaca', 'Manojo o bolsa', 'manojo'),
    p('hi-acelga', 'Acelga', 'Manojo', 'manojo'),
    p('hi-cebollin', 'Cebollín', 'Manojo de cebolla cambray', 'manojo'),
  ]),
  e('ensalada', 'Ensalada en bolsa', 'Hojas lavadas listas para servir', 'Verduras', 'Refrigerador', 5, ['mix', 'ensalada'], [
    p('en-mix', 'Mezcla de lechugas 300 g', 'Bolsa de hojas lavadas · 300 g', 'paquete'),
    p('en-espinaca', 'Espinaca baby 200 g', 'Bolsa · 200 g', 'paquete'),
  ]),

  // ——— Carnes, pollo y pescado ———
  s('pollo', 'Pechuga de pollo', 'pechugas', 'Pechuga sin hueso o con hueso', 'Carnes y pescado', 'Refrigerador', 3, 'kg', 300, ['pollo', 'pechuga']),
  s('pierna-pollo', 'Pierna y muslo de pollo', 'piezas', 'Pierna con muslo', 'Carnes y pescado', 'Refrigerador', 3, 'kg', 250, ['muslo', 'pierna', 'pollo']),
  s('pollo-entero', 'Pollo entero', 'pollos', 'Pollo entero o en piezas', 'Carnes y pescado', 'Refrigerador', 3, 'pieza', 1800, ['pollo']),
  s('alitas', 'Alitas de pollo', 'alitas', 'Alitas', 'Carnes y pescado', 'Refrigerador', 3, 'kg', null, ['alas']),
  s('carne-molida', 'Carne molida', 'carne molida', 'De res o mixta', 'Carnes y pescado', 'Refrigerador', 2, 'kg', null, ['molida', 'res']),
  s('bistec', 'Bistec de res', 'bisteces', 'Bistec delgado', 'Carnes y pescado', 'Refrigerador', 3, 'kg', 120, ['bistec', 'carne']),
  s('arrachera', 'Arrachera', 'arracheras', 'Arrachera marinada', 'Carnes y pescado', 'Refrigerador', 3, 'kg', null),
  s('carne-guisar', 'Carne para guisar', 'carne', 'Res o cerdo en trozos', 'Carnes y pescado', 'Refrigerador', 3, 'kg', null, ['cocido', 'falda', 'retazo']),
  s('chuleta', 'Chuleta de cerdo', 'chuletas', 'Chuleta ahumada o natural', 'Carnes y pescado', 'Refrigerador', 3, 'kg', 180, ['cerdo', 'puerco']),
  s('costilla', 'Costilla de cerdo', 'costillas', 'Costilla', 'Carnes y pescado', 'Refrigerador', 3, 'kg', null),
  s('pastor', 'Carne al pastor', 'carne al pastor', 'Cerdo adobado', 'Carnes y pescado', 'Refrigerador', 3, 'kg', null),
  s('pescado', 'Filete de pescado', 'filetes', 'Tilapia o basa', 'Carnes y pescado', 'Refrigerador', 2, 'kg', 150, ['tilapia', 'basa', 'pescado']),
  s('camaron', 'Camarón', 'camarones', 'Camarón crudo o cocido', 'Carnes y pescado', 'Congelador', 90, 'kg', null, ['camaron']),
  s('chicharron', 'Chicharrón', 'chicharrón', 'Chicharrón de cerdo', 'Carnes y pescado', 'Alacena', 7, 'kg', null),
  e('salchichoneria', 'Salchichonería', 'Salchicha, chorizo, tocino y más', 'Carnes y pescado', 'Refrigerador', 14, ['salchicha', 'chorizo', 'tocino', 'fud', 'san rafael', 'longaniza', 'salami'], [
    p('sa-salchicha-fud', 'Salchicha de pavo FUD 500 g', 'Paquete · 500 g', 'paquete'),
    p('sa-salchicha-viena', 'Salchicha viena San Rafael 500 g', 'Paquete · 500 g', 'paquete'),
    p('sa-chorizo', 'Chorizo de cerdo 250 g', 'Paquete · 250 g', 'paquete'),
    p('sa-longaniza', 'Longaniza 500 g', 'Paquete · 500 g', 'paquete'),
    p('sa-tocino', 'Tocino FUD 250 g', 'Paquete rebanado · 250 g', 'paquete'),
    p('sa-salami', 'Salami 250 g', 'Paquete rebanado · 250 g', 'paquete'),
  ]),
  s('jamon', 'Jamón rebanado', 'rebanadas', 'De pavo o de pierna, por peso', 'Carnes y pescado', 'Refrigerador', 7, 'kg', 20, ['jamon', 'pavo']),

  // ——— Lácteos y huevo ———
  e('leche', 'Leche', 'Leche de vaca', 'Lácteos y huevo', 'Refrigerador', 10, ['lala', 'alpura', 'santa clara', 'deslactosada'], [
    p('le-lala-ent', 'Leche Lala Entera 1 L', 'Entera · cartón de 1 litro'),
    p('le-lala-desl', 'Leche Lala Deslactosada 1 L', 'Sin lactosa · cartón de 1 litro'),
    p('le-lala-light', 'Leche Lala Light 1 L', 'Baja en grasa · cartón de 1 litro'),
    p('le-alpura-ent', 'Leche Alpura Clásica 1 L', 'Entera · cartón de 1 litro'),
    p('le-sc', 'Leche Santa Clara Entera 1 L', 'Entera · botella de 1 litro'),
    p('le-lala-6', 'Leche Lala Entera 6 pack', 'Paquete de 6 cartones de 1 litro', 'paquete'),
  ]),
  e('leche-vegetal', 'Bebida vegetal', 'Leche de almendra, soya, avena', 'Lácteos y huevo', 'Refrigerador', 10, ['almendra', 'soya', 'avena', 'silk', 'ades'], [
    p('lv-almendra', 'Bebida de almendra Silk 946 ml', 'Cartón · 946 ml'),
    p('lv-soya', 'Bebida de soya Ades 946 ml', 'Cartón · 946 ml'),
    p('lv-avena', 'Bebida de avena 1 L', 'Cartón · 1 litro'),
  ]),
  e('leche-lata', 'Leche condensada y evaporada', 'Para postres y café', 'Lácteos y huevo', 'Alacena', 365, ['condensada', 'evaporada', 'la lechera', 'carnation', 'media crema'], [
    p('ll-condensada', 'Leche condensada La Lechera 375 g', 'Lata · 375 g', 'lata'),
    p('ll-evaporada', 'Leche evaporada Carnation 360 g', 'Lata · 360 g', 'lata'),
    p('ll-media-crema', 'Media crema Nestlé 225 g', 'Lata o cartón · 225 g', 'lata'),
  ]),
  e('leche-polvo', 'Leche en polvo', 'Leche en polvo', 'Lácteos y huevo', 'Alacena', 365, ['nido', 'polvo'], [
    p('lp-nido-800', 'Leche Nido 800 g', 'Lata · 800 g', 'lata'),
    p('lp-nido-360', 'Leche Nido 360 g', 'Bolsa · 360 g', 'paquete'),
  ]),
  e('huevo', 'Huevo', 'Huevo blanco o rojo', 'Lácteos y huevo', 'Refrigerador', 21, ['huevos', 'bachoco', 'san juan'], [
    p('hu-12', 'Huevo blanco 12 piezas', 'Cartón de 1 docena', 'docena'),
    p('hu-18', 'Huevo blanco 18 piezas', 'Cartón de 18 huevos', 'paquete'),
    p('hu-30', 'Huevo blanco 30 piezas', 'Tapa de 30 huevos', 'paquete'),
    p('hu-rojo-12', 'Huevo rojo 12 piezas', 'Cartón de 1 docena', 'docena'),
  ]),
  e('yogur', 'Yogur', 'Yogur natural o de sabor', 'Lácteos y huevo', 'Refrigerador', 21, ['yoghurt', 'danone', 'yoplait', 'griego'], [
    p('yo-dan-beb', 'Yogur bebible Danone 250 g', 'Botella individual · fresa'),
    p('yo-yop-1', 'Yogur Yoplait natural 1 kg', 'Bote familiar · natural sin azúcar'),
    p('yo-lala-griego', 'Yogur griego Lala 900 g', 'Bote · estilo griego natural'),
    p('yo-dan-8', 'Yogur Danone 8 vasitos', 'Paquete de 8 · sabores', 'paquete'),
  ]),
  e('queso', 'Queso', 'Panela, Oaxaca, manchego, fresco y más', 'Lácteos y huevo', 'Refrigerador', 21, ['panela', 'oaxaca', 'manchego', 'fresco', 'cotija', 'amarillo', 'chihuahua', 'asadero'], [
    p('qu-panela-400', 'Queso panela 400 g', 'Pieza empacada · 400 g'),
    p('qu-oaxaca-400', 'Queso Oaxaca 400 g', 'Bola empacada · 400 g'),
    p('qu-fresco-400', 'Queso fresco 400 g', 'Pieza · 400 g'),
    p('qu-manchego', 'Queso manchego 400 g', 'Barra o rebanado · 400 g', 'paquete'),
    p('qu-chihuahua', 'Queso Chihuahua 400 g', 'Barra · 400 g'),
    p('qu-cotija', 'Queso cotija 200 g', 'Pieza para desmoronar · 200 g'),
    p('qu-amarillo', 'Queso amarillo 12 rebanadas', 'Paquete de 12 rebanadas', 'paquete'),
    p('qu-crema', 'Queso crema Philadelphia 190 g', 'Barra · 190 g'),
  ]),
  e('crema', 'Crema y mantequilla', 'Crema, mantequilla, margarina', 'Lácteos y huevo', 'Refrigerador', 21, ['mantequilla', 'margarina', 'crema'], [
    p('cr-lala-450', 'Crema Lala 450 ml', 'Bote de crema ácida · 450 ml'),
    p('cr-lala-200', 'Crema Lala 200 ml', 'Bote chico · 200 ml'),
    p('ma-gloria-90', 'Mantequilla Gloria 90 g', 'Barra · 90 g'),
    p('ma-primavera', 'Margarina Primavera 225 g', 'Bote · 225 g'),
  ]),

  // ——— Panadería y tortillas ———
  s('tortillas', 'Tortillas de maíz', 'tortillas', 'De la tortillería, por kilo', 'Panadería', 'Refrigerador', 5, 'kg', 30, ['tortilla', 'tortilleria']),
  e('tortillas-harina', 'Tortillas de harina', 'Paquete de tortillas de harina', 'Panadería', 'Refrigerador', 14, ['harina', 'tia rosa', 'milpa real'], [
    p('th-tiarosa', 'Tortillas de harina Tía Rosa 10 piezas', 'Paquete de 10', 'paquete'),
    p('th-milpa', 'Tortillas de harina Milpa Real 20 piezas', 'Paquete de 20', 'paquete'),
  ]),
  e('tostadas', 'Tostadas', 'Tostadas horneadas o fritas', 'Panadería', 'Alacena', 60, ['charras', 'sanissimo', 'tostada'], [
    p('to-charras', 'Tostadas Charras 360 g', 'Paquete · 360 g', 'paquete'),
    p('to-sanissimo', 'Salmas Sanissimo 110 g', 'Paquete horneado · 110 g', 'paquete'),
  ]),
  s('bolillo', 'Bolillo y telera', 'bolillos', 'De la panadería', 'Panadería', 'Alacena', 2, 'pieza', 70, ['telera', 'birote']),
  s('pan-dulce', 'Pan dulce', 'piezas de pan', 'Conchas, cuernitos, orejas…', 'Panadería', 'Alacena', 3, 'pieza', 80, ['concha', 'cuernito', 'panaderia']),
  e('pan-caja', 'Pan de caja', 'Pan de molde rebanado', 'Panadería', 'Alacena', 7, ['bimbo', 'pan blanco', 'integral', 'medias noches'], [
    p('pa-bimbo-gde', 'Pan Bimbo Blanco grande', 'Bolsa · 680 g', 'paquete'),
    p('pa-bimbo-int', 'Pan Bimbo Integral', 'Bolsa · 620 g', 'paquete'),
    p('pa-bimbo-med', 'Medias Noches Bimbo', 'Bolsa de 8 bollos', 'paquete'),
    p('pa-bimbo-hamb', 'Pan para hamburguesa Bimbo', 'Bolsa de 8 bollos', 'paquete'),
    p('pa-bimbo-hotdog', 'Pan para hot dog Bimbo', 'Bolsa de 8 bollos', 'paquete'),
    p('pa-bimbo-tostado', 'Pan tostado Bimbo', 'Paquete · 210 g', 'paquete'),
  ]),
  e('galletas', 'Galletas', 'Galletas dulces o saladas', 'Panadería', 'Alacena', 120, ['marias', 'gamesa', 'emperador', 'saladitas', 'oreo', 'chokis'], [
    p('ga-marias', 'Galletas Marías Gamesa', 'Paquete de 4 tubos · 680 g', 'paquete'),
    p('ga-emperador', 'Galletas Emperador Chocolate', 'Paquete · 109 g', 'paquete'),
    p('ga-saladitas', 'Galletas Saladitas', 'Caja de 4 paquetes · 548 g', 'paquete'),
    p('ga-oreo', 'Galletas Oreo', 'Paquete · 117 g', 'paquete'),
    p('ga-chokis', 'Galletas Chokis', 'Paquete · 84 g', 'paquete'),
  ]),
  e('pan-empacado', 'Pastelitos', 'Pan dulce empacado', 'Panadería', 'Alacena', 30, ['gansito', 'mantecadas', 'roles', 'marinela', 'bimbo'], [
    p('pe-mantecadas', 'Mantecadas Bimbo 4 piezas', 'Paquete de 4', 'paquete'),
    p('pe-gansito', 'Gansito Marinela', 'Pieza individual'),
    p('pe-roles', 'Roles de canela Bimbo', 'Paquete de 4', 'paquete'),
  ]),

  // ——— Granos, harinas y cereales ———
  e('arroz', 'Arroz', 'Arroz blanco', 'Granos y cereales', 'Alacena', 365, ['verde valle', 'morelos'], [
    p('ar-vv-1', 'Arroz Verde Valle 1 kg', 'Bolsa · 1 kg', 'paquete'),
    p('ar-vv-900', 'Arroz Verde Valle 900 g', 'Bolsa · 900 g', 'paquete'),
    p('ar-morelos', 'Arroz tipo Morelos 1 kg', 'Bolsa de grano grande · 1 kg', 'paquete'),
  ]),
  e('frijol', 'Frijol', 'Frijol en grano o refrito', 'Granos y cereales', 'Alacena', 365, ['frijoles', 'refritos', 'la costena', 'isadora', 'bayo', 'peruano'], [
    p('fr-negro-1', 'Frijol negro Verde Valle 1 kg', 'Bolsa de grano · 1 kg', 'paquete'),
    p('fr-bayo-1', 'Frijol bayo 1 kg', 'Bolsa de grano · 1 kg', 'paquete'),
    p('fr-peruano-1', 'Frijol peruano 1 kg', 'Bolsa de grano · 1 kg', 'paquete'),
    p('fr-refr-lata', 'Frijoles refritos La Costeña 580 g', 'Lata · bayos refritos', 'lata'),
    p('fr-isadora', 'Frijoles Isadora 430 g', 'Bolsa lista para servir · negros refritos', 'paquete'),
  ]),
  e('leguminosas', 'Lenteja, garbanzo y haba', 'Leguminosas secas', 'Granos y cereales', 'Alacena', 365, ['lenteja', 'garbanzo', 'haba', 'alubia'], [
    p('lg-lenteja', 'Lenteja 500 g', 'Bolsa · 500 g', 'paquete'),
    p('lg-garbanzo', 'Garbanzo 500 g', 'Bolsa · 500 g', 'paquete'),
    p('lg-haba', 'Haba seca 500 g', 'Bolsa · 500 g', 'paquete'),
    p('lg-alubia', 'Alubia chica 500 g', 'Bolsa · 500 g', 'paquete'),
  ]),
  e('pasta', 'Pasta y sopa', 'Sopa de pasta seca', 'Granos y cereales', 'Alacena', 365, ['sopa', 'fideo', 'espagueti', 'la moderna', 'codito', 'maruchan', 'macarron'], [
    p('pa-fideo', 'Sopa de fideo La Moderna 200 g', 'Bolsa · 200 g', 'paquete'),
    p('pa-codito', 'Sopa de codito La Moderna 200 g', 'Bolsa · 200 g', 'paquete'),
    p('pa-municion', 'Sopa de munición La Moderna 200 g', 'Bolsa · 200 g', 'paquete'),
    p('pa-espagueti', 'Espagueti La Moderna 200 g', 'Bolsa · 200 g', 'paquete'),
    p('pa-macarron', 'Macarrón La Moderna 200 g', 'Bolsa · 200 g', 'paquete'),
    p('pa-maruchan', 'Sopa instantánea Maruchan', 'Vaso · 64 g'),
  ]),
  e('harina-maiz', 'Harina de maíz', 'Para tortillas, sopes y tamales', 'Granos y cereales', 'Alacena', 180, ['maseca', 'masa', 'minsa'], [
    p('hm-maseca-1', 'Harina de maíz Maseca 1 kg', 'Bolsa · 1 kg', 'paquete'),
    p('hm-maseca-tamal', 'Maseca para tamales 1 kg', 'Bolsa · 1 kg', 'paquete'),
  ]),
  e('harina-trigo', 'Harina de trigo', 'Para hot cakes, pan y capear', 'Granos y cereales', 'Alacena', 270, ['harina', 'selecta', 'hot cakes', 'gamesa'], [
    p('ht-selecta-1', 'Harina de trigo Selecta 1 kg', 'Bolsa · 1 kg', 'paquete'),
    p('ht-hotcakes', 'Harina para hot cakes Gamesa 800 g', 'Caja · 800 g', 'paquete'),
  ]),
  e('cereal', 'Cereal', 'Cereal de caja', 'Granos y cereales', 'Alacena', 270, ['zucaritas', 'corn flakes', 'kelloggs', 'choco krispis', 'nesquik'], [
    p('ce-zuc', "Zucaritas Kellogg's 490 g", 'Caja · 490 g', 'paquete'),
    p('ce-cf', "Corn Flakes Kellogg's 500 g", 'Caja · 500 g', 'paquete'),
    p('ce-choco', "Choco Krispis Kellogg's 490 g", 'Caja · 490 g', 'paquete'),
    p('ce-granola', 'Granola 400 g', 'Bolsa · 400 g', 'paquete'),
  ]),
  e('avena', 'Avena', 'Avena en hojuelas', 'Granos y cereales', 'Alacena', 270, ['quaker', 'avena'], [
    p('av-quaker-900', 'Avena Quaker 900 g', 'Bolsa · 900 g', 'paquete'),
    p('av-quaker-400', 'Avena Quaker 400 g', 'Bolsa · 400 g', 'paquete'),
  ]),
  e('palomitas', 'Palomitas', 'Palomitas de maíz', 'Granos y cereales', 'Alacena', 180, ['act ii', 'palomitas', 'maiz palomero'], [
    p('pm-act2', 'Palomitas Act II mantequilla', 'Caja de 3 sobres para microondas', 'paquete'),
    p('pm-grano', 'Maíz palomero 500 g', 'Bolsa · 500 g', 'paquete'),
  ]),

  // ——— Abarrotes: aceites, azúcar, sal y condimentos ———
  e('aceite', 'Aceite', 'Aceite comestible', 'Abarrotes', 'Alacena', 365, ['nutrioli', '123', 'capullo', 'oliva', 'canola'], [
    p('ac-nutrioli', 'Aceite Nutrioli 946 ml', 'Botella de soya · 946 ml'),
    p('ac-123', 'Aceite 1-2-3 1 L', 'Botella vegetal · 1 litro'),
    p('ac-capullo', 'Aceite Capullo 840 ml', 'Botella de canola · 840 ml'),
    p('ac-oliva', 'Aceite de oliva Carbonell 500 ml', 'Botella extra virgen · 500 ml'),
  ]),
  e('azucar', 'Azúcar', 'Azúcar estándar o refinada', 'Abarrotes', 'Alacena', null, ['azucar', 'zulka', 'splenda', 'endulzante'], [
    p('az-zulka-1', 'Azúcar Zulka 1 kg', 'Bolsa · morena · 1 kg', 'paquete'),
    p('az-ref-2', 'Azúcar refinada 2 kg', 'Bolsa · blanca · 2 kg', 'paquete'),
    p('az-splenda', 'Endulzante Splenda 100 sobres', 'Caja de 100 sobres', 'paquete'),
  ]),
  e('sal', 'Sal', 'Sal de mesa', 'Abarrotes', 'Alacena', null, ['la fina', 'sal'], [
    p('sl-fina-1', 'Sal La Fina 1 kg', 'Bolsa · 1 kg', 'paquete'),
    p('sl-fina-salero', 'Sal La Fina 750 g', 'Salero · 750 g'),
  ]),
  e('consome', 'Consomé y caldos', 'Consomé de pollo o tomate', 'Abarrotes', 'Alacena', 365, ['knorr', 'suiza', 'consome', 'caldo de pollo', 'cubo'], [
    p('co-knorr-pollo', 'Consomé Knorr Suiza 225 g', 'Frasco · sabor pollo', 'frasco'),
    p('co-knorr-tomate', 'Knorr Tomate 225 g', 'Frasco · caldo de tomate', 'frasco'),
    p('co-cubos', 'Consomé en cubos 8 piezas', 'Caja de 8 cubos', 'paquete'),
  ]),
  e('especias', 'Especias', 'Comino, pimienta, orégano, canela…', 'Abarrotes', 'Alacena', 365, ['comino', 'pimienta', 'oregano', 'canela', 'laurel', 'clavo', 'mccormick'], [
    p('es-comino', 'Comino molido McCormick', 'Frasco · 37 g', 'frasco'),
    p('es-pimienta', 'Pimienta negra molida McCormick', 'Frasco · 50 g', 'frasco'),
    p('es-oregano', 'Orégano entero', 'Bolsa · 20 g', 'paquete'),
    p('es-canela', 'Canela en raja', 'Bolsa · 40 g', 'paquete'),
    p('es-laurel', 'Hojas de laurel', 'Bolsa · 10 g', 'paquete'),
    p('es-ajo-polvo', 'Ajo en polvo McCormick', 'Frasco · 60 g', 'frasco'),
  ]),
  e('chiles-secos', 'Chiles secos', 'Guajillo, ancho, de árbol, chipotle seco', 'Abarrotes', 'Alacena', 365, ['guajillo', 'ancho', 'chile de arbol', 'pasilla', 'mulato'], [
    p('cs-guajillo', 'Chile guajillo 100 g', 'Bolsa · 100 g', 'paquete'),
    p('cs-ancho', 'Chile ancho 100 g', 'Bolsa · 100 g', 'paquete'),
    p('cs-arbol', 'Chile de árbol 50 g', 'Bolsa · 50 g', 'paquete'),
    p('cs-pasilla', 'Chile pasilla 100 g', 'Bolsa · 100 g', 'paquete'),
  ]),
  e('salsas', 'Salsas picantes', 'Salsas embotelladas', 'Abarrotes', 'Alacena', 365, ['valentina', 'bufalo', 'tabasco', 'maggi', 'inglesa', 'huichol'], [
    p('sa-valentina', 'Salsa Valentina 370 ml', 'Botella · etiqueta amarilla'),
    p('sa-valentina-negra', 'Salsa Valentina etiqueta negra 370 ml', 'Botella · extra picante'),
    p('sa-bufalo', 'Salsa Búfalo clásica 150 ml', 'Botella'),
    p('sa-huichol', 'Salsa Huichol 190 ml', 'Botella'),
    p('sa-maggi', 'Jugo Maggi 100 ml', 'Botella de sazonador'),
    p('sa-inglesa', 'Salsa inglesa Crosse & Blackwell 145 ml', 'Botella'),
  ]),
  e('salsas-cocinar', 'Salsas para cocinar', 'Salsa verde, roja y puré de tomate', 'Abarrotes', 'Alacena', 365, ['herdez', 'pure de tomate', 'del fuerte', 'salsa verde', 'salsa casera'], [
    p('sc-pure', 'Puré de tomate Del Fuerte 210 g', 'Caja · condimentado', 'paquete'),
    p('sc-herdez-verde', 'Salsa verde Herdez 210 g', 'Frasco', 'frasco'),
    p('sc-herdez-casera', 'Salsa casera Herdez 210 g', 'Frasco', 'frasco'),
    p('sc-pasta', 'Salsa para pasta Prego 680 g', 'Frasco · tradicional', 'frasco'),
  ]),
  e('mole', 'Mole', 'Mole en pasta', 'Abarrotes', 'Alacena', 365, ['dona maria', 'pipian', 'mole'], [
    p('mo-dm-235', 'Mole Doña María 235 g', 'Frasco · poblano', 'frasco'),
    p('mo-dm-pipian', 'Pipián Doña María 235 g', 'Frasco', 'frasco'),
  ]),
  e('aderezos', 'Mayonesa y aderezos', 'Mayonesa, mostaza, cátsup', 'Abarrotes', 'Alacena', 365, ['mayonesa', 'mccormick', 'mostaza', 'catsup', 'ketchup', 'heinz'], [
    p('ad-mayo', 'Mayonesa McCormick 390 g', 'Frasco · con jugo de limones', 'frasco'),
    p('ad-mayo-gde', 'Mayonesa McCormick 725 g', 'Frasco grande', 'frasco'),
    p('ad-mostaza', 'Mostaza McCormick 210 g', 'Botella'),
    p('ad-catsup', 'Cátsup Del Monte 380 g', 'Botella'),
    p('ad-heinz', 'Cátsup Heinz 397 g', 'Botella'),
  ]),
  e('vinagre', 'Vinagre', 'Vinagre blanco o de manzana', 'Abarrotes', 'Alacena', null, ['vinagre', 'clemente jacques'], [
    p('vi-blanco', 'Vinagre blanco 1 L', 'Botella · 1 litro'),
    p('vi-manzana', 'Vinagre de manzana 500 ml', 'Botella · 500 ml'),
  ]),

  // ——— Abarrotes: enlatados y conservas ———
  e('atun', 'Atún', 'Atún en lata', 'Abarrotes', 'Alacena', 730, ['atun', 'dolores', 'tuny'], [
    p('at-dol-agua', 'Atún Dolores en agua 140 g', 'Lata · en agua', 'lata'),
    p('at-dol-aceite', 'Atún Dolores en aceite 140 g', 'Lata · en aceite', 'lata'),
    p('at-tuny-3', 'Atún Tuny 3 latas', 'Paquete de 3 latas en agua', 'paquete'),
  ]),
  e('sardinas', 'Sardinas', 'Sardinas en lata', 'Abarrotes', 'Alacena', 730, ['calmex', 'sardina'], [
    p('sd-calmex', 'Sardinas Calmex en tomate 425 g', 'Lata oval · en salsa de tomate', 'lata'),
  ]),
  e('chiles-lata', 'Chiles en lata', 'Jalapeños, chipotles, rajas', 'Abarrotes', 'Alacena', 730, ['la costena', 'chipotle', 'jalapenos', 'rajas', 'san marcos'], [
    p('cl-jalap', 'Chiles jalapeños La Costeña 220 g', 'Lata · en escabeche', 'lata'),
    p('cl-chipotle', 'Chiles chipotles La Costeña 105 g', 'Lata · adobados', 'lata'),
    p('cl-rajas', 'Rajas de jalapeño La Costeña 220 g', 'Lata', 'lata'),
  ]),
  e('verduras-lata', 'Verduras en lata', 'Elote, chícharo, champiñón', 'Abarrotes', 'Alacena', 730, ['elote', 'chicharo', 'champinones', 'herdez', 'del monte'], [
    p('vl-elote', 'Granos de elote Herdez 400 g', 'Lata', 'lata'),
    p('vl-chicharo', 'Chícharos con zanahoria La Costeña 400 g', 'Lata', 'lata'),
    p('vl-champi', 'Champiñones rebanados Herdez 186 g', 'Lata', 'lata'),
    p('vl-nopal', 'Nopalitos La Costeña 300 g', 'Frasco', 'frasco'),
  ]),
  e('fruta-lata', 'Fruta en almíbar', 'Duraznos, piña, coctel', 'Abarrotes', 'Alacena', 730, ['durazno en almibar', 'coctel de frutas', 'pina en almibar'], [
    p('fl-durazno', 'Duraznos en almíbar 820 g', 'Lata', 'lata'),
    p('fl-coctel', 'Coctel de frutas 820 g', 'Lata', 'lata'),
  ]),
  e('mermelada', 'Mermelada, miel y untables', 'Mermelada, miel, cajeta, crema de cacahuate', 'Abarrotes', 'Alacena', 365, ['mermelada', 'miel', 'cajeta', 'nutella', 'crema de cacahuate', 'carlota'], [
    p('me-fresa', 'Mermelada de fresa McCormick 270 g', 'Frasco', 'frasco'),
    p('me-miel', 'Miel Carlota 300 g', 'Botella'),
    p('me-cajeta', 'Cajeta Coronado 350 g', 'Frasco', 'frasco'),
    p('me-cacahuate', 'Crema de cacahuate 340 g', 'Frasco', 'frasco'),
    p('me-nutella', 'Nutella 350 g', 'Frasco', 'frasco'),
  ]),
  e('postres', 'Gelatina, flan y postres', 'Polvos para postres', 'Abarrotes', 'Alacena', 365, ['gelatina', 'dgari', 'flan', 'pudin'], [
    p('po-gelatina', "Gelatina D'Gari 120 g", 'Sobre · sabores', 'paquete'),
    p('po-flan', 'Flan Royal 2 sobres', 'Caja', 'paquete'),
    p('po-grenetina', 'Grenetina 30 g', 'Sobre', 'paquete'),
  ]),
  e('chocolate', 'Chocolate de mesa y en polvo', 'Para chocolate caliente o leche', 'Abarrotes', 'Alacena', 365, ['abuelita', 'ibarra', 'nesquik', 'chocomilk', 'cocoa'], [
    p('ch-abuelita', 'Chocolate Abuelita 6 tablillas', 'Caja · 540 g', 'paquete'),
    p('ch-ibarra', 'Chocolate Ibarra 6 tablillas', 'Caja · 540 g', 'paquete'),
    p('ch-nesquik', 'Nesquik 357 g', 'Bote de chocolate en polvo'),
    p('ch-chocomilk', 'Chocomilk 400 g', 'Bote'),
  ]),
  e('botanas', 'Botanas', 'Papas, frituras, cacahuates', 'Abarrotes', 'Alacena', 90, ['sabritas', 'doritos', 'cheetos', 'cacahuates', 'japones', 'takis', 'ruffles'], [
    p('bo-sabritas', 'Papas Sabritas sal 160 g', 'Bolsa familiar', 'paquete'),
    p('bo-doritos', 'Doritos Nacho 160 g', 'Bolsa familiar', 'paquete'),
    p('bo-takis', 'Takis Fuego 190 g', 'Bolsa', 'paquete'),
    p('bo-cacahuate', 'Cacahuates japoneses 200 g', 'Bolsa', 'paquete'),
    p('bo-totopos', 'Totopos 400 g', 'Bolsa', 'paquete'),
  ]),
  e('dulces', 'Dulces y semillas', 'Dulces, chocolates, semillas', 'Abarrotes', 'Alacena', 180, ['dulces', 'mazapan', 'chocolate', 'pepitas', 'nuez', 'almendras'], [
    p('du-mazapan', 'Mazapán De la Rosa 12 piezas', 'Caja', 'paquete'),
    p('du-pepitas', 'Pepitas 100 g', 'Bolsa', 'paquete'),
    p('du-nuez', 'Nuez pecana 100 g', 'Bolsa', 'paquete'),
    p('du-almendra', 'Almendras 100 g', 'Bolsa', 'paquete'),
  ]),

  // ——— Bebidas ———
  e('coca-cola', 'Coca-Cola', 'Refresco de cola', 'Bebidas', 'Alacena', 180, ['coca', 'refresco', 'cocacola'], [
    p('cc-600', 'Coca-Cola Original 600 ml', 'Botella de plástico individual · 600 ml'),
    p('cc-355', 'Coca-Cola Original lata 355 ml', 'Lata individual · 355 ml', 'lata'),
    p('cc-500v', 'Coca-Cola Original vidrio 500 ml', 'Botella de vidrio retornable · 500 ml'),
    p('cc-2l', 'Coca-Cola Original 2 L', 'Botella familiar de plástico · 2 litros'),
    p('cc-3l', 'Coca-Cola Original 3 L', 'Botella familiar grande · 3 litros'),
    p('cc-sa-600', 'Coca-Cola Sin Azúcar 600 ml', 'Sin azúcar ni calorías · botella 600 ml'),
    p('cc-sa-2l', 'Coca-Cola Sin Azúcar 2 L', 'Sin azúcar ni calorías · botella 2 litros'),
    p('cc-light-600', 'Coca-Cola Light 600 ml', 'Ligera, endulzada sin azúcar · botella 600 ml'),
    p('cc-8', 'Coca-Cola Original 8 latas', 'Paquete de 8 latas de 355 ml', 'paquete'),
  ]),
  e('refrescos', 'Otros refrescos', 'Pepsi, Sprite, Fanta, Jarritos, Sidral…', 'Bebidas', 'Alacena', 180, ['pepsi', 'sprite', 'fanta', 'jarritos', 'sidral', 'manzanita', 'squirt', 'refresco', '7up'], [
    p('re-pepsi-2', 'Pepsi 2 L', 'Botella familiar · 2 litros'),
    p('re-pepsi-600', 'Pepsi 600 ml', 'Botella individual · 600 ml'),
    p('re-sprite-2', 'Sprite 2 L', 'Botella familiar · 2 litros'),
    p('re-fanta-2', 'Fanta naranja 2 L', 'Botella familiar · 2 litros'),
    p('re-jarritos', 'Jarritos tamarindo 600 ml', 'Botella individual · sabores'),
    p('re-sidral', 'Sidral Mundet 2 L', 'Botella familiar · manzana'),
    p('re-squirt', 'Squirt 2 L', 'Botella familiar · toronja'),
  ]),
  e('agua', 'Agua natural', 'Agua purificada embotellada', 'Bebidas', 'Alacena', 365, ['ciel', 'bonafont', 'epura', 'garrafon'], [
    p('ag-ciel-1', 'Agua Ciel 1 L', 'Botella individual · 1 litro'),
    p('ag-bona-1.5', 'Agua Bonafont 1.5 L', 'Botella · 1.5 litros'),
    p('ag-epura-600', 'Agua Epura 600 ml', 'Botella individual · 600 ml'),
    p('ag-ciel-12', 'Agua Ciel 12 botellas 600 ml', 'Paquete de 12 botellas de 600 ml', 'paquete'),
    p('ag-garrafon', 'Garrafón de agua 20 L', 'Garrafón retornable · 20 litros'),
  ]),
  e('agua-mineral', 'Agua mineral', 'Agua mineral con gas', 'Bebidas', 'Alacena', 365, ['topo chico', 'penafiel', 'mineral'], [
    p('am-topochico', 'Topo Chico 600 ml', 'Botella de vidrio · 600 ml'),
    p('am-penafiel-2', 'Peñafiel mineral 2 L', 'Botella familiar · 2 litros'),
  ]),
  e('jugo', 'Jugo', 'Jugo o néctar de fruta', 'Bebidas', 'Refrigerador', 180, ['jumex', 'del valle', 'nectar', 'boing'], [
    p('ju-jumex-1', 'Jugo Jumex Mango 1 L', 'Néctar de mango · cartón 1 litro'),
    p('ju-dv-1', 'Jugo Del Valle Naranja 1 L', 'Jugo de naranja · cartón 1 litro'),
    p('ju-jumex-335', 'Jugo Jumex lata 335 ml', 'Néctar en lata individual · 335 ml', 'lata'),
    p('ju-boing', 'Boing Mango 500 ml', 'Bebida de fruta en Tetra Pak · 500 ml'),
  ]),
  e('cafe', 'Café', 'Café soluble o molido', 'Bebidas', 'Alacena', 365, ['cafe', 'nescafe', 'legal', 'punta del cielo', 'cafe de olla'], [
    p('ca-nes-120', 'Nescafé Clásico 120 g', 'Frasco de café soluble · 120 g', 'frasco'),
    p('ca-nes-225', 'Nescafé Clásico 225 g', 'Frasco grande · 225 g', 'frasco'),
    p('ca-legal', 'Café Legal 200 g', 'Bolsa de café soluble · 200 g', 'paquete'),
    p('ca-molido', 'Café molido 400 g', 'Bolsa · para cafetera', 'paquete'),
  ]),
  e('te', 'Té', 'Té en sobres', 'Bebidas', 'Alacena', 365, ['manzanilla', 'lipton', 'te verde', 'hierbabuena'], [
    p('te-manzanilla', 'Té de manzanilla 25 sobres', 'Caja de 25 sobres', 'paquete'),
    p('te-lipton', 'Té Lipton 25 sobres', 'Caja · té negro', 'paquete'),
    p('te-verde', 'Té verde 25 sobres', 'Caja', 'paquete'),
  ]),
  e('cerveza', 'Cerveza', 'Cerveza', 'Bebidas', 'Refrigerador', 180, ['corona', 'modelo', 'victoria', 'tecate', 'indio', 'xx'], [
    p('ce-corona-6', 'Corona 6 botellas 355 ml', 'Six de botellas de vidrio · 355 ml c/u', 'paquete'),
    p('ce-modelo-6', 'Modelo Especial 6 latas 355 ml', 'Six de latas · 355 ml c/u', 'paquete'),
    p('ce-victoria-12', 'Victoria 12 latas 355 ml', 'Paquete de 12 latas · 355 ml c/u', 'paquete'),
    p('ce-tecate-lata', 'Tecate lata 473 ml', 'Lata individual · 473 ml', 'lata'),
  ]),
  e('bebida-polvo', 'Agua de sabor en polvo', 'Tang, Zuko y concentrados', 'Bebidas', 'Alacena', 365, ['tang', 'zuko', 'jamaica', 'horchata', 'agua de sabor'], [
    p('bp-tang', 'Tang naranja', 'Sobre para 1 litro', 'paquete'),
    p('bp-jamaica', 'Flor de jamaica 100 g', 'Bolsa · para agua de jamaica', 'paquete'),
    p('bp-horchata', 'Concentrado de horchata 700 ml', 'Botella'),
  ]),

  // ——— Congelados ———
  e('congelados', 'Congelados', 'Verduras, papas y más', 'Congelados', 'Congelador', 180, ['congelado', 'mccain', 'nuggets', 'pizza'], [
    p('cg-verduras', 'Verduras mixtas congeladas 500 g', 'Bolsa · 500 g', 'paquete'),
    p('cg-papas', 'Papas a la francesa 1 kg', 'Bolsa · 1 kg', 'paquete'),
    p('cg-nuggets', 'Nuggets de pollo 500 g', 'Bolsa · 500 g', 'paquete'),
    p('cg-pizza', 'Pizza congelada', 'Caja · 1 pizza mediana', 'paquete'),
  ]),
  e('helado', 'Helado', 'Helado o paletas', 'Congelados', 'Congelador', 180, ['holanda', 'paletas', 'nieve'], [
    p('he-holanda-1', 'Helado Holanda 1.5 L', 'Bote · sabores', 'pieza'),
    p('he-paletas', 'Paletas heladas 6 piezas', 'Caja', 'paquete'),
  ]),
];

/**
 * El producto del catálogo que corresponde a un nombre ya registrado en
 * casa, y la presentación exacta si es una ("Coca-Cola Original 600 ml").
 */
export function enCatalogo(nombre: string, lista: ProductoCatalogo[] = CATALOGO): { producto: ProductoCatalogo; presentacion: string | null } | null {
  const n = normalizar(nombre);
  for (const x of lista) {
    if (x.tipo === 'empacado') {
      const pr = x.presentaciones.find((y) => normalizar(y.nombre) === n);
      if (pr) return { producto: x, presentacion: pr.id };
    }
    if (normalizar(x.nombre) === n || x.alias?.includes(n)) return { producto: x, presentacion: null };
  }
  return null;
}

/** Quita acentos y pasa a minúsculas para buscar. */
export const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Busca en el catálogo por nombre, alias, descripción o presentación. */
export function buscarEnCatalogo(texto: string, lista: ProductoCatalogo[] = CATALOGO): ProductoCatalogo[] {
  const q = normalizar(texto);
  if (!q) return [];
  const puntos = (x: ProductoCatalogo) => {
    const nombre = normalizar(x.nombre);
    if (nombre.startsWith(q)) return 4;
    if (nombre.includes(q) || x.alias?.some((a) => a.startsWith(q))) return 3;
    if (x.alias?.some((a) => a.includes(q)) || normalizar(x.descripcion).includes(q)) return 2;
    if (x.tipo === 'empacado' && x.presentaciones.some((pr) => normalizar(pr.nombre).includes(q))) return 1;
    return 0;
  };
  return lista.map((x) => [x, puntos(x)] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([x]) => x);
}

/**
 * Valores por defecto al registrar un producto nuevo, según su categoría:
 * dónde se guarda, cuánto dura, cómo se compra y en qué unidad.
 */
export const DEFECTOS_POR_CATEGORIA: Record<Categoria, {
  ubicacion: Ubicacion; dias: number | null; compra: 'empacado' | 'pieza' | 'kg'; unidad: Unidad;
}> = {
  'Frutas': { ubicacion: 'Frutero', dias: 6, compra: 'pieza', unidad: 'pieza' },
  'Verduras': { ubicacion: 'Refrigerador', dias: 7, compra: 'kg', unidad: 'kg' },
  'Lácteos y huevo': { ubicacion: 'Refrigerador', dias: 10, compra: 'empacado', unidad: 'pieza' },
  'Carnes y pescado': { ubicacion: 'Refrigerador', dias: 3, compra: 'kg', unidad: 'kg' },
  'Panadería': { ubicacion: 'Alacena', dias: 5, compra: 'empacado', unidad: 'paquete' },
  'Granos y cereales': { ubicacion: 'Alacena', dias: 365, compra: 'empacado', unidad: 'paquete' },
  'Abarrotes': { ubicacion: 'Alacena', dias: 365, compra: 'empacado', unidad: 'pieza' },
  'Bebidas': { ubicacion: 'Alacena', dias: 180, compra: 'empacado', unidad: 'pieza' },
  'Congelados': { ubicacion: 'Congelador', dias: 90, compra: 'empacado', unidad: 'paquete' },
  'Otros': { ubicacion: 'Alacena', dias: null, compra: 'empacado', unidad: 'pieza' },
};
