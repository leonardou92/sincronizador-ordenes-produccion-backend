# API — Sincronizador Órdenes de Producción

Documentación para integración del frontend (v1.0).

## Información general

| Concepto | Valor |
|----------|--------|
| Base URL (desarrollo) | `http://localhost:3000` |
| Formato | JSON |
| Headers | `Content-Type: application/json` |
| CORS | Habilitado |
| Autenticación | No implementada |

---

## Resumen de rutas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/plantas/test-connection` | Probar conexión Global (sin guardar) |
| POST | `/plantas` | Registrar conexión |
| GET | `/plantas` | Listar conexiones |
| GET | `/plantas/:id` | Detalle conexión |
| PUT | `/plantas/:id` | Actualizar conexión |
| DELETE | `/plantas/:id` | Eliminar conexión |
| **POST** | **`/plantas/:id/sincronizar`** | **Sincroniza resumen + detalle (2 tablas)** |
| POST | `/plantas/:id/sincronizar-detalle` | Solo detalle (opcional) |
| GET | `/resumen` | Consultar resumen guardado |
| GET | `/detalle` | Consultar detalle guardado |

---

## Tablas en SQL Server (destino del sync)

| Tabla | Contenido |
|-------|-----------|
| `tbl_ordenes_produccion_resumen` | Por granja, pedido, aves/kg, prorrateo |
| `tbl_ordenes_produccion_detalle` | Reporte maestro: pollo beneficiado, vísceras, aves ahogadas, despresado |

Todas las filas sincronizadas llevan el `codigo_planta` de la conexión (ej. `PB00`).

---

## Errores estándar

**Validación (400)**

```json
{
  "error": "Validación fallida",
  "detalles": {
    "fecha_hasta": ["fecha_hasta no puede ser anterior a fecha_desde"]
  }
}
```

**Negocio (400)**

```json
{ "error": "La planta está inactiva" }
```

**Conflicto (409)**

```json
{ "error": "Ya existe otra conexión con ese codigo_planta" }
```

o

```json
{ "error": "El codigo_planta \"PB00\" ya está registrado en la conexión \"Global 2\" (id 5)." }
```

**No encontrado (404)**

```json
{ "error": "Planta no encontrada" }
```

---

## GET `/health`

```json
{ "status": "ok", "timestamp": "2026-03-13T15:30:00.000Z" }
```

---

## Conexiones Global (`/plantas`)

### POST `/plantas/test-connection`

Prueba host, puerto, usuario y base **sin guardar**.

**Body**

| Campo | Tipo | Requerido | Default |
|-------|------|-----------|---------|
| `db_type` | `"mssql"` \| `"mysql"` | No | `mssql` |
| `host` | string | Sí | — |
| `puerto` | number | Sí | — |
| `db_name` | string | Sí | — |
| `usuario` | string | Sí | — |
| `contrasena` | string | Sí | — |

> Para sincronizar, la conexión debe ser **`mysql`**.

**Respuesta 200**

```json
{
  "ok": true,
  "message": "Conexión exitosa",
  "elapsed_ms": 245
}
```

---

### POST `/plantas`

Registra una conexión. La contraseña se cifra en servidor.

**Body**

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `nombre_planta` | string | Sí | Único |
| `codigo_planta` | string | Sí | **Único** entre conexiones (ej. `PB00`) |
| `db_type` | `"mssql"` \| `"mysql"` | No | Default `mssql` |
| `host` | string | Sí | |
| `puerto` | number | No | Default `1433` (MySQL suele ser `3306`) |
| `db_name` | string | Sí | |
| `usuario` | string | Sí | |
| `contrasena` | string | Sí | Texto plano |
| `activo` | boolean | No | Default `true` |

**Ejemplo**

```json
{
  "nombre_planta": "Global 1",
  "codigo_planta": "PB00",
  "db_type": "mysql",
  "host": "192.168.1.10",
  "puerto": 3306,
  "db_name": "global_pb00",
  "usuario": "app",
  "contrasena": "Secreta123!",
  "activo": true
}
```

**Respuesta 201 — `Planta`**

```json
{
  "id": 3,
  "nombre_planta": "Global 1",
  "codigo_planta": "PB00",
  "db_type": "mysql",
  "host": "192.168.1.10",
  "puerto": 3306,
  "db_name": "global_pb00",
  "usuario": "app",
  "contrasena": "********",
  "activo": true,
  "fecha_creacion": "2026-03-13T10:00:00.000Z",
  "fecha_actualizacion": "2026-03-13T10:00:00.000Z"
}
```

---

### GET `/plantas`

