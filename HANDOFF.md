# Handoff — Cultura Club Backoffice

> Documento de contexto para retomar el desarrollo (pensado para pasarle el estado actual a otra IA, ej. Gemini). Describe stack, arquitectura, flujo de autenticación/RBAC, estado real de la base de datos y problemas conocidos.

## 1. Qué es el proyecto

Backoffice **multi-tenant (marca blanca)** para clubes deportivos. Hoy el club de referencia usado para diseño es **Club Atlético Independiente** (colores/logo aplicados como ejemplo, pero el sistema debe seguir siendo blanco-marca: nada hardcodeado que no pueda cambiar por club).

Funcionalidad implementada hasta ahora:
- Login con Supabase Auth.
- Carga de perfil del usuario (rol, club, nombre) desde la tabla `usuarios`.
- Protección de rutas (redirige a `/login` si no hay sesión).
- RBAC (Role-Based Access Control) sobre componentes: el botón **"Generar trivia"** solo se muestra a `ADMIN_CLUB` y `SUPER_ADMIN`.
- Formulario de creación de trivia (`CreateTriviaForm`) funcional contra Supabase: título + selector de categoría + N preguntas dinámicas (field array), usando el `creador_id` real de la sesión (`profile.id` vía `useAuth()`).

## 2. Stack técnico

