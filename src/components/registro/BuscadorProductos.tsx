import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextStyle, View } from 'react-native';
import { Icono } from '../ui/Icono';
import { IconoCuadro } from '../ui/Lista';
import { Rebote } from '../hogar/animaciones';
import { CATALOGO, DEFECTOS_POR_CATEGORIA, Empacado, ProductoCatalogo, Suelto, buscarEnCatalogo, enCatalogo, normalizar } from '../../data/productos';
import { CATEGORIAS, UBICACIONES, UNIDADES, iconoCategoria } from '../../data/catalogo';
import type { Categoria, Ubicacion, Unidad } from '../../data/catalogo';
import { useCatalogo } from '../../state/CatalogoProvider';
import { Chip } from '../ui/Formulario';
import type { Producto } from '../../data/mock';
import { interpretarEntrada, sugerirPorNombre } from '../../utils/sugerencias';
import { diasHasta } from '../../utils/fechas';
import { ui, spacing } from '../../theme/tokens';

// Buscador para registrar a mano. Por defecto muestra lo que ya hay en casa
// y los productos más comunes; al escribir filtra el catálogo.
//   · Empacado (Coca-Cola): muestra todas sus presentaciones con detalle.
//   · Suelto (plátano, jitomate, pollo): pregunta cuánto, por pieza o por
//     kilo, con un ejemplo de equivalencia.
//   · Nuevo: si no está, se registra con todos sus detalles (nombre, marca,
//     contenido, categoría, cómo se compra, unidad, lugar, caducidad y
//     cantidad), con valores por defecto según lo escrito y la categoría.
//     Se guarda en "Tus productos" para que la próxima vez ya aparezca.
// La barra oscura de abajo agrega lo elegido a la lista por registrar.

export type ProductoAAgregar = {
  nombre: string;
  cantidad: number;
  unidad: Unidad;
  categoria: Categoria;
  ubicacion: Ubicacion;
  dias: number | null;
  revisar?: boolean;
};

type Seleccion =
  | { tipo: 'empacado'; producto: Empacado; presentacion: string | null; cantidad: number }
  | { tipo: 'suelto'; producto: Suelto; modo: 'pieza' | 'kg'; valor: number }
  | { tipo: 'casa'; producto: Producto; cantidad: number }
  | { tipo: 'nuevo'; datos: FormNuevo };

type Compra = 'empacado' | 'pieza' | 'kg';

type FormNuevo = {
  nombre: string;
  marca: string;
  contenido: string;
  categoria: Categoria;
  compra: Compra;
  unidad: Unidad;
  ubicacion: Ubicacion;
  dias: number | null;
  cantidad: number;
  /** Guardarlo en "Tus productos" para la próxima vez. */
  guardar: boolean;
  /** Campos que el usuario ya cambió: la categoría ya no los toca. */
  tocados: Partial<Record<'compra' | 'unidad' | 'ubicacion' | 'dias', true>>;
};

const CADUCIDADES: { etiqueta: string; dias: number | null }[] = [
  { etiqueta: 'No caduca', dias: null }, { etiqueta: '3 días', dias: 3 }, { etiqueta: '1 semana', dias: 7 },
  { etiqueta: '2 semanas', dias: 14 }, { etiqueta: '1 mes', dias: 30 }, { etiqueta: '3 meses', dias: 90 },
  { etiqueta: '6 meses', dias: 180 }, { etiqueta: '1 año', dias: 365 },
];

const COMPRAS: { id: Compra; titulo: string }[] = [
  { id: 'empacado', titulo: 'Empacado' }, { id: 'pieza', titulo: 'Por pieza' }, { id: 'kg', titulo: 'Por kilo' },
];

/** Formulario con valores por defecto a partir de lo escrito ("2 kg de queso cotija"). */
function formDesde(texto: string): FormNuevo {
  const { nombre, cantidad, unidad } = interpretarEntrada(texto || '');
  const s = sugerirPorNombre(nombre);
  const categoria = s?.categoria ?? 'Otros';
  const d = DEFECTOS_POR_CATEGORIA[categoria];
  const compra: Compra = unidad === 'kg' ? 'kg' : d.compra;
  return {
    nombre: texto.trim() ? nombre : '',
    marca: '',
    contenido: '',
    categoria,
    compra,
    unidad: compra === 'kg' ? 'kg' : compra === 'pieza' ? 'pieza' : unidad !== 'pieza' ? unidad : d.unidad,
    ubicacion: s?.ubicacion ?? d.ubicacion,
    dias: s ? s.dias : d.dias,
    cantidad,
    guardar: true,
    tocados: {},
  };
}

