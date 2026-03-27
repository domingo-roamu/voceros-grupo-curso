# PRD — Tesorería 7D
**Producto:** Sistema de gestión financiera y comunicaciones para el curso  
**Versión:** 1.0 — MVP  
**Autor:** Product Manager  
**Stack:** Next.js (App Router) · Supabase · Vercel · Resend · GitHub  
**Dominio:** `tesoreria-7d.vercel.app` (gratuito, sin compra de dominio)

---

## 1. Contexto y problema

La directiva del curso maneja actualmente las finanzas en un Excel compartido con estructura manual por año (ingresos por cuotas y eventos, egresos por categorías como paseos, colaciones y celebraciones). La lista de apoderados con sus correos vive en el mismo archivo. No existe un canal estructurado para:

- Compartir el estado financiero con los apoderados de forma transparente
- Enviar reportes y comunicados de forma masiva y programada
- Gestionar el cobro de cuotas y hacer seguimiento de morosidad
- Publicar anuncios del curso en un lugar centralizado

---

## 2. Objetivo del producto

Construir una plataforma web liviana que permita a 2–3 admins de la directiva gestionar las finanzas del curso, publicar anuncios, y comunicarse con apoderados mediante reportes automáticos por correo — con una URL pública de solo lectura para que cualquier apoderado consulte el estado del curso sin necesidad de login.

---

## 3. Usuarios

| Rol | Descripción | Acceso |
|---|---|---|
| **Admin** | Tesorero/a o miembro de directiva | Login con email/password. CRUD completo. |
| **Apoderado** | Padre o madre de alumno | URL pública de solo lectura. Sin login. |

> No se requiere sistema de roles diferenciados entre admins en v1. Todos los admins tienen los mismos permisos.

---

## 4. Stack técnico

| Capa | Tecnología | Uso |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | UI admin + vista pública |
| Backend / API | Next.js API Routes (Node.js) | Lógica de negocio |
| Base de datos | Supabase (PostgreSQL) | Datos, auth, storage |
| Autenticación | Supabase Auth (email/password) | Login de admins |
| Email | Resend | Envío de reportes masivos |
| Deploy | Vercel | Hosting + cron jobs |
| Repositorio | GitHub | Control de versiones |

---

## 5. Módulos del sistema

### 5.1 Autenticación (Admin)

**Descripción:** Login seguro para admins. No hay registro público — los admins son creados directamente en Supabase o por un admin existente.

**Funcionalidades:**
- Login con email y contraseña (Supabase Auth)
- Logout
- Protección de todas las rutas `/admin/*` mediante middleware de Next.js
- Gestión básica de admins: listar, invitar (envío de magic link) y eliminar desde panel

**Notas técnicas:**
- Usar `@supabase/ssr` con cookies para manejo de sesión en App Router
- Middleware en `middleware.ts` redirige a `/login` si no hay sesión activa
- No implementar recuperación de contraseña pública en v1 (usar Supabase dashboard)

---

### 5.2 Finanzas

**Descripción:** Registro y visualización de movimientos financieros de la caja del curso. Una sola cuenta/caja.

#### 5.2.1 Modelo de datos — `transactions`

```sql
transactions (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  type        text not null check (type in ('income', 'expense')),
  category    text not null,        -- ej: 'PASEO DE CURSO', 'CUOTAS', 'KERMESSE'
  description text,                 -- detalle libre
  amount      numeric(12,2) not null,
  year        int not null,         -- año del período (2024, 2025, 2026...)
  created_by  uuid references auth.users,
  created_at  timestamptz default now()
)
```

**Categorías predefinidas (seed desde el Excel existente):**

*Ingresos:* `CUOTAS`, `KERMESSE`, `OTRO INGRESO`

*Egresos:* `PASEO DE CURSO`, `DÍA DEL ALUMNO`, `COLACIÓN COMPARTIDA`, `CLASS MERIT`, `CELEBRACIÓN 18`, `DÍA DEL AUXILIAR`, `DÍA DEL PROFESOR`, `FIESTA GRADUACIÓN`, `OBSEQUIO`, `OTRO EGRESO`

