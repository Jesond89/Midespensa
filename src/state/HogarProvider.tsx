import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  Producto, ItemFaltante, productosIniciales, faltantesIniciales,
} from '../data/mock';

// Estado en memoria para que la v0.1 se sienta real al navegarla
// (marcar agotado, agregar producto, terminar compra), sin depender
// todavía del backend. Esto se sustituye por React Query + API en el
// siguiente sprint.

type HogarState = {
  productos: Producto[];
  faltantes: ItemFaltante[];
  agregarProducto: (p: Omit<Producto, 'id'>) => void;
  marcarAgotado: (id: string) => void;
  terminarCompra: (ids: string[]) => void;
};

const HogarContext = createContext<HogarState | null>(null);

export function HogarProvider({ children }: { children: React.ReactNode }) {
  const [productos, setProductos] = useState<Producto[]>(productosIniciales);
  const [faltantes, setFaltantes] = useState<ItemFaltante[]>(faltantesIniciales);

  const value = useMemo<HogarState>(() => ({
    productos,
    faltantes,
    agregarProducto: (p) => {
      setProductos((prev) => [...prev, { ...p, id: `p${Date.now()}` }]);
    },
    marcarAgotado: (id) => {
      const producto = productos.find((p) => p.id === id);
      if (!producto) return;
      setProductos((prev) => prev.filter((p) => p.id !== id));
      setFaltantes((prev) => [...prev, {
        id: `f${Date.now()}`, nombre: producto.nombre, cantidad: 1, unidad: producto.unidad,
      }]);
    },
    terminarCompra: (ids) => {
      const compradas = faltantes.filter((f) => ids.includes(f.id));
      setFaltantes((prev) => prev.filter((f) => !ids.includes(f.id)));
      setProductos((prev) => [
        ...prev,
        ...compradas.map((f) => ({
          id: `p${Date.now()}${f.id}`,
          nombre: f.nombre,
          categoria: 'Sin categoría',
          ubicacion: 'Alacena' as const,
          cantidad: f.cantidad,
          unidad: f.unidad,
          diasParaCaducar: null,
        })),
      ]);
    },
  }), [productos, faltantes]);

  return <HogarContext.Provider value={value}>{children}</HogarContext.Provider>;
}

export function useHogar() {
  const ctx = useContext(HogarContext);
  if (!ctx) throw new Error('useHogar debe usarse dentro de HogarProvider');
  return ctx;
}