| Área | Tecnología |
|---|---|
| Core | React 19, Vite 8, TypeScript ~6.0 (strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`) |
| Estilos | Tailwind CSS **v4** (sin `tailwind.config.js`; todo vía `@import` y `@theme` en `src/index.css`). Plugin `@tailwindcss/vite` (no PostCSS). |
| Componentes UI | Shadcn UI sobre `@base-ui/react` (`Button`, `Card`, `Input`, `Select` en `src/components/ui/`) |
| Routing | `react-router-dom` v7 |
| Backend/Auth | Supabase (`@supabase/supabase-js`) — Auth + Postgres con RLS |
| Package manager | Yarn 1.22 (Yarn Classic, **no** usar `yarn dlx`, eso es de Yarn Berry) |

Alias de imports: `@/*` → `src/*` (configurado en `tsconfig.app.json` y `vite.config.ts`).

### Notas de Tailwind v4
- No existe el comando `tailwindcss init`. La config de theme vive en `src/index.css` (`@theme inline { ... }`, variables `--primary`, `--brand-red`, etc.).
- Colores de marca del club en `src/index.css`: `--brand-red` y `--brand-red-dark` (además de sobreescribir `--primary`/`--ring` de shadcn). Estos deberían terminar siendo dinámicos por `.env`/config de club (pendiente, ver sección 7).

## 3. Arquitectura (Clean Architecture)

Estrictamente en capas dentro de `src/`, cero mezclas:

```
src/
├── domain/                # Entidades + contratos (interfaces). Sin dependencias externas.
│   ├── entities/
│   │   ├── auth/UserProfile.ts       # Role, UserProfile
│   │   ├── categoria/Categoria.ts
│   │   └── trivia/Trivia.ts          # Trivia (paquete) + TriviaPregunta
│   └── repositories/
│       ├── auth/auth_repository.ts       # IAuthRepository
│       ├── categoria/categoria_repository.ts  # ICategoriaRepository
│       └── trivia/trivia_repository.ts   # ITriviaRepository
│
├── data/                  # Implementación concreta contra Supabase
│   ├── datasources/supabase.ts           # createClient(...)
│   └── repositories/
│       ├── auth/AuthRepositoryImpl.ts
│       ├── categoria/CategoriaRepositoryImpl.ts
│       └── trivia/TriviaRepositoryImpl.ts
│
├── aplication/            # (sic — con un solo "p", no tocar el nombre para no romper imports)
│   └── use-cases/
│       ├── auth/{LoginUseCase, LogoutUseCase, GetCurrentUserUseCase}.ts
│       ├── categoria/GetCategoriasUseCase.ts
│       └── trivia/CreateTriviaUseCase.ts
│
├── presentation/           # React: páginas, componentes, hooks/contexto
│   └── features/
│       ├── auth/
│       │   ├── context/AuthContext.tsx        # AuthProvider + useAuth()
│       │   ├── components/{LoginForm,ProtectedRoute,RoleGuard}.tsx
│       │   └── pages/LoginPage.tsx
│       ├── home/pages/HomePage.tsx
│       └── trivias/components/CreateTriviaForm.tsx
│
├── components/ui/          # Shadcn primitives (button, card, input, select)
├── lib/utils.ts            # cn() (clsx + tailwind-merge)
└── App.tsx                 # BrowserRouter + rutas + AuthProvider
```

Regla dura: los componentes de `presentation/` **nunca** llaman a Supabase directamente. Siempre `componente → hook/useAuth → use-case → repository → datasource`.

⚠️ Nota histórica: hay un typo real en el proyecto, la carpeta es `src/aplication` (no `application`). Es intencional/heredado — respetarlo para no romper todos los imports con alias `@/aplication/...`.

## 4. Flujo de autenticación y RBAC

1. `App.tsx` envuelve todo en `AuthProvider` y define las rutas:
   - `/login` → `LoginPage` (pública)
   - `/` → `HomePage`, envuelta en `ProtectedRoute`
   - cualquier otra ruta → redirige a `/`
2. `AuthContext.tsx`:
   - Al montar, llama a `GetCurrentUserUseCase.execute()` para leer sesión + perfil actuales (`supabase.auth.getSession()` + query a `usuarios`).
   - Se suscribe a `supabase.auth.onAuthStateChange` para mantener `session`/`profile` sincronizados (login/logout en otra pestaña, expiración, etc.).
   - Expone `{ session, profile, loading, login, logout }` vía `useAuth()`.
   - **Importante:** el `loading` sólo se apaga en el `.finally()` de la carga inicial; si `getUserProfile` falla, se loguea el error en consola pero no rompe la UI (session queda seteada, profile null).
3. `ProtectedRoute.tsx`: si `loading` → muestra "Cargando..."; si no hay `session` → `<Navigate to="/login" />`; si hay sesión → renderiza `<Outlet />`.
4. `RoleGuard.tsx`: componente `{ allowedRoles, children }` que sólo renderiza `children` si `profile.role` está en `allowedRoles`. Se usa así en `HomePage.tsx`:
   ```tsx
   <RoleGuard allowedRoles={['ADMIN_CLUB', 'SUPER_ADMIN']}>
     {/* botón "Generar trivia" */}
   </RoleGuard>
   ```
5. Login real: `LoginForm.tsx` llama a `login(email, password)` (que ejecuta `LoginUseCase` → `supabase.auth.signInWithPassword`) y navega a `/` si tiene éxito.

## 5. Base de datos real (Supabase) — ¡importante, corregido recientemente!

La tabla de perfiles **NO se llama `profiles`** (error inicial ya corregido). La tabla real es:

### `public.usuarios`
| columna | tipo | notas |
|---|---|---|
| `id` | uuid (PK) | referencia a `auth.users.id` |
| `club_id` | uuid (FK) | `null`/vacío conceptualmente para `SUPER_ADMIN` (visión global) |
| `rol` | enum `rol_usuario` | `SUPER_ADMIN`, `ADMIN_CLUB`, `ENTRENADOR`, `JUGADOR` |
| `nombre_completo` | text | |
| `email` | text | |
| `fcm_token` | text/null | push notifications, no usado todavía en el backoffice |
| `created_at` | timestamptz | |

`AuthRepositoryImpl.getUserProfile()` hace:
```ts
supabase.from('usuarios').select('id, email, rol, nombre_completo, club_id').eq('id', userId).single()
```
y mapea al dominio `UserProfile` (`role` ← `rol`, `nombre` ← `nombre_completo`).

`domain/entities/auth/UserProfile.ts`:
```ts
export type Role = 'SUPER_ADMIN' | 'ADMIN_CLUB' | 'ENTRENADOR' | 'JUGADOR';
export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  nombre?: string;
  club_id?: string | null;
}
```

### Modelo de Trivia (actualizado): paquete + preguntas

Una **Trivia ya no es una sola pregunta**: ahora es un "paquete/quiz" (`titulo`, `categoria_id`, `creador_id`, `estado`) que contiene un array de **`TriviaPregunta`** (`pregunta`, `opciones`, `respuesta_correcta`, `puntos`).

`domain/entities/trivia/Trivia.ts`:
```ts
export interface TriviaPregunta {
  id?: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
  puntos: number;
}

