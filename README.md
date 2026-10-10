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
   npm install --legacy-peer-deps
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
app/                     Pantallas (Expo Router: cada archivo es una ruta)
  index.tsx                Bienvenida (Freddy + iniciar sesión / crear / unirse)
  iniciar-sesion.tsx       Código + contraseña del hogar
  crear-hogar.tsx          Crea el hogar y muestra su código
  unirse-hogar.tsx         Primera vez en un hogar existente (código + nombre + contraseña)
  (app)/                   Parte interna, requiere sesión. Freddy flota abajo a la derecha
    (tabs)/                  Barra inferior: Inicio · Despensa · Lista · Cocina · Perfil
      inicio.tsx               Resumen en botones + "Agregar producto"
      inventario.tsx           Despensa por ubicación; ?filtro=por-caducar | caducados
      faltantes.tsx            Lista de compras
      cocina.tsx               ¿Qué cocino? (recetas de prueba)
      perfil.tsx               Mi hogar: código, integrantes, cerrar sesión
    producto/[id].tsx        Detalle: fechas, notas, editar, agotado, eliminar
    producto/nuevo.tsx       Alta y edición (?id=) de productos

assets/avatar/           Freddy exportado de Avatar Studio (forma, colores, expresiones)

src/
  theme/tokens.ts        Colores (paleta `ui`), tipografía y espaciados
  data/catalogo.ts       Categorías, ubicaciones y unidades con su ícono
  data/mock.ts           Tipos + datos del hogar de demostración
  state/SesionProvider   Hogares y sesión guardados en el dispositivo
  state/HogarProvider    Productos y lista de compras por hogar (en el dispositivo)
  utils/                 Fechas (AAAA-MM-DD), semáforo de caducidad, confirmación
  components/avatar/     Freddy animado
  components/ui/         Formulario, listas, burbuja y Freddy flotante
```

Hogar de demostración: código **DESP-7F3K**, contraseña **123456**.

## Estado actual (v0.2 — interfaz navegable con datos locales)

La app ya permite iniciar sesión en un hogar, registrar productos (categoría,
ubicación, cantidad, fecha de compra, caducidad y notas), ver lo que está por
caducar o caducado, y manejar la lista de compras. Todo se guarda **solo en
el dispositivo** (AsyncStorage / localStorage en web). **Todavía no hay
conexión a Supabase, al backend ni a Gemini**: eso es el siguiente sprint, y
para conectarlo solo hay que cambiar `SesionProvider` y `HogarProvider`.

Las pantallas de la plantilla de la materia se reinterpretaron para que
coincidan con la arquitectura ya decidida (sin cuentas individuales,
acceso con el código y la contraseña del hogar — ver Fase 1):
- "Registro" → **Crear hogar**
- "Login" → **Iniciar sesión** (código + contraseña) y **Unirse a un hogar**
- Las contraseñas se guardan en texto plano: válido solo para el prototipo.

## Notas
- No subas `node_modules/` (ya está en `.gitignore`); cada quien corre
  `npm install --legacy-peer-deps` localmente (el flag es obligatorio: Expo SDK 57 trae un conflicto de peer-deps entre react y react-dom).
- Antes de hacer push, corre `npx tsc --noEmit` para revisar que no haya
  errores de tipos.
