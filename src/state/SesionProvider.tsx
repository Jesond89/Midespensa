import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hogarMock } from '../data/mock';

// Sesión local mientras no exista el backend: los hogares y la sesión
// activa se guardan en el dispositivo (AsyncStorage; localStorage en web).
// Cuando llegue Supabase, este provider es lo único que hay que cambiar:
// las pantallas solo usan crearHogar / iniciarSesion / unirse / cerrarSesion.
// OJO: la contraseña se guarda en texto plano; aceptable solo para el prototipo.

import {
  isSupabaseConfigured,
  dbCrearHogar,
  dbUnirseHogar,
  dbObtenerMiHogar,
} from '../services/supabaseService';

export type Hogar = {
  id?: string;
  nombre: string;
  codigo: string;
  clave: string;
  integrantes: string[];
  rol?: 'admin' | 'miembro';
};
export type ErrorSesion = 'codigo' | 'clave';
type Resultado = { ok: true } | { ok: false; error: ErrorSesion };

type SesionState = {
  listo: boolean;
  hogar: Hogar | null;
  crearHogar: (nombre: string, clave: string) => Promise<Hogar>;
  iniciarSesion: (codigo: string, clave: string) => Promise<Resultado>;
  unirse: (codigo: string, clave: string, integrante: string) => Promise<Resultado>;
  cerrarSesion: () => Promise<void>;
};

const CLAVE_HOGARES = 'midespensa.hogares';
const CLAVE_SESION = 'midespensa.sesion';

// Hogar de demostración para probar el inicio de sesión: DESP-7F3K / 123456.
const HOGAR_DEMO: Hogar = { ...hogarMock, clave: '123456', rol: 'admin' };

const SesionContext = createContext<SesionState | null>(null);

const normalizar = (codigo: string) => codigo.trim().toUpperCase();

function generarCodigo(existentes: Hogar[]) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para que no se confundan
  let codigo: string;
  do {
    codigo = 'DESP-' + Array.from({ length: 4 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
  } while (existentes.some((h) => h.codigo === codigo));
  return codigo;
}

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [listo, setListo] = useState(false);
  const [hogares, setHogares] = useState<Hogar[]>([HOGAR_DEMO]);
  const [codigoSesion, setCodigoSesion] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (isSupabaseConfigured()) {
          const remoto = await dbObtenerMiHogar();
          if (remoto) {
            setHogares((prev) => [...prev.filter((h) => h.codigo !== remoto.codigo), remoto]);
            setCodigoSesion(remoto.codigo);
          }
        }
        const [h, s] = await Promise.all([AsyncStorage.getItem(CLAVE_HOGARES), AsyncStorage.getItem(CLAVE_SESION)]);
        if (h) setHogares(JSON.parse(h));
        if (s && !codigoSesion) setCodigoSesion(s);
      } catch {
        // Sin almacenamiento disponible: se trabaja solo en memoria.
      } finally {
        setListo(true);
      }
    })();
  }, []);

  const guardar = useCallback(async (nuevos: Hogar[], sesion: string | null) => {
    setHogares(nuevos);
    setCodigoSesion(sesion);
    try {
      await AsyncStorage.setItem(CLAVE_HOGARES, JSON.stringify(nuevos));
      if (sesion) await AsyncStorage.setItem(CLAVE_SESION, sesion);
      else await AsyncStorage.removeItem(CLAVE_SESION);
    } catch {
      // Si falla el guardado, la sesión sigue funcionando en memoria.
    }
  }, []);

  const value = useMemo<SesionState>(() => {
    const validarLocal = (codigo: string, clave: string): Resultado & { hogar?: Hogar } => {
      const hogar = hogares.find((h) => h.codigo === normalizar(codigo));
      if (!hogar) return { ok: false, error: 'codigo' };
      if (hogar.clave !== clave) return { ok: false, error: 'clave' };
      return { ok: true, hogar };
    };

    return {
      listo,
      hogar: hogares.find((h) => h.codigo === codigoSesion) ?? null,
      crearHogar: async (nombre, clave) => {
        const cod = generarCodigo(hogares);
        let nuevoHogar: Hogar = { nombre: nombre.trim(), codigo: cod, clave, integrantes: [], rol: 'admin' };

        if (isSupabaseConfigured()) {
          try {
            const dbHogar = await dbCrearHogar(nombre, 'Admin', cod);
            nuevoHogar = { ...nuevoHogar, id: dbHogar.id, codigo: dbHogar.codigo, rol: dbHogar.rol };
          } catch (e) {
            console.warn('Error al guardar hogar en Supabase, usando local:', e);
          }
        }

        await guardar([...hogares, nuevoHogar], nuevoHogar.codigo);
        return nuevoHogar;
      },
      iniciarSesion: async (codigo, clave) => {
        const codNormalizado = normalizar(codigo);

        if (isSupabaseConfigured()) {
          try {
            const unido = await dbUnirseHogar(codNormalizado, 'Miembro');
            if (unido) {
              const otros = hogares.filter((h) => h.codigo !== codNormalizado);
              await guardar([...otros, unido], unido.codigo);
              return { ok: true };
            }
          } catch (e) {
            console.warn('Error al iniciar sesión con Supabase, intentando local:', e);
          }
        }

        const r = validarLocal(codigo, clave);
        if (r.ok && r.hogar) await guardar(hogares, r.hogar.codigo);
        return r.ok ? { ok: true } : r;
      },
      unirse: async (codigo, clave, integrante) => {
        const codNormalizado = normalizar(codigo);
        const nombreInt = integrante.trim();

        if (isSupabaseConfigured()) {
          try {
            const unido = await dbUnirseHogar(codNormalizado, nombreInt);
            if (unido) {
              const actualizados = [
                ...hogares.filter((h) => h.codigo !== codNormalizado),
                unido,
              ];
              await guardar(actualizados, unido.codigo);
              return { ok: true };
            }
          } catch (e) {
            console.warn('Error al unirse vía Supabase, usando local:', e);
          }
        }

        const r = validarLocal(codigo, clave);
        if (!r.ok || !r.hogar) return r;
        const actualizados = hogares.map((h) =>
          h.codigo === r.hogar!.codigo && !h.integrantes.includes(nombreInt)
            ? { ...h, integrantes: [...h.integrantes, nombreInt] }
            : h
        );
        await guardar(actualizados, r.hogar.codigo);
        return { ok: true };
      },
      cerrarSesion: () => guardar(hogares, null),
    };
  }, [listo, hogares, codigoSesion, guardar]);

  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return ctx;
}
