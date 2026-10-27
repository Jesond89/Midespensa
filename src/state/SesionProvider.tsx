import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  alPerderSesion,
  apiCrearHogar,
  apiIniciarSesion,
  cerrarSesionRemota,
  hayRefreshGuardado,
  refrescarSesion,
  type ResultadoAuth,
} from '../services/auth';

// Sesión del hogar. La contraseña se valida en el servidor (bcrypt en
// Supabase) y nunca se guarda en el dispositivo. Al entrar se recibe un JWT
// de acceso de 15 minutos y un refresh token rotativo de 30 días
// (src/services/auth.ts). Aquí solo se guarda una copia de los datos
// públicos del hogar para poder abrir la app sin conexión.

export type Hogar = {
  id: string;
  nombre: string;
  codigo: string;
  integrantes: string[];
  rol?: 'admin' | 'miembro';
};
export type ErrorSesion = 'codigo' | 'clave' | 'nombre' | 'bloqueado' | 'red' | 'servidor';
type Resultado = { ok: true } | { ok: false; error: ErrorSesion; reintentarEn?: number };

type SesionState = {
  listo: boolean;
  hogar: Hogar | null;
  crearHogar: (nombre: string, clave: string) => Promise<({ ok: true; hogar: Hogar }) | Extract<Resultado, { ok: false }>>;
  iniciarSesion: (codigo: string, clave: string) => Promise<Resultado>;
  unirse: (codigo: string, clave: string, integrante: string) => Promise<Resultado>;
  cerrarSesion: () => Promise<void>;
};

const CLAVE_HOGAR = 'midespensa.sesion.hogar';
// Claves de la versión anterior, que guardaba las contraseñas en texto plano.
const CLAVES_ANTIGUAS = ['midespensa.hogares', 'midespensa.sesion'];

const SesionContext = createContext<SesionState | null>(null);

function aError(codigo: string): ErrorSesion {
  switch (codigo) {
    case 'codigo':
      return 'codigo';
    case 'clave':
    case 'clave-debil':
      return 'clave';
    case 'nombre':
      return 'nombre';
    case 'bloqueado':
    case 'demasiados-intentos':
      return 'bloqueado';
    case 'sin-configurar':
      return 'servidor';
    default:
      return 'red';
  }
}

/** Texto para mostrar en las pantallas de acceso. */
export function mensajeError(error: ErrorSesion, reintentarEn?: number) {
  switch (error) {
    case 'codigo':
      return 'No encontramos un hogar con ese código.';
    case 'clave':
      return 'La contraseña no es correcta.';
    case 'nombre':
      return 'El nombre del hogar debe tener entre 2 y 60 caracteres.';
    case 'bloqueado': {
      const minutos = Math.max(1, Math.ceil((reintentarEn ?? 60) / 60));
      return `Demasiados intentos. Espera ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} y vuelve a intentar.`;
    }
    case 'servidor':
      return 'El servidor todavía no está configurado. Avisa a quien administra la app.';
    default:
      return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
  }
}

async function leerCache(): Promise<Hogar | null> {
  try {
    const guardado = await AsyncStorage.getItem(CLAVE_HOGAR);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [listo, setListo] = useState(false);
  const [hogar, setHogar] = useState<Hogar | null>(null);

  const fijar = useCallback(async (nuevo: Hogar | null) => {
    setHogar(nuevo);
    try {
      if (nuevo) await AsyncStorage.setItem(CLAVE_HOGAR, JSON.stringify(nuevo));
      else await AsyncStorage.removeItem(CLAVE_HOGAR);
    } catch {
      // Sin almacenamiento: la sesión sigue en memoria.
    }
  }, []);

  // Al abrir la app se renueva la sesión con el refresh token guardado.
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.multiRemove(CLAVES_ANTIGUAS).catch(() => {});
        const cache = await leerCache();
        if (!(await hayRefreshGuardado())) {
          await fijar(null);
          return;
        }
        const r = await refrescarSesion();
        if (r.estado === 'ok') await fijar({ ...r.hogar, rol: cache?.rol });
        else if (r.estado === 'sin-conexion') setHogar(cache); // se renovará al volver la conexión
        else await fijar(null);
      } finally {
        setListo(true);
      }
    })();
  }, [fijar]);

  // Si el servidor revoca la sesión (token reutilizado, vencido…), se sale.
  useEffect(() => alPerderSesion(() => void fijar(null)), [fijar]);

  const value = useMemo<SesionState>(() => {
    const entrar = async (r: ResultadoAuth): Promise<Resultado> => {
      if (!r.ok) return { ok: false, error: aError(r.error), reintentarEn: r.reintentarEn };
      await fijar({ ...r.hogar, rol: r.rol ?? 'miembro' });
      return { ok: true };
    };

    return {
      listo,
      hogar,
      crearHogar: async (nombre, clave) => {
        const r = await apiCrearHogar(nombre.trim(), clave);
        if (!r.ok) return { ok: false, error: aError(r.error), reintentarEn: r.reintentarEn };
        const nuevo: Hogar = { ...r.hogar, rol: 'admin' };
        await fijar(nuevo);
        return { ok: true, hogar: nuevo };
      },
      iniciarSesion: async (codigo, clave) => entrar(await apiIniciarSesion(codigo.trim().toUpperCase(), clave)),
      unirse: async (codigo, clave, integrante) =>
        entrar(await apiIniciarSesion(codigo.trim().toUpperCase(), clave, integrante.trim())),
      cerrarSesion: async () => {
        await cerrarSesionRemota();
        await fijar(null);
      },
    };
  }, [listo, hogar, fijar]);

  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return ctx;
}
