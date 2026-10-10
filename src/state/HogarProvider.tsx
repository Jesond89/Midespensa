import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Producto, ItemFaltante, productosDemo, faltantesDemo, hogarMock } from '../data/mock';
import { Unidad } from '../data/catalogo';
import { hoyISO } from '../utils/fechas';
import { useSesion } from './SesionProvider';

// Inventario y lista de compras del hogar con sesión activa. Se guardan en
// el dispositivo (una clave por código de hogar) mientras no exista el
// backend; esto se sustituye por React Query + API en el siguiente sprint.

type Despensa = { productos: Producto[]; faltantes: ItemFaltante[] };

type HogarState = Despensa & {
  listo: boolean;
  agregarProducto: (p: Omit<Producto, 'id'>) => string;
  actualizarProducto: (id: string, cambios: Omit<Producto, 'id'>) => void;
  eliminarProducto: (id: string) => void;
  marcarAgotado: (id: string) => void;
  agregarFaltante: (nombre: string, cantidad: number, unidad: Unidad) => void;
  quitarFaltante: (id: string) => void;
  terminarCompra: (ids: string[]) => void;
};

const VACIA: Despensa = { productos: [], faltantes: [] };
const claveDe = (codigo: string) => `midespensa.despensa.${codigo}`;
const nuevoId = (prefijo: string) => `${prefijo}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

const HogarContext = createContext<HogarState | null>(null);

// La app solo lleva comida: lo que se guardó antes con una categoría o un
// lugar que ya no existe (higiene, baño, limpieza, lavandería) se quita al cargar.
const RETIRADAS = { categorias: ['Higiene personal', 'Limpieza'], ubicaciones: ['Baño', 'Lavandería'] };
function sinCategoriasRetiradas(d: Despensa): Despensa {
  const vale = (x: { categoria?: string; ubicacion?: string }) =>
    !RETIRADAS.categorias.includes(x.categoria ?? '') && !RETIRADAS.ubicaciones.includes(x.ubicacion ?? '');
  return { productos: d.productos.filter(vale), faltantes: d.faltantes.filter(vale) };
}

export function HogarProvider({ children }: { children: React.ReactNode }) {
  const codigo = useSesion().hogar?.codigo ?? null;
  const [despensa, setDespensa] = useState<Despensa>(VACIA);
  const [cargadoDe, setCargadoDe] = useState<string | null>(null);

  // Carga la despensa del hogar al iniciar sesión o cambiar de hogar.
  useEffect(() => {
    if (!codigo) { setDespensa(VACIA); setCargadoDe(null); return; }
    let vigente = true;
    (async () => {
      let datos: Despensa | null = null;
      try {
        const guardado = await AsyncStorage.getItem(claveDe(codigo));
        if (guardado) datos = JSON.parse(guardado);
      } catch {
        // Sin almacenamiento: se arranca en memoria.
      }
      if (!datos) {
        datos = codigo === hogarMock.codigo ? { productos: productosDemo(), faltantes: faltantesDemo } : VACIA;
      } else {
        datos = sinCategoriasRetiradas(datos);
      }
      if (vigente) { setDespensa(datos); setCargadoDe(codigo); }
    })();
    return () => { vigente = false; };
  }, [codigo]);

  // Cada cambio se guarda en el dispositivo.
  const actualizar = useCallback((cambio: (d: Despensa) => Despensa) => {
    setDespensa((prev) => {
      const nueva = cambio(prev);
      if (codigo) AsyncStorage.setItem(claveDe(codigo), JSON.stringify(nueva)).catch(() => {});
      return nueva;
    });
  }, [codigo]);

  const value = useMemo<HogarState>(() => ({
    ...despensa,
    listo: cargadoDe === codigo,
    agregarProducto: (p) => {
      const id = nuevoId('p');
      actualizar((d) => ({ ...d, productos: [...d.productos, { ...p, id }] }));
      return id;
    },
    actualizarProducto: (id, cambios) => {
      actualizar((d) => ({ ...d, productos: d.productos.map((p) => (p.id === id ? { ...cambios, id } : p)) }));
    },
    eliminarProducto: (id) => {
      actualizar((d) => ({ ...d, productos: d.productos.filter((p) => p.id !== id) }));
    },
    marcarAgotado: (id) => {
      actualizar((d) => {
        const p = d.productos.find((x) => x.id === id);
        if (!p) return d;
        return {
          productos: d.productos.filter((x) => x.id !== id),
          faltantes: [...d.faltantes, {
            id: nuevoId('f'), nombre: p.nombre, cantidad: p.cantidad, unidad: p.unidad,
            categoria: p.categoria, ubicacion: p.ubicacion,
          }],
        };
      });
    },
    agregarFaltante: (nombre, cantidad, unidad) => {
      actualizar((d) => ({ ...d, faltantes: [...d.faltantes, { id: nuevoId('f'), nombre: nombre.trim(), cantidad, unidad }] }));
    },
    quitarFaltante: (id) => {
      actualizar((d) => ({ ...d, faltantes: d.faltantes.filter((f) => f.id !== id) }));
    },
    terminarCompra: (ids) => {
      actualizar((d) => {
        const compradas = d.faltantes.filter((f) => ids.includes(f.id));
        return {
          faltantes: d.faltantes.filter((f) => !ids.includes(f.id)),
          productos: [
            ...d.productos,
            ...compradas.map((f): Producto => ({
              id: nuevoId('p'),
              nombre: f.nombre,
              categoria: f.categoria ?? 'Otros',
              ubicacion: f.ubicacion ?? 'Alacena',
              cantidad: f.cantidad,
              unidad: f.unidad,
              fechaCompra: hoyISO(),
              fechaCaducidad: null,
              notas: '',
            })),
          ],
        };
      });
    },
  }), [despensa, cargadoDe, codigo, actualizar]);

  return <HogarContext.Provider value={value}>{children}</HogarContext.Provider>;
}

export function useHogar() {
  const ctx = useContext(HogarContext);
  if (!ctx) throw new Error('useHogar debe usarse dentro de HogarProvider');
  return ctx;
}