/** Al cambiar la categoría, ajusta lo que el usuario no ha tocado. */
function conCategoria(f: FormNuevo, categoria: Categoria): FormNuevo {
  const d = DEFECTOS_POR_CATEGORIA[categoria];
  const compra = f.tocados.compra ? f.compra : d.compra;
  return {
    ...f,
    categoria,
    compra,
    unidad: f.tocados.unidad ? f.unidad : compra === 'kg' ? 'kg' : compra === 'pieza' ? 'pieza' : d.unidad,
    ubicacion: f.tocados.ubicacion ? f.ubicacion : d.ubicacion,
    dias: f.tocados.dias ? f.dias : d.dias,
  };
}

const nombreCompleto = (f: FormNuevo) => [f.nombre.trim(), f.marca.trim(), f.contenido.trim()].filter(Boolean).join(' ');

const RAPIDOS = { pieza: [1, 3, 6, 12], kg: [0.25, 0.5, 1, 2] };
const POPULARES = ['tortillas', 'leche', 'huevo', 'jitomate', 'cebolla', 'platano', 'aguacate', 'limon', 'pollo', 'frijol', 'arroz', 'queso', 'pan-caja', 'coca-cola', 'aceite', 'chile-serrano'];

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));
const kilos = (g: number) => (g >= 1000 ? `${num(g / 1000)} kg` : `${Math.round(g / 10) * 10} g`);

/** Lo que dice la barra oscura según lo elegido. */
function textoAccion(s: Seleccion) {
  if (s.tipo === 'empacado') {
    const pr = s.producto.presentaciones.find((x) => x.id === s.presentacion);
    return pr ? `Agregar ${s.cantidad} × ${pr.nombre}` : 'Elige una presentación';
  }
  if (s.tipo === 'suelto') {
    const { producto: x, modo, valor } = s;
    if (modo === 'kg') return `Agregar ${num(valor)} kg de ${x.nombre.toLowerCase()}`;
    const aprox = x.gramosPorPieza ? ` (≈ ${kilos(valor * x.gramosPorPieza)})` : '';
    return `Agregar ${num(valor)} ${valor === 1 ? x.nombre.toLowerCase() : x.plural}${aprox}`;
  }
  if (s.tipo === 'casa') return `Agregar ${num(s.cantidad)} ${s.producto.unidad} de ${s.producto.nombre}`;
  if (!s.datos.nombre.trim()) return 'Escribe el nombre del producto';
  return s.datos.guardar ? 'Agregar y guardar en tus productos' : 'Agregar a la lista';
}