**Respuesta 200:** `Planta[]`

---

### GET `/plantas/:id`

**Respuesta 200:** `Planta` | **404** si no existe

---

### PUT `/plantas/:id`

Body parcial (al menos un campo).

Si cambias `host`, `puerto`, `db_name`, `usuario` o `db_type`, debes enviar también **`contrasena`** en texto plano para validar la conexión.

**409** si `codigo_planta` o `nombre_planta` ya existen en otra conexión.

---

### DELETE `/plantas/:id`

**Respuesta 204** sin body.

---

## POST `/plantas/:id/sincronizar` (principal)

Una sola llamada:

1. Lee la base **Global MySQL** de la conexión (`id`)
2. Inserta/actualiza **`tbl_ordenes_produccion_resumen`**
3. Inserta/actualiza **`tbl_ordenes_produccion_detalle`**

**Parámetro de ruta:** `id` = ID de la conexión en `tbl_config_plantas_global`

**Body**

| Campo | Tipo | Requerido | Formato |
|-------|------|-----------|---------|
| `fecha_desde` | string | Sí | `YYYY-MM-DD` |
| `fecha_hasta` | string | Sí | `YYYY-MM-DD`, ≥ `fecha_desde` |

**Ejemplo**

```http
POST /plantas/3/sincronizar
```

```json
{
  "fecha_desde": "2026-03-01",
  "fecha_hasta": "2026-03-31"
}
```

**Respuesta 200**

```json
{
  "codigo_planta": "PB00",
  "nombre_planta": "Global 1",
  "fecha_desde": "2026-03-01",
  "fecha_hasta": "2026-03-31",
  "resumen": {
    "filas_procesadas": 48,
    "filas_upsert": 48,
    "dias_con_datos": 12
  },
  "detalle": {
    "filas_procesadas": 156,
    "filas_upsert": 156,
    "dias_con_datos": 12
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `resumen.filas_procesadas` | Filas leídas de MySQL (resumen) |
| `resumen.filas_upsert` | Filas guardadas en SQL Server |
| `resumen.dias_con_datos` | Fechas distintas con datos (resumen) |
| `detalle.*` | Igual para tabla detalle |

**Requisitos**

- Conexión existente y `activo: true`
- `db_type: "mysql"`
- Global accesible desde el servidor del backend

**Errores 400 típicos**

- `Planta no encontrada`
- `La planta está inactiva`
- `La sincronización de resumen/detalle solo está disponible para conexiones db_type=mysql`

**Nota:** primero corre resumen, luego detalle. Si falla el detalle, el resumen puede quedar ya guardado.

---

## POST `/plantas/:id/sincronizar-detalle` (opcional)

Mismo body que `/sincronizar`, pero **solo** llena `tbl_ordenes_produccion_detalle`.

**Respuesta:** mismo formato que antes (sin objeto `resumen`), con `filas_procesadas`, `filas_upsert`, `dias_con_datos` a nivel raíz.

---

## GET `/resumen`

Consulta datos ya sincronizados en `tbl_ordenes_produccion_resumen`.

**Query params**

| Param | Requerido |
|-------|-----------|
| `codigo_planta` | Sí |
| `fecha_desde` | Sí (`YYYY-MM-DD`) |
| `fecha_hasta` | Sí (`YYYY-MM-DD`) |

**Ejemplo**

```http
GET /resumen?codigo_planta=PB00&fecha_desde=2026-03-01&fecha_hasta=2026-03-31
```

**Respuesta 200**

```json
{
  "codigo_planta": "PB00",
  "fecha_desde": "2026-03-01",
  "fecha_hasta": "2026-03-31",
  "total": 48,
  "filas": [
    {
      "id": "1",
      "codigo_planta": "PB00",
      "fecha_reporte": "2026-03-13T00:00:00.000Z",
      "codigo_granja": "G001",
      "nombre_granja": "Granja Norte",
      "numero_documento": "PED-12345",
      "aves_granja": 5000,
      "kg_granja": 12500.5,
      "peso_prom_granja": 2.5,
      "aves_produccion": 4800,
      "kg_produccion": 12000,
      "peso_prom_produccion": 2.5,
      "fecha_sincronizacion": "2026-03-13T18:00:00.000Z"
    }
  ]
}
```

---

## GET `/detalle`

Consulta `tbl_ordenes_produccion_detalle`. Mismos query params que `/resumen`.

**Respuesta 200**

```json
{
  "codigo_planta": "PB00",
  "fecha_desde": "2026-03-01",
  "fecha_hasta": "2026-03-31",
  "total": 120,
  "filas": [
    {
      "id": "10",
      "codigo_planta": "PB00",
      "fecha_reporte": "2026-03-13T00:00:00.000Z",
      "codigo": "260011",
      "referencia": "Pollo Beneficiado Entero",
      "unidades": 15000,
      "promedio": 2.1,
      "kg": 31500,
      "categoria": "POLLO BENEFICIADO",
      "fecha_sincronizacion": "2026-03-13T18:00:00.000Z"
    }
  ]
}
```

**Categorías posibles en detalle (reporte maestro):**

- `POLLO BENEFICIADO`
- `VICERAS`
- `AVES AHOGADAS`
- `DESPRESADO - ENTRADAS (Materia Prima)`
- `DESPRESADO - SALIDAS (Cortes Comerciales)`
- `DESPRESADO - SUBPRODUCTOS / MERMA INDUSTRIAL`
- `DESPRESADO - REVISAR (Códigos No Usar)`

---

## Tipos TypeScript

```typescript
const API = "http://localhost:3000";