export interface Trivia {
  id?: string;
  titulo: string;
  categoria_id: string;
  estado: string;
  creador_id: string;
  preguntas: TriviaPregunta[];
}
```

`TriviaRepositoryImpl.createTrivia()` hace un **insert en dos pasos**:
1. Inserta el padre en `trivias` (`titulo`, `categoria_id`, `creador_id`, `estado`) y lee el `id` generado (`.select('id').single()`).
2. Inserta en bloque (`insert([...])`) todas las filas de `trivia_preguntas`, cada una con el `trivia_id` recién obtenido.

Si el segundo insert falla, **no hay rollback automático** del insert del padre (Supabase JS no maneja transacciones multi-tabla desde el cliente) — quedaría una `Trivia` sin preguntas. Pendiente evaluar una función RPC/transacción en Postgres si esto se vuelve un problema real.

`CreateTriviaUseCase` valida: `titulo` no vacío, `categoria_id` presente, `creador_id` presente, al menos 1 pregunta, y por cada pregunta: texto no vacío, 2–5 opciones, y que `respuesta_correcta` sea exactamente una de las `opciones`.

### Categorías

`domain/entities/categoria/Categoria.ts`: `{ id, nombre, club_id? }`. `CategoriaRepositoryImpl.getCategorias(clubId?)` consulta `categorias` filtrando por `club_id` cuando existe (para `SUPER_ADMIN`, que no tiene `club_id` propio, hoy trae todas las categorías sin filtrar — revisar si eso es lo deseado o si necesita selector de club).

### Otras tablas mencionadas en el contexto del proyecto (usadas o a usar)
- `trivias` (paquete/quiz): `titulo`, `categoria_id`, `creador_id`, `estado`.
- `trivia_preguntas` (nueva, 1 fila por pregunta del paquete): `trivia_id` (FK a `trivias`), `pregunta`, `opciones` (jsonb), `respuesta_correcta`, `puntos`.
- `trivia_respuestas`: `trivia_id`, `jugador_id`, `respuesta_elegida`, `es_correcta`, `puntos_ganados` — ojo, hoy referencia `trivia_id` como si fuera una sola pregunta; con el nuevo modelo probablemente deba apuntar a `trivia_pregunta_id` en vez de `trivia_id` (pendiente de definir/migrar, no lo tocamos todavía).
- `categorias`: `id`, `nombre`, `club_id` (ya consumida por `CategoriaRepositoryImpl`).
- `partidos`: filtra por `club_id` vía RLS (no implementado en el backoffice todavía).

### ⚠️ RLS y `SUPER_ADMIN`
Muchas políticas RLS filtran por `club_id = get_user_club_id()`. `SUPER_ADMIN` no tiene `club_id` propio (visión global), así que ese patrón de política lo puede dejar **sin ver filas** en tablas como `categorias`/`partidos`. Cualquier SQL o lógica de acceso nueva tiene que contemplar explícitamente cómo `SUPER_ADMIN` bypassea ese filtro (ej. política adicional `OR get_user_role() = 'SUPER_ADMIN'`).

### IDs de prueba conocidos (entorno de desarrollo)
- Usuario `ADMIN_CLUB` de prueba: `id = e1f25225-6e43-4ad3-be5a-8aa6a9c435ae`, `email = caiadmin@asd.com` (aprox.), `nombre_completo = Ricardo Enrique`.
- `club_id` de prueba: `253f554f-2e82-45e7-b4ae-6bba665c56ea`.

## 6. Variables de entorno

`.env` (no commitear valores reales en docs/código):
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...   # anon/publishable key, no la service_role
```
Usadas en `src/data/datasources/supabase.ts`.

## 7. Estética / UI actual