export function BuscadorProductos({ productosCasa, onAgregar }: {
  productosCasa: Producto[];
  onAgregar: (p: ProductoAAgregar) => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [agregado, setAgregado] = useState<string | null>(null);
  const { todos, propios, registrar } = useCatalogo();
  // Pestaña del panel: lo que ya hay en casa o los productos frecuentes.
  // Sin elección del usuario, abre en "En tu casa" si hay productos (la despensa puede cargar después).
  const [vistaElegida, setVista] = useState<'casa' | 'frecuentes' | null>(null);
  const vista = vistaElegida ?? (productosCasa.length ? 'casa' : 'frecuentes');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Lo que ya hay en casa, sin repetir nombres.
  const enCasa = useMemo(() => {
    const vistos = new Set<string>();
    return productosCasa.filter((p) => {
      const k = normalizar(p.nombre);
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  }, [productosCasa]);

  const q = normalizar(busqueda);
  const resultados = q ? buscarEnCatalogo(busqueda, todos) : POPULARES.map((id) => CATALOGO.find((x) => x.id === id)!).filter(Boolean);
  // Al buscar, lo de casa que ya sale en el catálogo no se repite.
  const deCasa = q
    ? enCasa.filter((p) => normalizar(p.nombre).includes(q) && !resultados.some((r) => r.id === enCatalogo(p.nombre, todos)?.producto.id))
    : enCasa.slice(0, 12);

  const elegir = (x: ProductoCatalogo, presentacion: string | null = null) => {
    setSeleccion(x.tipo === 'empacado'
      ? { tipo: 'empacado', producto: x, presentacion: presentacion ?? (x.presentaciones.length === 1 ? x.presentaciones[0].id : null), cantidad: 1 }
      : { tipo: 'suelto', producto: x, modo: x.modo, valor: 1 });
  };

  // Lo que ya hay en casa abre el flujo del catálogo si lo conoce (con su
  // presentación marcada o la pregunta de cuánto); si no, solo pregunta cuánto.
  const elegirDeCasa = (x: Producto) => {
    const c = enCatalogo(x.nombre, todos);
    if (c) elegir(c.producto, c.presentacion);
    else setSeleccion({ tipo: 'casa', producto: x, cantidad: 1 });
  };

  const iniciarNuevo = (texto: string) => setSeleccion({ tipo: 'nuevo', datos: formDesde(texto) });

  const confirmar = (p: ProductoAAgregar) => {
    onAgregar(p);
    setSeleccion(null);
    setBusqueda('');
    setAgregado(p.nombre);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAgregado(null), 1800);
  };

  const agregar = () => {
    if (seleccion) {
      if (seleccion.tipo === 'empacado') {
        const { producto: x, presentacion, cantidad } = seleccion;
        const pr = x.presentaciones.find((y) => y.id === presentacion);
        if (!pr) return;
        confirmar({ nombre: pr.nombre, cantidad, unidad: pr.unidad, categoria: x.categoria, ubicacion: x.ubicacion, dias: x.dias });
      } else if (seleccion.tipo === 'suelto') {
        const { producto: x, modo, valor } = seleccion;
        confirmar({ nombre: x.nombre, cantidad: valor, unidad: modo === 'kg' ? 'kg' : 'pieza', categoria: x.categoria, ubicacion: x.ubicacion, dias: x.dias });
      } else if (seleccion.tipo === 'nuevo') {
        const f = seleccion.datos;
        if (!f.nombre.trim()) return;
        const completo = nombreCompleto(f);
        if (f.guardar) {
          registrar({
            base: f.nombre.trim(),
            nombre: f.compra === 'empacado' ? completo : f.nombre.trim(),
            detalle: [f.marca.trim() && `Marca ${f.marca.trim()}`, f.contenido.trim()].filter(Boolean).join(' · '),
            compra: f.compra, unidad: f.unidad, categoria: f.categoria, ubicacion: f.ubicacion, dias: f.dias,
          });
        }
        confirmar({ nombre: completo, cantidad: f.cantidad, unidad: f.unidad, categoria: f.categoria, ubicacion: f.ubicacion, dias: f.dias });
      } else {
        const { producto: x, cantidad } = seleccion;
        // Misma caducidad relativa que la vez pasada (si la tenía).
        const dias = x.fechaCaducidad ? Math.max(1, diasHasta(x.fechaCaducidad) - diasHasta(x.fechaCompra)) : null;
        confirmar({ nombre: x.nombre, cantidad, unidad: x.unidad, categoria: x.categoria, ubicacion: x.ubicacion, dias });
      }
      return;
    }
    // Sin elegir nada: lo escrito se registra como producto nuevo, con todos sus detalles.
    if (busqueda.trim()) iniciarNuevo(busqueda);
  };

  const listo = seleccion
    ? seleccion.tipo === 'empacado' ? !!seleccion.presentacion
      : seleccion.tipo === 'nuevo' ? !!seleccion.datos.nombre.trim() : true
    : !!busqueda.trim();
  const accion = seleccion ? textoAccion(seleccion)
    : busqueda.trim() ? `Registrar “${busqueda.trim()}” como nuevo` : 'Elige un producto de la lista';

  return (
    <View style={styles.contenedor}>
      {/* Barra de búsqueda */}
      <View style={styles.buscador}>
        <Icono nombre="buscar" tamano={18} color={ui.icono} />
        <TextInput
          value={busqueda}
          onChangeText={(t) => { setBusqueda(t); setSeleccion(null); }}
          onSubmitEditing={() => { if (resultados.length === 1) elegir(resultados[0]); else if (!resultados.length) agregar(); }}
          placeholder="Busca: Coca-Cola, plátano, leche…"
          placeholderTextColor={ui.textoTerciario}
          returnKeyType="search"
          style={[styles.buscadorTexto, sinContornoWeb]}
          accessibilityLabel="Buscar producto"
        />
        {!!busqueda && (
          <Pressable
            onPress={() => { setBusqueda(''); setSeleccion(null); }}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
          >
            <Icono nombre="cerrar" tamano={14} color={ui.icono} />
          </Pressable>
        )}
      </View>

      {/* Panel: título corto, contenido y acción */}
      <View style={styles.panel}>
        <View style={styles.panelCabecera}>
          {seleccion ? (
            <Rebote onPress={() => setSeleccion(null)} escala={0.94} style={styles.pildora} accessibilityRole="button" accessibilityLabel="Regresar a la lista">
              <View style={{ transform: [{ rotate: '180deg' }] }}><Icono nombre="chevron" tamano={12} color={ui.texto} /></View>
              <Text style={styles.pildoraTexto} numberOfLines={1}>{seleccion.tipo === 'nuevo' ? 'Producto nuevo' : seleccion.producto.nombre}</Text>
            </Rebote>
          ) : agregado || q ? (
            <View style={[styles.pildora, agregado && styles.pildoraOk]}>
              {agregado && <Icono nombre="check" tamano={12} color={ui.fresco} />}
              <Text style={[styles.pildoraTexto, agregado && { color: ui.fresco }]} numberOfLines={1}>
                {agregado ? `${agregado} agregado` : 'Resultados'}
              </Text>
            </View>
          ) : (
            <View style={styles.pestanas}>
              {([['casa', 'En tu casa', 'casa'], ['frecuentes', 'Productos frecuentes', 'chispas']] as const).map(([id, titulo, icono]) => {
                const activa = vista === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setVista(id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activa }}
                    accessibilityLabel={titulo}
                    style={[styles.pildora, !activa && styles.pildoraInactiva]}
                  >
                    <View><Icono nombre={icono} tamano={13} color={activa ? ui.texto : ui.textoSecundario} /></View>
                    <Text style={[styles.pildoraTexto, !activa && { color: ui.textoSecundario }]} numberOfLines={1}>{titulo}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.area, seleccion?.tipo === 'nuevo' && styles.areaFormulario]}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 4 }}>
            {!seleccion && (
              <>
                {(q || vista === 'casa') && deCasa.length > 0 && q && <Text style={styles.grupo}>En tu casa</Text>}
                {(q || vista === 'casa') && deCasa.map((x) => (
                  <Fila
                    key={`casa-${x.id}`}
                    icono={iconoCategoria(x.categoria)}
                    titulo={x.nombre}
                    detalle={`Ya lo tienes · ${num(x.cantidad)} ${x.unidad} en ${x.ubicacion.toLowerCase()}`}
                    onPress={() => elegirDeCasa(x)}
                  />
                ))}
                {!q && vista === 'casa' && deCasa.length === 0 && (
                  <Text style={styles.vacio}>Todavía no hay productos en tu casa. Elígelos en “Productos frecuentes” o regístralos.</Text>
                )}
                {!q && vista === 'frecuentes' && propios.length > 0 && <Text style={styles.grupo}>Tus productos</Text>}
                {!q && vista === 'frecuentes' && propios.slice(0, 6).map((x) => (
                  <Fila
                    key={x.id}
                    icono={iconoCategoria(x.categoria)}
                    titulo={x.nombre}
                    detalle={x.tipo === 'empacado'
                      ? `Registrado por ti · ${x.presentaciones.length} ${x.presentaciones.length === 1 ? 'presentación' : 'presentaciones'}`
                      : `Registrado por ti · por ${x.modo === 'kg' ? 'kilo' : 'pieza'}`}
                    onPress={() => elegir(x)}
                  />
                ))}
                {(q || vista === 'frecuentes') && resultados.length > 0 && <Text style={styles.grupo}>{q ? 'En el catálogo' : 'Populares'}</Text>}
                {(q || vista === 'frecuentes') && resultados.map((x) => (
                  <Fila
                    key={x.id}
                    icono={iconoCategoria(x.categoria)}
                    titulo={x.nombre}
                    detalle={x.tipo === 'empacado'
                      ? `${x.descripcion} · ${x.presentaciones.length} ${x.presentaciones.length === 1 ? 'presentación' : 'presentaciones'}`
                      : `${x.descripcion} · se ${x.gramosPorPieza ? 'cuenta o se pesa' : 'pesa'}`}
                    onPress={() => elegir(x)}
                  />
                ))}
                {q && resultados.length === 0 && deCasa.length === 0 && (
                  <Text style={styles.vacio}>“{busqueda.trim()}” no está en la lista. Regístralo con sus detalles y la próxima vez ya aparecerá.</Text>
                )}
                <Fila
                  icono="mas"
                  titulo={q ? `Registrar “${busqueda.trim()}” como nuevo` : 'Registrar un producto nuevo'}
                  detalle={q ? 'Con nombre, marca, contenido, lugar y caducidad' : '¿No está en la lista? Agrégalo con todos sus detalles'}
                  onPress={() => iniciarNuevo(busqueda)}
                />
              </>
            )}

            {seleccion?.tipo === 'empacado' && (
              <>
                <Text style={styles.pregunta}>¿Qué presentación?</Text>
                {seleccion.producto.presentaciones.map((pr) => {
                  const activa = seleccion.presentacion === pr.id;
                  return (
                    <Pressable
                      key={pr.id}
                      onPress={() => setSeleccion({ ...seleccion, presentacion: pr.id })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: activa }}
                      style={({ pressed }) => [styles.opcion, activa && styles.opcionActiva, pressed && { opacity: 0.7 }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.opcionTitulo}>{pr.nombre}</Text>
                        <Text style={styles.opcionDetalle}>{pr.detalle}</Text>
                      </View>
                      <Icono nombre={activa ? 'check-circulo' : 'circulo'} tamano={22} color={activa ? ui.accion : ui.textoTerciario} />
                    </Pressable>
                  );
                })}
                {seleccion.presentacion && (
                  <Contador
                    pregunta="¿Cuántos?"
                    valor={seleccion.cantidad}
                    paso={1}
                    minimo={1}
                    rapidos={[1, 2, 4, 6]}
                    onCambiar={(cantidad) => setSeleccion({ ...seleccion, cantidad })}
                  />
                )}
              </>
            )}

            {seleccion?.tipo === 'suelto' && <PreguntaSuelto seleccion={seleccion} onCambiar={setSeleccion} />}

            {seleccion?.tipo === 'nuevo' && (
              <FormularioNuevo datos={seleccion.datos} onCambiar={(datos) => setSeleccion({ tipo: 'nuevo', datos })} />
            )}

            {seleccion?.tipo === 'casa' && (
              <Contador
                pregunta={`¿Cuánto compraste? (${seleccion.producto.unidad})`}
                valor={seleccion.cantidad}
                paso={seleccion.producto.unidad === 'kg' || seleccion.producto.unidad === 'L' ? 0.5 : 1}
                minimo={seleccion.producto.unidad === 'kg' || seleccion.producto.unidad === 'L' ? 0.25 : 1}
                rapidos={[1, 2, 3, 6]}
                onCambiar={(cantidad) => setSeleccion({ ...seleccion, cantidad })}
              />
            )}
          </ScrollView>
        </View>

        <Rebote onPress={agregar} disabled={!listo} escala={0.97} style={[styles.accion, !listo && styles.accionApagada]} accessibilityRole="button" accessibilityLabel={accion}>
          <Icono nombre="mas" tamano={16} color={ui.accionTexto} />
          <Text style={styles.accionTexto} numberOfLines={1}>{accion}</Text>
        </Rebote>
      </View>
    </View>
  );
}

// ——— Producto nuevo: todos los detalles, con valores por defecto ———

function FormularioNuevo({ datos: f, onCambiar }: { datos: FormNuevo; onCambiar: (f: FormNuevo) => void }) {
  const set = (cambios: Partial<FormNuevo>, tocado?: keyof FormNuevo['tocados']) =>
    onCambiar({ ...f, ...cambios, tocados: tocado ? { ...f.tocados, [tocado]: true } : f.tocados });
  const cambiarCompra = (compra: Compra) =>
    set({ compra, unidad: compra === 'kg' ? 'kg' : compra === 'pieza' ? 'pieza' : DEFECTOS_POR_CATEGORIA[f.categoria].unidad }, 'compra');
  const paso = f.unidad === 'kg' || f.unidad === 'L' ? 0.25 : 1;
  const unidadesEmpacado = UNIDADES.filter((u) => u !== 'kg');

  return (
    <View style={styles.formulario}>
      <Campo etiqueta="Nombre" valor={f.nombre} placeholder="Ej. Salsa de chile" onCambiar={(nombre) => set({ nombre })} />
      <View style={styles.dosCampos}>
        <Campo etiqueta="Marca (opcional)" valor={f.marca} placeholder="Ej. Búfalo" onCambiar={(marca) => set({ marca })} />
        <Campo
          etiqueta="Contenido (opcional)"
          valor={f.contenido}
          placeholder={f.compra === 'empacado' ? 'Ej. 150 ml' : 'Ej. grande'}
          onCambiar={(contenido) => set({ contenido })}
        />
      </View>
      {!!nombreCompleto(f) && <Text style={styles.vistaPrevia}>Se registrará como: <Text style={styles.vistaPreviaNombre}>{nombreCompleto(f)}</Text></Text>}

      <Opciones titulo="Categoría">
        {CATEGORIAS.map((c) => (
          <Chip key={c.nombre} etiqueta={c.nombre} icono={c.icono} activo={f.categoria === c.nombre} onPress={() => onCambiar(conCategoria(f, c.nombre))} />
        ))}
      </Opciones>

      <View style={{ gap: 6 }}>
        <Text style={styles.opcionesTitulo}>¿Cómo se compra?</Text>
        <View style={[styles.segmentos, { marginHorizontal: 0, marginTop: 0 }]}>
          {COMPRAS.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => cambiarCompra(c.id)}
              style={[styles.segmento, f.compra === c.id && styles.segmentoActivo]}
              accessibilityRole="tab"
              accessibilityState={{ selected: f.compra === c.id }}
            >
              <Text style={[styles.segmentoTexto, f.compra === c.id && styles.segmentoTextoActivo]}>{c.titulo}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {f.compra === 'empacado' && (
        <Opciones titulo="Unidad">
          {unidadesEmpacado.map((u) => <Chip key={u} etiqueta={u} activo={f.unidad === u} onPress={() => set({ unidad: u }, 'unidad')} />)}
        </Opciones>
      )}

      <Opciones titulo="¿Dónde se guarda?">
        {UBICACIONES.map((u) => (
          <Chip key={u.nombre} etiqueta={u.nombre} icono={u.icono} activo={f.ubicacion === u.nombre} onPress={() => set({ ubicacion: u.nombre }, 'ubicacion')} />
        ))}
      </Opciones>

      <Opciones titulo="Caducidad">
        {/* La sugerida (p. ej. 10 días) se muestra marcada aunque no sea una de las opciones fijas. */}
        {!CADUCIDADES.some((c) => c.dias === f.dias) && f.dias !== null && (
          <Chip etiqueta={`${f.dias} días`} activo onPress={() => {}} />
        )}
        {CADUCIDADES.map((c) => (
          <Chip key={c.etiqueta} etiqueta={c.etiqueta} activo={f.dias === c.dias} onPress={() => set({ dias: c.dias }, 'dias')} />
        ))}
      </Opciones>

      <Contador
        pregunta={f.compra === 'kg' ? '¿Cuántos kilos?' : '¿Cuántos compraste?'}
        valor={f.cantidad}
        paso={paso}
        minimo={paso}
        rapidos={f.compra === 'kg' ? RAPIDOS.kg : [1, 2, 3, 6]}
        sufijo={f.compra === 'kg' ? 'kg' : f.unidad !== 'pieza' ? f.unidad : undefined}
        onCambiar={(cantidad) => set({ cantidad })}
      />

      <Pressable
        onPress={() => set({ guardar: !f.guardar })}
        style={styles.guardarFila}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: f.guardar }}
      >
        <Icono nombre={f.guardar ? 'check-circulo' : 'circulo'} tamano={22} color={f.guardar ? ui.accion : ui.textoTerciario} />
        <View style={{ flex: 1 }}>
          <Text style={styles.guardarTitulo}>Guardar en tus productos</Text>
          <Text style={styles.guardarDetalle}>La próxima vez aparecerá en la lista, como los demás.</Text>
        </View>
      </Pressable>
    </View>
  );
}