type DbType = "mssql" | "mysql";

interface Planta {
  id: number;
  nombre_planta: string;
  codigo_planta: string;
  db_type: DbType;
  host: string;
  puerto: number;
  db_name: string;
  usuario: string;
  contrasena: string; // "********" en lecturas
  activo: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

interface SincronizarRequest {
  fecha_desde: string;
  fecha_hasta: string;
}

interface SincronizarTablaStats {
  filas_procesadas: number;
  filas_upsert: number;
  dias_con_datos: number;
}

interface SincronizarResponse {
  codigo_planta: string;
  nombre_planta: string;
  fecha_desde: string;
  fecha_hasta: string;
  resumen: SincronizarTablaStats;
  detalle: SincronizarTablaStats;
}

interface ResumenFila {
  id: string;
  codigo_planta: string;
  fecha_reporte: string;
  codigo_granja: string;
  nombre_granja: string;
  numero_documento: string;
  aves_granja: number;
  kg_granja: number;
  peso_prom_granja: number | null;
  aves_produccion: number;
  kg_produccion: number;
  peso_prom_produccion: number | null;
  fecha_sincronizacion: string;
}

interface DetalleFila {
  id: string;
  codigo_planta: string;
  fecha_reporte: string;
  codigo: string;
  referencia: string;
  unidades: number;
  promedio: number;
  kg: number;
  categoria: string;
  fecha_sincronizacion: string;
}

interface ListadoResponse<T> {
  codigo_planta: string;
  fecha_desde: string;
  fecha_hasta: string;
  total: number;
  filas: T[];
}
```

---

## Ejemplos fetch

```typescript
async function sincronizar(plantaId: number, fechaDesde: string, fechaHasta: string) {
  const res = await fetch(`${API}/plantas/${plantaId}/sincronizar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw err;
  }
  return res.json() as Promise<SincronizarResponse>;
}

async function obtenerResumen(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
) {
  const params = new URLSearchParams({
    codigo_planta: codigoPlanta,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
  });
  const res = await fetch(`${API}/resumen?${params}`);
  if (!res.ok) throw await res.json();
  return res.json() as Promise<ListadoResponse<ResumenFila>>;
}

async function obtenerDetalle(
  codigoPlanta: string,
  fechaDesde: string,
  fechaHasta: string
) {
  const params = new URLSearchParams({
    codigo_planta: codigoPlanta,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
  });
  const res = await fetch(`${API}/detalle?${params}`);
  if (!res.ok) throw await res.json();
  return res.json() as Promise<ListadoResponse<DetalleFila>>;
}
```

---

## Flujo recomendado en UI

### Alta de conexión

1. Formulario con datos + `codigo_planta` (único).
2. `POST /plantas/test-connection`.
3. Si OK → `POST /plantas` → guardar `id` devuelto.

### Sincronizar período

1. `GET /plantas` → usuario elige conexión (`id`, `codigo_planta`, `db_type === "mysql"`).
2. Selector de rango `fecha_desde` / `fecha_hasta`.
3. `POST /plantas/{id}/sincronizar`.
4. Mostrar `resumen` y `detalle` stats.
5. Pantallas de consulta: `GET /resumen` y `GET /detalle` con `codigo_planta` + fechas.

### Reglas de negocio

- **`codigo_planta`**: único en todo el sistema (no repetir en otra conexión).
- **`nombre_planta`**: único.
- Solo conexiones **`mysql`** pueden sincronizar.
- Cada conexión apunta a **su propia** base Global; el `codigo_planta` etiqueta los datos en SQL Server.

---

*Backend v1.0 — Sincronizador Órdenes Producción*