#### 5.2.2 Funcionalidades admin

- **Agregar movimiento:** Formulario con campos fecha, tipo (ingreso/egreso), categoría (select + opción "otro"), descripción, monto
- **Editar / eliminar** movimiento existente
- **Vista de movimientos:** Tabla con filtros por año, tipo y categoría. Ordenada por fecha descendente
- **Resumen financiero:** Tarjetas con Total Ingresos, Total Egresos y Saldo actual del período seleccionado
- **Selector de período:** Dropdown para cambiar entre años (2024, 2025, 2026…)

#### 5.2.3 Vista pública de finanzas

- Resumen del período activo: ingresos, egresos, saldo
- Tabla de movimientos (sin columna "creado por")
- Gráfico de torta o barras por categoría de egreso
- **No se muestra** información de cuotas individuales por alumno en esta vista

---

### 5.3 Gestión de Cuotas

**Descripción:** Módulo separado para el seguimiento de pago de cuotas por alumno. Importado desde el Excel base.

#### 5.3.1 Modelo de datos

```sql
students (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  parent1_name  text,
  parent1_email text,
  parent2_name  text,
  parent2_email text,
  active      boolean default true
)

quota_payments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references students(id),
  year        int not null,
  quota_number int not null,   -- 1, 2, 3...
  amount      numeric(12,2),
  paid_at     date,
  is_paid     boolean default false,
  notes       text
)
```

#### 5.3.2 Funcionalidades admin

- Vista de grilla por alumno × cuota (similar al Excel) con checkboxes para marcar pagos
- Registrar pago: fecha, monto, notas opcionales
- Importación inicial desde Excel (script de seed, no UI en v1)

#### 5.3.3 Feature: Recordatorio de Morosidad (3 niveles de escalada)

**Nivel 1 — Recordatorio anónimo masivo**
- El admin activa un envío masivo a TODOS los apoderados
- El correo dice genéricamente que hay cuotas pendientes, sin nombrar a nadie
- Botón: "Enviar recordatorio de cuotas" → confirmación → disparo con Resend

**Nivel 2 — Recordatorio individual privado**
- El admin selecciona uno o varios alumnos con cuotas impagas
- Se envía correo personalizado solo a los apoderados de ese alumno
- El correo menciona al alumno y el detalle de la deuda
- No es visible para otros apoderados

**Nivel 3 — Exposición pública (toggle admin)**
- En la URL pública, el admin puede activar un banner/sección de "Estado de cuotas"
- Toggle en el panel admin: `mostrar_cuotas_publico: boolean`
- Cuando está activo, la URL pública muestra una tabla con nombre del alumno y estado (✅ / ❌)
- El admin decide cuándo encender y apagar esta visibilidad

---

### 5.4 Anuncios

**Descripción:** Sección de comunicados del curso, visible en la URL pública y gestionable desde el panel admin.

#### 5.4.1 Modelo de datos

```sql
announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,          -- texto enriquecido (markdown o HTML simple)
  is_pinned   boolean default false,  -- aparece primero
  published_at timestamptz,
  created_by  uuid references auth.users,
  created_at  timestamptz default now()
)
```

#### 5.4.2 Funcionalidades admin

- Crear, editar y eliminar anuncios
- Editor de texto con soporte básico (negrita, listas, links) — usar `react-simple-wysiwyg` o similar liviano
- Marcar como fijado (pinned) para que aparezca primero
- Los anuncios son públicos por defecto al crearlos

#### 5.4.3 Vista pública

- Feed de anuncios ordenados por fecha (los fijados van primero)
- Diseño tipo card limpio y legible en mobile

---

### 5.5 Reportes y Envíos Masivos

**Descripción:** Sistema de envío de correos a la lista de apoderados, con soporte para envíos manuales y programados.

#### 5.5.1 Lista de destinatarios

- Se construye automáticamente desde la tabla `students` (parent1_email + parent2_email donde existan)
- El admin puede ver, agregar y eliminar correos manualmente desde el panel
- Importación inicial desde el Excel existente (script de seed)

