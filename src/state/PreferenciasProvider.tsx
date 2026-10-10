import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ajustes del dispositivo (no del hogar): se guardan localmente y cada uno
// tiene efecto real en la app. Se editan en la pantalla de Ajustes.

export type Preferencias = {
  /** Lugar con el que abre el inicio (id de AMBIENTES). */
  inicioEn: string;
  /** Escenas del inicio con movimiento; apagadas quedan quietas. */
  escenasAnimadas: boolean;
  /** Nube con comentarios de Freddy en el inicio. */
  comentariosFreddy: boolean;
  /** Freddy flotante en la esquina de las demás secciones. */
  freddyEnSecciones: boolean;
  /** Vibración al cambiar de lugar y al tocar el selector. */
  vibracion: boolean;
};

export const PREFERENCIAS_INICIALES: Preferencias = {
  inicioEn: 'casa',
  escenasAnimadas: true,
  comentariosFreddy: true,
  freddyEnSecciones: true,
  vibracion: true,
};

const CLAVE = 'midespensa.preferencias';

type Estado = {
  prefs: Preferencias;
  listo: boolean;
  cambiar: <K extends keyof Preferencias>(clave: K, valor: Preferencias[K]) => void;
  restablecer: () => void;
};

const PreferenciasContext = createContext<Estado | null>(null);

export function PreferenciasProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState(PREFERENCIAS_INICIALES);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const guardadas = await AsyncStorage.getItem(CLAVE);
        if (guardadas) setPrefs({ ...PREFERENCIAS_INICIALES, ...JSON.parse(guardadas) });
      } catch {
        // Sin almacenamiento: se usan los valores por defecto.
      } finally {
        setListo(true);
      }
    })();
  }, []);

  const guardar = useCallback((nuevas: Preferencias) => {
    setPrefs(nuevas);
    AsyncStorage.setItem(CLAVE, JSON.stringify(nuevas)).catch(() => {});
  }, []);

  const valor = useMemo<Estado>(() => ({
    prefs,
    listo,
    cambiar: (clave, v) => guardar({ ...prefs, [clave]: v }),
    restablecer: () => guardar(PREFERENCIAS_INICIALES),
  }), [prefs, listo, guardar]);

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>;
}

export function usePreferencias() {
  const ctx = useContext(PreferenciasContext);
  if (!ctx) throw new Error('usePreferencias debe usarse dentro de PreferenciasProvider');
  return ctx;
}
