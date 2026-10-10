import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Producto, ItemFaltante, productosDemo, faltantesDemo, hogarMock } from '../data/mock';
import { Unidad } from '../data/catalogo';
import { hoyISO } from '../utils/fechas';
import { useSesion } from './SesionProvider';

import {
  isSupabaseConfigured,
  dbObtenerMiHogar,
  resolverHogarId,
  dbCargarDespensa,
  dbAgregarProducto,
  dbActualizarProducto,
  dbEliminarProducto,
  dbAgregarFaltante,
  dbEliminarFaltante,
  dbEliminarFaltantes,
} from '../services/supabaseService';

// Inventario y lista de compras del hogar con sesión activa.
// Sincroniza con Supabase en tiempo real si está configurado,
// manteniendo almacenamiento local en el dispositivo como respaldo.

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

export function HogarProvider({ children }: { children: React.ReactNode }) {
  const sesionHogar = useSesion().hogar;
  const codigo = sesionHogar?.codigo ?? null;
  const [despensa, setDespensa] = useState<Despensa>(VACIA);
  const [cargadoDe, setCargadoDe] = useState<string | null>(null);
  const [hogarDbId, setHogarDbId] = useState<string | null>(sesionHogar?.id ?? null);

  // Carga la despensa del hogar al iniciar sesión o cambiar de hogar.
  useEffect(() => {
    let vigente = true;
    (async () => {
      if (!codigo) {
        if (vigente) {
          setDespensa(VACIA);
          setCargadoDe(null);
          setHogarDbId(null);
        }
        return;
      }
      let datos: Despensa | null = null;
      let dbId = sesionHogar?.id ?? null;

      if (isSupabaseConfigured()) {
        try {
          if (!dbId) {
            const h = await dbObtenerMiHogar();
            if (h) dbId = h.id;
          }
          if (!dbId && codigo) {
            dbId = await resolverHogarId(codigo);
          }
          if (dbId) {
            setHogarDbId(dbId);
            const remota = await dbCargarDespensa(dbId);
            if (vigente) {
              datos = remota;
            }
          }
        } catch (e) {
          console.warn('Error al cargar despensa de Supabase:', e);
        }
      }

      if (!datos) {
        try {
          const guardado = await AsyncStorage.getItem(claveDe(codigo));
          if (guardado) datos = JSON.parse(guardado);
        } catch {
          // Sin almacenamiento: se arranca en memoria.
        }
      }

      if (!datos) {
        datos = codigo === hogarMock.codigo ? { productos: productosDemo(), faltantes: faltantesDemo } : VACIA;
      }

      if (vigente) {
        setDespensa(datos);
        setCargadoDe(codigo);
      }
    })();

    return () => {
      vigente = false;
    };
  }, [codigo, sesionHogar?.id]);

  // Cada cambio se guarda en el dispositivo.
  const actualizar = useCallback((cambio: (d: Despensa) => Despensa) => {
    setDespensa((prev) => {
      const nueva = cambio(prev);
      if (codigo) AsyncStorage.setItem(claveDe(codigo), JSON.stringify(nueva)).catch(() => {});
      return nueva;
    });
  }, [codigo]);

  const obtenerHogarId = useCallback(async (): Promise<string | null> => {
    if (hogarDbId) return hogarDbId;
    if (!codigo) return null;
    const r = await resolverHogarId(codigo);
    if (r) setHogarDbId(r);
    return r;
  }, [hogarDbId, codigo]);

  const value = useMemo<HogarState>(() => ({
    ...despensa,
    listo: cargadoDe === codigo,
    agregarProducto: (p) => {
      const id = nuevoId('p');
      actualizar((d) => ({ ...d, productos: [...d.productos, { ...p, id }] }));
      obtenerHogarId().then((hId) => {
        if (hId) {
          dbAgregarProducto(hId, p).catch((e) => console.error('Error Supabase agregarProducto:', e));
        }
      });
      return id;
    },
    actualizarProducto: (id, cambios) => {
      actualizar((d) => ({ ...d, productos: d.productos.map((p) => (p.id === id ? { ...cambios, id } : p)) }));
      dbActualizarProducto(id, cambios).catch((e) => console.warn('Error Supabase actualizarProducto:', e));
    },
    eliminarProducto: (id) => {
      actualizar((d) => ({ ...d, productos: d.productos.filter((p) => p.id !== id) }));
      dbEliminarProducto(id).catch((e) => console.warn('Error Supabase eliminarProducto:', e));
    },
    marcarAgotado: (id) => {
      actualizar((d) => {
        const p = d.productos.find((x) => x.id === id);
        if (!p) return d;
        const fid = nuevoId('f');
        obtenerHogarId().then((hId) => {
          if (hId) {
            dbEliminarProducto(id).catch((e) => console.warn('Error Supabase eliminarProducto:', e));
            dbAgregarFaltante(hId, {
              nombre: p.nombre,
              cantidad: p.cantidad,
              unidad: p.unidad,
              categoria: p.categoria,
              ubicacion: p.ubicacion,
            }).catch((e) => console.warn('Error Supabase marcarAgotado:', e));
          }
        });
        return {
          productos: d.productos.filter((x) => x.id !== id),
          faltantes: [
            ...d.faltantes,
            {
              id: fid,
              nombre: p.nombre,
              cantidad: p.cantidad,
              unidad: p.unidad,
              categoria: p.categoria,
              ubicacion: p.ubicacion,
            },
          ],
        };
      });
    },
    agregarFaltante: (nombre, cantidad, unidad) => {
      const fid = nuevoId('f');
      actualizar((d) => ({
        ...d,
        faltantes: [...d.faltantes, { id: fid, nombre: nombre.trim(), cantidad, unidad }],
      }));
      obtenerHogarId().then((hId) => {
        if (hId) {
          dbAgregarFaltante(hId, { nombre: nombre.trim(), cantidad, unidad }).catch((e) =>
            console.warn('Error Supabase agregarFaltante:', e)
          );
        }
      });
    },
    quitarFaltante: (id) => {
      actualizar((d) => ({ ...d, faltantes: d.faltantes.filter((f) => f.id !== id) }));
      dbEliminarFaltante(id).catch((e) => console.warn('Error Supabase quitarFaltante:', e));
    },
    terminarCompra: (ids) => {
      actualizar((d) => {
        const compradas = d.faltantes.filter((f) => ids.includes(f.id));
        obtenerHogarId().then((hId) => {
          if (hId) {
            dbEliminarFaltantes(ids).catch((e) => console.warn('Error Supabase eliminarFaltantes:', e));
            compradas.forEach((f) => {
              dbAgregarProducto(hId, {
                nombre: f.nombre,
                categoria: f.categoria ?? 'Otros',
                ubicacion: f.ubicacion ?? 'Alacena',
                cantidad: f.cantidad,
                unidad: f.unidad,
                fechaCompra: hoyISO(),
                fechaCaducidad: null,
                notas: '',
              }).catch((e) => console.warn('Error Supabase agregarProducto (compra):', e));
            });
          }
        });
        return {
          faltantes: d.faltantes.filter((f) => !ids.includes(f.id)),
          productos: [
            ...d.productos,
            ...compradas.map(
              (f): Producto => ({
                id: nuevoId('p'),
                nombre: f.nombre,
                categoria: f.categoria ?? 'Otros',
                ubicacion: f.ubicacion ?? 'Alacena',
                cantidad: f.cantidad,
                unidad: f.unidad,
                fechaCompra: hoyISO(),
                fechaCaducidad: null,
                notas: '',
              })
            ),
          ],
        };
      });
    },
  }), [despensa, cargadoDe, codigo, obtenerHogarId, actualizar]);

  return <HogarContext.Provider value={value}>{children}</HogarContext.Provider>;
}

export function useHogar() {
  const ctx = useContext(HogarContext);
  if (!ctx) throw new Error('useHogar debe usarse dentro de HogarProvider');
  return ctx;
}
