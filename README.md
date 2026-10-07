# Mi Despensa

App móvil (React Native + Expo) del proyecto "Mi Despensa" — equipo DevCore.

## Para arrancar (cada integrante, una sola vez)

1. Instala [Node.js LTS](https://nodejs.org) y [Git](https://git-scm.com/downloads) si no los tienes.
2. Clona el repo y entra a la carpeta:
   ```
   git clone <url-del-repo>
   cd midespensa
   ```
3. Instala las dependencias:
   ```
   npm install
   ```
4. Instala la app **Expo Go** en tu celular (Play Store / App Store).
5. Levanta el proyecto:
   ```
   npx expo start
   ```
6. Escanea el código QR que aparece en la terminal con la cámara del celular
   (Android) o con la app Expo Go (iOS). También puedes presionar `w` para
   verlo en el navegador.

## Estructura del proyecto

```
app/                  Pantallas (Expo Router: cada archivo es una ruta)
  index.tsx              Bienvenida
  crear-hogar.tsx         Crear hogar (reemplaza "Registro")
  unirse-hogar.tsx        Unirse con código (reemplaza "Login")
  (tabs)/                 Menú principal
    inventario.tsx
    faltantes.tsx
    cocina.tsx
    perfil.tsx
  producto/
    [id].tsx               Detalle de un producto
    nuevo.tsx               Formulario para agregar producto

src/
  theme/tokens.ts       Colores, tipografía y espaciados — cámbialo aquí,
                        no repitas valores sueltos en cada pantalla
  data/mock.ts          Datos de prueba (se reemplaza por el API real)
  state/HogarProvider.tsx  Estado compartido en memoria (sin backend aún)
  components/           Piezas reutilizables (Anaquel, EstadoCaducidad)
```

## Estado actual (v0.1 — Fase 2, interfaz navegable)

Todas las pantallas del punto "Construcción de la interfaz" están
navegables con datos de prueba (`src/data/mock.ts`) y un estado en memoria
que simula agregar productos, marcar agotado y terminar compra. **Todavía
no hay conexión a Supabase, al backend ni a Gemini** — eso es el siguiente
sprint.

Dos pantallas de la plantilla de la materia se reinterpretaron para que
coincidan con la arquitectura ya decidida (sin cuentas individuales,
acceso por código de hogar — ver Fase 1):
- "Registro" → **Crear hogar**
- "Login" → **Unirse a un hogar con código**

## Notas
- No subas `node_modules/` (ya está en `.gitignore`); cada quien corre
  `npm install` localmente.
- Antes de hacer push, corre `npx tsc --noEmit` para revisar que no haya
  errores de tipos.
