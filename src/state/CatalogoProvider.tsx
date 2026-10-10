import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATALOGO, ProductoCatalogo, enCatalogo, normalizar } from '../data/productos';
import type { Categoria, Ubicacion, Unidad } from '../data/catalogo';

// Productos que el usuario registró y no venían en el catálogo. Se guardan
// en el dispositivo y aparecen en el buscador como cualquier otro
// ("Tus productos"), con sus presentaciones.

export type ProductoNuevo = {
  /** Nombre base, sin marca ni contenido: "Salsa de chile". */
  base: string;
  /** Nombre completo de la presentación: "Salsa de chile Búfalo 150 ml". */
  nombre: string;
  detalle: string;
  compra: 'empacado' | 'pieza' | 'kg';
  unidad: Unidad;
  categoria: Categoria;
  ubicacion: Ubicacion;
  dias: number | null;
};

const CLAVE = 'midespensa.catalogo-propio';

type Estado = {
  propios: ProductoCatalogo[];
  /** Catálogo de la app más los productos propios (los propios primero). */
  todos: ProductoCatalogo[];
  /** Agrega el producto (o una presentación nueva de uno propio) si aún no existe. */
  registrar: (p: ProductoNuevo) => void;
};

const CatalogoContext = createContext<Estado | null>(null);

const slug = (t: string) => normalizar(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function agregar(propios: ProductoCatalogo[], p: ProductoNuevo): ProductoCatalogo[] {
  // Ya existe (en el catálogo de la app o en los propios): no se duplica.
  if (enCatalogo(p.nombre, [...propios, ...CATALOGO])) return propios;

  if (p.compra !== 'empacado') {
    return [{
      tipo: 'suelto', id: `propio-${slug(p.base)}`, nombre: p.base, descripcion: p.detalle || 'Registrado por ti',
      categoria: p.categoria, ubicacion: p.ubicacion, dias: p.dias, modo: p.compra, gramosPorPieza: null,
      plural: p.base.toLowerCase(),
    }, ...propios];
  }

  const presentacion = { id: `propio-${slug(p.nombre)}`, nombre: p.nombre, detalle: p.detalle || 'Presentación registrada por ti', unidad: p.unidad };
  const familia = propios.find((x) => x.tipo === 'empacado' && normalizar(x.nombre) === normalizar(p.base));
  if (familia && familia.tipo === 'empacado') {
    return propios.map((x) => (x === familia ? { ...familia, presentaciones: [...familia.presentaciones, presentacion] } : x));
  }
  return [{
    tipo: 'empacado', id: `propio-${slug(p.base)}`, nombre: p.base, descripcion: 'Registrado por ti',
    categoria: p.categoria, ubicacion: p.ubicacion, dias: p.dias, presentaciones: [presentacion],
  }, ...propios];
}

export function CatalogoProvider({ children }: { children: React.ReactNode }) {
  const [propios, setPropios] = useState<ProductoCatalogo[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((guardado) => { if (guardado) setPropios(JSON.parse(guardado)); })
      .catch(() => {});
  }, []);

  const registrar = useCallback((p: ProductoNuevo) => {
    setPropios((actuales) => {
      const nuevos = agregar(actuales, p);
      if (nuevos !== actuales) AsyncStorage.setItem(CLAVE, JSON.stringify(nuevos)).catch(() => {});
      return nuevos;
    });
  }, []);

  const valor = useMemo<Estado>(() => ({ propios, todos: [...propios, ...CATALOGO], registrar }), [propios, registrar]);
  return <CatalogoContext.Provider value={valor}>{children}</CatalogoContext.Provider>;
}

export function useCatalogo() {
  const ctx = useContext(CatalogoContext);
  if (!ctx) throw new Error('useCatalogo debe usarse dentro de CatalogoProvider');
  return ctx;
}