#### 5.5.2 Contenido del reporte

El correo de reporte incluye:
1. **Resumen financiero del período:** total ingresos, total egresos, saldo actual
2. **Anuncios recientes** (últimos 3 publicados)
3. **Link prominente a la URL pública** para ver el detalle completo
4. Pie de correo con nombre del curso y año

> El estado de cuotas individuales NO se incluye en el reporte general. Para eso existe el flujo de recordatorio de morosidad (Módulo 5.3.3).

#### 5.5.3 Configuración de envíos programados

Tabla en Supabase:

```sql
report_schedules (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,        -- ej: "Reporte Mensual Marzo"
  frequency     text not null check (frequency in ('manual', 'weekly', 'monthly', 'custom')),
  custom_date   date,                 -- para envío en fecha específica
  day_of_week   int,                  -- 0-6, para weekly
  day_of_month  int,                  -- 1-31, para monthly
  last_sent_at  timestamptz,
  is_active     boolean default true,
  created_by    uuid references auth.users
)
```

**Desde el panel admin:**
- Crear una programación: elegir nombre, frecuencia (manual, semanal, mensual, fecha específica)
- Ver listado de programaciones activas con fecha del último envío
- Botón "Enviar ahora" para disparo manual inmediato
- Activar / desactivar programaciones

**Ejecución técnica:**
- Vercel Cron Jobs (`vercel.json`) ejecuta un endpoint `/api/cron/send-reports` cada día a las 08:00
- El cron revisa qué schedules corresponde enviar ese día y despacha con Resend
- Resend batch API para envío masivo eficiente

**Template de correo:**
- HTML responsivo con Tailwind inline styles
- Logo/nombre del curso en el header
- Secciones claramente separadas: Finanzas · Anuncios · Ver más

---

### 5.6 URL Pública de Solo Lectura

**Ruta:** `tesoreria-7d.vercel.app/` (raíz del sitio)

**Contenido:**
- Header con nombre del curso y año
- Resumen financiero: 3 tarjetas (Ingresos / Egresos / Saldo)
- Tabla de movimientos del período activo
- Gráfico de distribución de egresos por categoría
- Sección de anuncios (feed de cards)
- Sección de estado de cuotas (solo visible si el admin activó el toggle)
- Footer con link a reportar error (correo del curso)

**Restricciones:**
- Solo lectura. Sin formularios, sin botones de acción
- Sin datos sensibles (no muestra emails de apoderados)
- Datos actualizados en tiempo real (Supabase Realtime o ISR de 60s)
- No requiere autenticación para acceder

---

## 6. Navegación del Panel Admin

```
/login                    → Login de admins
/admin                    → Dashboard (resumen general)
/admin/finanzas           → Movimientos + agregar/editar
/admin/cuotas             → Grilla de pagos + recordatorios
/admin/anuncios           → CRUD de anuncios
/admin/reportes           → Programación de envíos + enviar ahora
/admin/apoderados         → Lista de destinatarios (emails)
/admin/configuracion      → Admins, toggle público de cuotas, período activo
```

---

## 7. Esquema de base de datos completo (resumen)

```
auth.users          ← Supabase Auth (admins)
students            ← Alumnos y emails de apoderados
transactions        ← Movimientos de caja
quota_payments      ← Pagos de cuotas por alumno
announcements       ← Comunicados del curso
report_schedules    ← Programación de envíos
app_settings        ← Configuración global (toggle cuotas públicas, período activo, etc.)
```

Row Level Security (RLS) en Supabase:
- Tablas de escritura: solo accesible con JWT de admin autenticado
- Tablas de lectura pública: `transactions`, `announcements`, `app_settings` con policy `SELECT` para `anon`

---

## 8. Fases de desarrollo (MVP primero)