function Campo({ etiqueta, valor, placeholder, onCambiar }: { etiqueta: string; valor: string; placeholder: string; onCambiar: (t: string) => void }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.opcionesTitulo}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={onCambiar}
        placeholder={placeholder}
        placeholderTextColor={ui.textoTerciario}
        style={[styles.campoTexto, sinContornoWeb]}
        accessibilityLabel={etiqueta}
      />
    </View>
  );
}

function Opciones({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.opcionesTitulo}>{titulo}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {children}
      </ScrollView>
    </View>
  );
}

// ——— Producto suelto: por pieza o por kilo, con ejemplo ———

function PreguntaSuelto({ seleccion, onCambiar }: {
  seleccion: Extract<Seleccion, { tipo: 'suelto' }>;
  onCambiar: (s: Seleccion) => void;
}) {
  const { producto: x, modo, valor } = seleccion;
  const g = x.gramosPorPieza;
  const ejemplo = g
    ? (() => {
        const piezasPorKilo = Math.max(1, Math.round(1000 / g));
        return g >= 1000
          ? `Ejemplo: 1 ${x.nombre.toLowerCase()} pesa ≈ ${kilos(g)}`
          : `Ejemplo: 1 kg son ≈ ${piezasPorKilo} ${piezasPorKilo === 1 ? x.nombre.toLowerCase() : x.plural}; 1 pieza pesa ≈ ${kilos(g)}`;
      })()
    : modo === 'kg'
      ? `Se vende por peso. Ejemplo: medio kilo = 0.5 kg`
      : `Cuenta las piezas que compraste. Ejemplo: 6 piezas = 6`;
  const equivalencia = g
    ? modo === 'pieza'
      ? `≈ ${kilos(valor * g)}`
      : `≈ ${Math.max(1, Math.round((valor * 1000) / g))} ${x.plural}`
    : null;

  return (
    <View style={{ gap: spacing.md }}>
      {g ? (
        <View style={styles.segmentos}>
          {(['pieza', 'kg'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => onCambiar({ ...seleccion, modo: m, valor: 1 })}
              style={[styles.segmento, modo === m && styles.segmentoActivo]}
              accessibilityRole="tab"
              accessibilityState={{ selected: modo === m }}
            >
              <Text style={[styles.segmentoTexto, modo === m && styles.segmentoTextoActivo]}>{m === 'pieza' ? 'Por pieza' : 'Por kilo'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.ejemplo}>
        <Icono nombre="chispas" tamano={14} color={ui.textoSecundario} />
        <Text style={styles.ejemploTexto}>{ejemplo}</Text>
      </View>
      <Contador
        pregunta={modo === 'pieza' ? `¿Cuántos ${x.plural}?` : '¿Cuántos kilos?'}
        valor={valor}
        paso={modo === 'pieza' ? 1 : 0.25}
        minimo={modo === 'pieza' ? 1 : 0.25}
        rapidos={RAPIDOS[modo]}
        sufijo={modo === 'kg' ? 'kg' : undefined}
        nota={equivalencia}
        onCambiar={(v) => onCambiar({ ...seleccion, valor: v })}
      />
    </View>
  );
}

function Contador({ pregunta, valor, paso, minimo, rapidos, sufijo, nota, onCambiar }: {
  pregunta: string; valor: number; paso: number; minimo: number; rapidos: number[]; sufijo?: string; nota?: string | null;
  onCambiar: (v: number) => void;
}) {
  return (
    <View style={styles.contador}>
      <Text style={styles.pregunta}>{pregunta}</Text>
      <View style={styles.contadorFila}>
        <Rebote onPress={() => onCambiar(Math.max(minimo, +(valor - paso).toFixed(2)))} escala={0.85} hitSlop={8} style={styles.paso} accessibilityRole="button" accessibilityLabel="Menos">
          <Icono nombre="menos" tamano={18} color={ui.texto} />
        </Rebote>
        <Text style={styles.valor}>{num(valor)}{sufijo ? <Text style={styles.sufijo}> {sufijo}</Text> : null}</Text>
        <Rebote onPress={() => onCambiar(+(valor + paso).toFixed(2))} escala={0.85} hitSlop={8} style={styles.paso} accessibilityRole="button" accessibilityLabel="Más">
          <Icono nombre="mas" tamano={18} color={ui.texto} />
        </Rebote>
        {nota ? <Text style={styles.nota}>{nota}</Text> : null}
      </View>
      <View style={styles.rapidos}>
        {rapidos.map((r) => (
          <Pressable
            key={r}
            onPress={() => onCambiar(r)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: valor === r }}
            accessibilityLabel={`${num(r)}${sufijo ? ` ${sufijo}` : ''}`}
            style={[styles.rapido, valor === r && styles.rapidoActivo]}
          >
            <Text style={[styles.rapidoTexto, valor === r && { color: ui.accionTexto }]}>{num(r)}{sufijo ? ` ${sufijo}` : ''}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Fila({ icono, titulo, detalle, onPress }: { icono: React.ComponentProps<typeof IconoCuadro>['icono']; titulo: string; detalle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.fila, pressed && { backgroundColor: ui.tarjetaPresionada }]} accessibilityRole="button" accessibilityLabel={titulo}>
      <IconoCuadro icono={icono} tamano={34} />
      <View style={{ flex: 1 }}>
        <Text style={styles.filaTitulo} numberOfLines={1}>{titulo}</Text>
        <Text style={styles.filaDetalle} numberOfLines={1}>{detalle}</Text>
      </View>
      <Icono nombre="chevron" tamano={14} color={ui.textoTerciario} />
    </Pressable>
  );
}

const sinContornoWeb = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as TextStyle | null;

const styles = StyleSheet.create({
  contenedor: { gap: spacing.sm },
  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: ui.tarjeta, borderRadius: 14,
    paddingHorizontal: spacing.lg, minHeight: 48,
  },
  buscadorTexto: { flex: 1, fontSize: 16, color: ui.texto, paddingVertical: 12 },

  panel: { backgroundColor: ui.relleno, borderRadius: 18, padding: spacing.md, gap: spacing.md },
  panelCabecera: { flexDirection: 'row' },
  pildora: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ui.tarjeta, borderRadius: 10,
    paddingHorizontal: spacing.md, height: 34,
  },
  pildoraOk: { backgroundColor: '#E3F4EA' },
  pildoraInactiva: { backgroundColor: 'transparent' },
  pestanas: { flexDirection: 'row', gap: 4 },
  pildoraTexto: { fontSize: 14, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },

  area: { backgroundColor: ui.tarjeta, borderRadius: 14, maxHeight: 330, minHeight: 150, overflow: 'hidden' },
  areaFormulario: { maxHeight: 560 },
  formulario: { padding: spacing.md, gap: spacing.md },
  dosCampos: { flexDirection: 'row', gap: spacing.sm },
  campo: { flex: 1, gap: 6 },
  campoTexto: { fontSize: 16, color: ui.texto, backgroundColor: ui.fondo, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10 },
  vistaPrevia: { fontSize: 13, color: ui.textoSecundario },
  vistaPreviaNombre: { color: ui.texto, fontWeight: '600' },
  opcionesTitulo: { fontSize: 12, fontWeight: '600', color: ui.textoSecundario },
  chips: { gap: spacing.sm, paddingRight: spacing.md },
  guardarFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: ui.fondo, borderRadius: 12, padding: spacing.md },
  guardarTitulo: { fontSize: 15, fontWeight: '600', color: ui.texto },
  guardarDetalle: { fontSize: 12, color: ui.textoSecundario, marginTop: 1 },
  grupo: { fontSize: 12, fontWeight: '600', color: ui.textoSecundario, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 8 },
  filaTitulo: { fontSize: 15, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  filaDetalle: { fontSize: 12, color: ui.textoSecundario, marginTop: 1 },
  vacio: { fontSize: 14, color: ui.textoSecundario, textAlign: 'center', padding: spacing.lg, lineHeight: 19 },

  pregunta: { fontSize: 13, fontWeight: '600', color: ui.textoSecundario, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  opcion: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.sm, marginTop: 6,
    paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: ui.separador,
  },
  opcionActiva: { borderColor: ui.accion, backgroundColor: '#F7F7F9' },
  opcionTitulo: { fontSize: 15, fontWeight: '600', color: ui.texto, letterSpacing: -0.2 },
  opcionDetalle: { fontSize: 13, color: ui.textoSecundario, marginTop: 2 },

  segmentos: { flexDirection: 'row', backgroundColor: ui.relleno, borderRadius: 10, padding: 3, marginHorizontal: spacing.md, marginTop: spacing.sm },
  segmento: { flex: 1, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentoActivo: { backgroundColor: ui.tarjeta, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentoTexto: { fontSize: 14, fontWeight: '500', color: ui.textoSecundario },
  segmentoTextoActivo: { color: ui.texto, fontWeight: '600' },
  ejemplo: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginHorizontal: spacing.md, backgroundColor: ui.fondo, borderRadius: 10, padding: spacing.md },
  ejemploTexto: { flex: 1, fontSize: 13, color: ui.textoSecundario, lineHeight: 18 },

  contador: { gap: spacing.sm, paddingBottom: spacing.md },
  contadorFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  paso: { width: 40, height: 40, borderRadius: 20, backgroundColor: ui.relleno, alignItems: 'center', justifyContent: 'center' },
  valor: { fontSize: 24, fontWeight: '700', color: ui.texto, minWidth: 48, textAlign: 'center', letterSpacing: -0.5 },
  sufijo: { fontSize: 15, fontWeight: '600', color: ui.textoSecundario },
  nota: { fontSize: 14, color: ui.textoSecundario, marginLeft: 'auto' },
  rapidos: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md },
  rapido: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: ui.relleno, justifyContent: 'center' },
  rapidoActivo: { backgroundColor: ui.accion },
  rapidoTexto: { fontSize: 14, fontWeight: '600', color: ui.texto },

  accion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: '#5C5C5E', borderRadius: 12, height: 46, paddingHorizontal: spacing.md,
  },
  accionApagada: { opacity: 0.45 },
  accionTexto: { fontSize: 15, fontWeight: '600', color: ui.accionTexto, flexShrink: 1 },
});