- Tema de color: se sobreescribieron `--primary`, `--ring`, y se agregaron `--brand-red` / `--brand-red-dark` en `src/index.css` con el rojo de Independiente. **Esto rompe la premisa de "marca blanca" del proyecto** (colores hardcodeados en vez de vía `.env`) — pendiente de generalizar (ver sección 8).
- Logo del club: `src/assets/logo_cai.jpg` (imagen real subida por el usuario, reemplazó un intento anterior de escudo dibujado a mano en SVG que se descartó por feo).
- `LoginPage.tsx`: layout simple centrado (se probó un panel lateral rojo con el escudo y se sacó por pedido explícito del usuario, "quedaba horrible"). Actualmente: fondo blanco, `LoginForm` centrado.
- `LoginForm.tsx`: en mobile (`< sm`) se ve **sin card** (sin sombra/ring/fondo, sin la franja roja superior) — solo el form flotando centrado. Desde `sm:` para arriba recupera el estilo de `Card` con sombra, ring y franja roja superior. Logo del club centrado arriba del título.
- `HomePage.tsx`: header con barra roja superior + logo circular + email + badge de rol (color de marca) + botón "Cerrar sesión". Debajo, card de "Trivias" (solo `ADMIN_CLUB`/`SUPER_ADMIN`) con botón "Generar trivia" que muestra `CreateTriviaForm`. Para `ENTRENADOR` se muestra un estado vacío ("tu rol todavía no tiene acciones disponibles").
- `CreateTriviaForm.tsx`: título de la trivia + `Select` de categoría + lista dinámica de preguntas ("Pregunta 1", "Pregunta 2", ...) cada una en su propio bloque con borde, con botón "+ Añadir otra pregunta" y "Quitar pregunta" (solo si hay más de una). Cada pregunta mantiene 2–5 opciones dinámicas, respuesta correcta y puntaje, igual que antes pero ahora repetido N veces.
- Ya se verificó responsividad del login en 320px, 390px y landscape corto (667×320) usando Playwright/devtools — se ve bien, sin overflow relevante.

## 8. Pendientes / próximos pasos sugeridos

1. **Generalizar marca blanca de colores**: hoy `--brand-red`/`--primary` están hardcodeados a rojo Independiente en `index.css`. Debería inyectarse dinámicamente por club (ej. leyendo `VITE_CLUB_PRIMARY_COLOR` en runtime o generando el CSS por tenant), tal como ya se hace conceptualmente con `VITE_CLUB_NAME`/logo.
2. **`creador_id` hardcodeado**: ✅ Resuelto — `CreateTriviaForm.tsx` usa `profile.id` real de `useAuth()`.
3. **Manejo de errores de perfil en UI**: si `getUserProfile` falla (perfil inexistente, RLS bloqueando), hoy solo se loguea en consola y el usuario queda "logueado" pero sin rol visible ni botones. Falta un estado de error visible ("no se pudo cargar tu perfil, contactá al admin").
4. **RLS / SUPER_ADMIN**: falta revisar políticas para que `SUPER_ADMIN` pueda operar sobre `categorias`/`partidos`/`trivias` de cualquier club sin verse bloqueado por `club_id`.
5. **Extender RBAC**: el rol `JUGADOR` existe en la base pero no tiene ningún flujo en el backoffice (es esperable, es el rol de la app de jugadores, no de este panel admin) — confirmar que no debería poder ni loguearse acá.
6. **Home responsivo**: se rediseñó pero no se hizo el mismo nivel de QA mobile que en el login (pendiente probar 320–390px).
7. **`trivia_respuestas` desalineada con el nuevo modelo**: hoy referencia `trivia_id`, pero con preguntas separadas en `trivia_preguntas` probablemente deba apuntar a la pregunta puntual (`trivia_pregunta_id`). No migrado todavía, evaluar con el equipo de backend/BD.
8. **Insert de dos pasos sin transacción**: si falla el insert de `trivia_preguntas` después de crear la `trivia` padre, queda un registro "huérfano" sin preguntas. Evaluar mover esta lógica a una función RPC de Postgres para atomicidad.
9. **Selector de categorías y `SUPER_ADMIN`**: `CategoriaRepositoryImpl` no filtra por club cuando `club_id` es null/undefined (trae todas) — confirmar si ese es el comportamiento deseado para `SUPER_ADMIN` o si debería elegir un club primero.

## 9. Comandos útiles

```bash
yarn dev      # levanta Vite en localhost (puerto 5173, o el siguiente libre)
yarn build    # tsc -b && vite build (usarlo siempre para validar antes de dar por cerrado un cambio)
yarn lint     # eslint .
```

No usar `npx tailwindcss init` (no existe en v4) ni `yarn dlx` (es sintaxis de Yarn Berry, este repo usa Yarn Classic 1.22.22).