### Fase 1 — MVP (entregar primero)
- [ ] Setup: Next.js + Supabase + Vercel + Resend + GitHub
- [ ] Auth: login/logout de admins, middleware de protección
- [ ] Finanzas: CRUD de movimientos, resumen, filtros por año
- [ ] URL pública: vista de finanzas y anuncios
- [ ] Anuncios: CRUD básico en admin + vista pública
- [ ] Seed inicial: importar datos del Excel (2024/2025/2026) y lista de alumnos/correos

### Fase 2 — Reportes
- [ ] Configuración de programaciones de envío
- [ ] Template HTML de correo con Resend
- [ ] Envío manual desde panel
- [ ] Vercel Cron para envíos automáticos

### Fase 3 — Cuotas
- [ ] Grilla de pagos por alumno
- [ ] Recordatorio anónimo masivo (Nivel 1)
- [ ] Recordatorio individual (Nivel 2)
- [ ] Toggle de exposición pública de morosos (Nivel 3)

---

## 9. Diseño UI — Mobile-First (requisito no negociable)

> ⚠️ **Principio central del producto:** Tanto la URL pública como el panel admin deben funcionar perfectamente en teléfono. Los apoderados revisarán desde el celular, y los admins también cargarán movimientos desde el suyo. Ninguna pantalla puede quedar rota o incómoda en mobile.

### Reglas de diseño obligatorias

- **Breakpoint base = 375px** (iPhone SE). Diseñar desde ahí hacia arriba, nunca al revés
- **Touch targets mínimo 44px** en todos los botones, checkboxes y links
- **Tipografía mínima 16px** en body para evitar zoom automático en iOS
- **Formularios apilados verticalmente** — sin columnas en pantallas < 640px
- **Tablas con scroll horizontal** cuando el contenido no cabe, nunca truncar datos
- **Bottom navigation** en el panel admin (barra inferior fija) en lugar de sidebar para mobile
- **Modales full-screen** en mobile para formularios de ingreso de datos
- **Gráficos responsivos** — Recharts con `ResponsiveContainer` al 100% del ancho

### Componentes críticos en mobile

| Componente | Comportamiento mobile |
|---|---|
| Tabla de movimientos | Scroll horizontal + filas compactas |
| Formulario nuevo movimiento | Modal full-screen o página dedicada |
| Grilla de cuotas | Vista de cards apiladas (no tabla) |
| Resumen financiero | 3 tarjetas en columna única |
| Anuncios | Cards full-width apiladas |
| Navegación admin | Tab bar fija en la parte inferior |
| Reportes / programación | Formulario vertical simple |

### Tipografía y colores
- **Tipografía:** Inter o Geist (default de Next.js)
- **Colores:** Verde para saldo positivo/ingresos, rojo para egresos, gris neutro para UI base
- **Contraste:** Cumplir WCAG AA mínimo (relación 4.5:1) para legibilidad en exteriores

### Herramientas
- **Componentes:** shadcn/ui (instalación selectiva, no toda la librería)
- **Gráficos:** Recharts con `ResponsiveContainer`
- **CSS:** Tailwind mobile-first por convención (`sm:`, `md:` solo para ampliar en desktop)
- **Sin dashboard complejo en MVP:** Prioridad a funcionalidad sobre estética en Fase 1

---

## 10. Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=tesoreria7d@tudominio.com   # o usar el dominio de Resend

# App
NEXT_PUBLIC_APP_URL=https://tesoreria-7d.vercel.app
CRON_SECRET=                                   # token para proteger el endpoint del cron
```

---

## 11. Lo que queda fuera de scope (v1)

- ❌ App móvil nativa
- ❌ Múltiples cursos / colegios
- ❌ Integración con bancos o medios de pago
- ❌ Roles diferenciados entre admins (ej: solo lectura vs editor)
- ❌ Historial de auditoría de cambios
- ❌ Exportar a PDF o Excel desde la plataforma
- ❌ Recuperación de contraseña vía UI propia (usar Supabase dashboard)
- ❌ Dominio personalizado (puede agregarse en v2 conectando a Vercel, costo ~$10/año)

---

*PRD generado con base en el archivo `TESORERIA_7D.xlsx` y sesión de discovery.*  
*Listo para ser usado como contexto de entrada en Claude Code.*
