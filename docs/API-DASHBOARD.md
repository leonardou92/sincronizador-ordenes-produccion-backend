# API Dashboard — Gráficos y KPIs

Documentación para el equipo frontend. Endpoints optimizados para dashboards con datos **ya agregados** (no requiere sumar filas en el cliente).

## Información general

| Concepto | Valor |
|----------|--------|
| Base URL (desarrollo) | `http://localhost:3000` |
| Prefijo | `/dashboard` |
| Formato | JSON |
| Autenticación | No requerida actualmente |

---

## Parámetros comunes

Todos los endpoints de métricas (excepto `estado-sync`) comparten estos query params:

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `codigo_planta` | string | Sí | Código de la planta (ej. `PB00`) |
| `fecha_desde` | string | Sí | Inicio del rango, formato `YYYY-MM-DD` |
| `fecha_hasta` | string | Sí | Fin del rango, formato `YYYY-MM-DD` |

**Ejemplo de URL:**

```
GET /dashboard/kpis?codigo_planta=PB00&fecha_desde=2026-06-01&fecha_hasta=2026-06-30
```

### Objeto `meta` (presente en todas las respuestas de métricas)

```json
{
  "codigo_planta": "PB00",
  "fecha_desde": "2026-06-01",
  "fecha_hasta": "2026-06-30",
  "generado_en": "2026-06-30T14:22:00.000Z"
}
```

---

## Resumen de endpoints

| Método | Ruta | Uso en UI |
|--------|------|-----------|
| GET | `/dashboard/kpis` | Tarjetas KPI del período |
| GET | `/dashboard/produccion-diaria` | Líneas / área: producción por día |
| GET | `/dashboard/granjas` | Barras horizontales: ranking por granja |
| GET | `/dashboard/categorias` | Dona / pie: mix de producción |
| GET | `/dashboard/categorias-serie` | Área apilada: kg por categoría y día |
| GET | `/dashboard/top-productos` | Barras: top productos por kg |
| GET | `/dashboard/insumos-sap` | Consumo vs averiado (SAP) |
| GET | `/dashboard/estado-sync` | Indicadores de última sincronización |

---

## GET `/dashboard/kpis`

Indicadores consolidados del período. Ideal para **4–6 tarjetas** en la parte superior del dashboard.

### Respuesta 200

```json
{
  "meta": { "codigo_planta": "PB00", "fecha_desde": "2026-06-01", "fecha_hasta": "2026-06-30", "generado_en": "..." },
  "kpis": {
    "aves_granja": 125400,
    "kg_granja": 187500.5,
    "aves_produccion": 124800,
    "kg_produccion": 95200.25,
    "peso_prom_granja": 1.49,
    "peso_prom_produccion": 0.76,
    "rendimiento_kg_pct": 50.77,
    "rendimiento_aves_pct": 99.52,
    "granjas_activas": 12,
    "dias_con_datos": 22,
    "kg_detalle_total": 94800.0,
    "unidades_detalle_total": 124500
  }
}
```

| Campo | Unidad | Descripción |
|-------|--------|-------------|
| `aves_granja` | enteros | Total aves recibidas de granja |
| `kg_granja` | kg (2 dec.) | Total kg de granja |
| `aves_produccion` | enteros | Aves prorrateadas a producción |
| `kg_produccion` | kg (2 dec.) | Kg netos de producción |
| `peso_prom_granja` | kg/ave | `kg_granja / aves_granja` |
| `peso_prom_produccion` | kg/ave | `kg_produccion / aves_produccion` |
| `rendimiento_kg_pct` | % | `kg_produccion / kg_granja × 100` |
| `rendimiento_aves_pct` | % | `aves_produccion / aves_granja × 100` |
| `granjas_activas` | count | Granjas distintas en el período |
| `dias_con_datos` | count | Días con al menos un registro |
| `kg_detalle_total` | kg | Suma del detalle (sin insumos SAP) |
| `unidades_detalle_total` | enteros | Unidades del detalle (sin insumos SAP) |

### Gráfico sugerido

- **Stat cards** con variación vs período anterior (calcular en frontend con dos llamadas).

---

## GET `/dashboard/produccion-diaria`

Serie temporal diaria. Datos listos para **Recharts `LineChart`**, **Chart.js line**, **ApexCharts area**.

### Respuesta 200

```json
{
  "meta": { "...": "..." },
  "serie": [
    {
      "fecha": "2026-06-01",
      "aves_granja": 5800,
      "kg_granja": 8650.5,
      "aves_produccion": 5750,
      "kg_produccion": 4380.25,
      "peso_prom_granja": 1.49,
      "peso_prom_produccion": 0.76
    }
  ]
}
```

### Gráficos sugeridos

| Gráfico | Eje X | Series Y |
|---------|-------|----------|
| Producción kg | `fecha` | `kg_granja`, `kg_produccion` |
| Aves granja vs producción | `fecha` | `aves_granja`, `aves_produccion` |
| Peso promedio | `fecha` | `peso_prom_granja`, `peso_prom_produccion` |

### Tip frontend

```typescript
const res = await fetch(
  `/dashboard/produccion-diaria?codigo_planta=PB00&fecha_desde=2026-06-01&fecha_hasta=2026-06-30`
);
const { serie } = await res.json();

// Recharts: data={serie} — X: fecha, líneas: kg_granja, kg_produccion
```

---

## GET `/dashboard/granjas`

Ranking de granjas ordenado por `kg_produccion` descendente. Para **bar chart horizontal**.

### Respuesta 200

```json
{
  "meta": { "...": "..." },
  "granjas": [
    {
      "codigo_granja": "G001",
      "nombre_granja": "Granja Norte",
      "aves_granja": 12000,
      "kg_granja": 17800.5,
      "aves_produccion": 11900,
      "kg_produccion": 9100.25,
      "rendimiento_kg_pct": 51.12
    }
  ]
}
```

### Gráfico sugerido

- Barras: `nombre_granja` (eje Y) × `kg_produccion` (eje X).
- Tooltip: incluir `rendimiento_kg_pct`.

---

## GET `/dashboard/categorias`

Distribución por categoría de producción (excluye insumos SAP). Para **pie / donut chart**.

Categorías típicas: `POLLO BENEFICIADO`, `VICERAS`, `AVES AHOGADAS`, `DESPRESADO - *`.

### Respuesta 200

```json
{
  "meta": { "...": "..." },
  "categorias": [
    {
      "categoria": "POLLO BENEFICIADO",
      "kg": 72000.5,
      "unidades": 95000,
      "porcentaje_kg": 75.8
    },
    {
      "categoria": "VICERAS",
      "kg": 15200.0,
      "unidades": 0,
      "porcentaje_kg": 16.0
    }
  ]
}
```

### Gráfico sugerido

- Dona: `categoria` × `porcentaje_kg` o `kg`.
- Leyenda con `kg` formateado (`72,000.5 kg`).

---

## GET `/dashboard/categorias-serie`

Formato **long** (una fila por fecha + categoría). Ideal para **área apilada** o **barras agrupadas por día**.

### Respuesta 200

```json
{
  "meta": { "...": "..." },
  "serie": [
    { "fecha": "2026-06-01", "categoria": "POLLO BENEFICIADO", "kg": 3200.5 },
    { "fecha": "2026-06-01", "categoria": "VICERAS", "kg": 680.0 },
    { "fecha": "2026-06-02", "categoria": "POLLO BENEFICIADO", "kg": 3100.0 }
  ]
}
```

### Pivot en frontend (opcional)

Si la librería necesita formato wide:

```typescript
function pivotCategorias(serie: { fecha: string; categoria: string; kg: number }[]) {
  const byDate = new Map<string, Record<string, number>>();
  for (const row of serie) {
    if (!byDate.has(row.fecha)) byDate.set(row.fecha, { fecha: row.fecha } as Record<string, number>);
    byDate.get(row.fecha)![row.categoria] = row.kg;
  }
  return [...byDate.values()];
}
```

---

## GET `/dashboard/top-productos`

Top N productos por kg en el período.

### Query params adicionales

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limite` | number | `10` | Cantidad de productos (1–50) |

### Respuesta 200

```json
{
  "meta": { "...", "limite": 10 },
  "productos": [
    {
      "codigo": "300101",
      "referencia": "PECHUGA SIN HUESO",
      "categoria": "POLLO BENEFICIADO",
      "kg": 12500.5,
      "unidades": 18500,
      "promedio": 0.68
    }
  ]
}
```

### Gráfico sugerido

- Barras verticales: `referencia` × `kg` (truncar etiquetas largas).
- Color por `categoria`.

---

## GET `/dashboard/insumos-sap`

Métricas de insumos sincronizados desde SAP. Solo incluye categorías:
`INSUMO POLLO BENEFICIADO`, `INSUMO DESPRESADO`, `OTRO INSUMO`.

> **Convención de campos SAP en detalle:** `unidades` = TOTAL, `promedio` = CONSUMO, `kg` = AVERIADO.

### Respuesta 200

```json
{
  "meta": { "...": "..." },
  "serie": [
    {
      "fecha": "2026-06-01",
      "total": 1500.5,
      "consumo": 1420.0,
      "averiado": 80.5,
      "tasa_averia_pct": 5.37
    }
  ],
  "por_categoria": [
    {
      "categoria": "INSUMO POLLO BENEFICIADO",
      "total": 8500.0,
      "consumo": 8100.0,
      "averiado": 400.0,
      "tasa_averia_pct": 4.71
    }
  ]
}
```

### Gráficos sugeridos

| Gráfico | Datos | Series |
|---------|-------|--------|
| Barras apiladas diarias | `serie` | `consumo`, `averiado` por `fecha` |
| Dona por tipo | `por_categoria` | `total` o `consumo` |
| KPI avería | `por_categoria` | `tasa_averia_pct` |

---

## GET `/dashboard/estado-sync`

Estado de sincronización por planta. **No requiere rango de fechas.**

### Query params (opcionales)

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `codigo_planta` | string | Filtrar una sola planta |

### Respuesta 200

```json
{
  "meta": { "generado_en": "2026-06-30T14:22:00.000Z" },
  "plantas": [
    {
      "codigo_planta": "PB00",
      "nombre_planta": "Planta Barquisimeto",
      "activo": true,
      "ultima_sync_resumen": "2026-06-30T08:15:00.000Z",
      "ultima_sync_detalle": "2026-06-30T08:16:30.000Z",
      "ultimo_dato_resumen": "2026-06-29",
      "ultimo_dato_detalle": "2026-06-29",
      "filas_resumen": 15420,
      "filas_detalle": 8930
    }
  ]
}
```

### Uso en UI

- Badge “Última actualización” en el header.
- Tabla de plantas con indicador verde/amarillo según antigüedad de `ultima_sync_*`.
- Llamar `GET /plantas` para el selector y este endpoint para el estado.

---

## Flujo recomendado del dashboard

```
1. GET /plantas                    → selector de planta
2. GET /dashboard/estado-sync      → badge última sync
3. GET /dashboard/kpis             → tarjetas superiores
4. GET /dashboard/produccion-diaria → gráfico principal
5. GET /dashboard/categorias       → dona lateral
6. GET /dashboard/granjas          → ranking
7. GET /dashboard/top-productos    → tabla / barras
8. GET /dashboard/insumos-sap      → sección SAP (si aplica)
```

Todas las llamadas del paso 3–8 pueden ejecutarse en **paralelo** con `Promise.all`.

---

## Tipos TypeScript (copiar al frontend)

```typescript
export type DashboardMeta = {
  codigo_planta: string;
  fecha_desde: string;
  fecha_hasta: string;
  generado_en: string;
};

export type DashboardKpis = {
  aves_granja: number;
  kg_granja: number;
  aves_produccion: number;
  kg_produccion: number;
  peso_prom_granja: number | null;
  peso_prom_produccion: number | null;
  rendimiento_kg_pct: number | null;
  rendimiento_aves_pct: number | null;
  granjas_activas: number;
  dias_con_datos: number;
  kg_detalle_total: number;
  unidades_detalle_total: number;
};

export type ProduccionDiariaItem = {
  fecha: string;
  aves_granja: number;
  kg_granja: number;
  aves_produccion: number;
  kg_produccion: number;
  peso_prom_granja: number | null;
  peso_prom_produccion: number | null;
};

export type GranjaRankingItem = {
  codigo_granja: string;
  nombre_granja: string;
  aves_granja: number;
  kg_granja: number;
  aves_produccion: number;
  kg_produccion: number;
  rendimiento_kg_pct: number | null;
};

export type CategoriaItem = {
  categoria: string;
  kg: number;
  unidades: number;
  porcentaje_kg: number;
};

export type CategoriaSerieItem = {
  fecha: string;
  categoria: string;
  kg: number;
};

export type TopProductoItem = {
  codigo: string;
  referencia: string;
  categoria: string;
  kg: number;
  unidades: number;
  promedio: number | null;
};

export type InsumoSapDiarioItem = {
  fecha: string;
  total: number;
  consumo: number;
  averiado: number;
  tasa_averia_pct: number | null;
};

export type EstadoSyncItem = {
  codigo_planta: string;
  nombre_planta: string;
  activo: boolean;
  ultima_sync_resumen: string | null;
  ultima_sync_detalle: string | null;
  ultimo_dato_resumen: string | null;
  ultimo_dato_detalle: string | null;
  filas_resumen: number;
  filas_detalle: number;
};
```

---

## Formato de números en UI

| Tipo | Formato sugerido | Ejemplo |
|------|-----------------|---------|
| Kg | `es-VE`, 2 decimales | `95,200.25 kg` |
| Aves / unidades | `es-VE`, 0 decimales | `125,400` |
| Porcentajes | 1–2 decimales + `%` | `50.8%` |
| Fechas eje X | `DD/MM` o `dd MMM` | `01/06` |

---

## Errores

**400 — Validación**

```json
{
  "error": "Validación fallida",
  "detalles": {
    "fecha_hasta": ["fecha_hasta no puede ser anterior a fecha_desde"]
  }
}
```

**500 — Error interno**

```json
{ "error": "No se pudieron obtener los KPIs" }
```

---

## Layout sugerido (wireframe)

```
┌─────────────────────────────────────────────────────────────┐
│  Planta [PB00 ▼]   01/06/2026 – 30/06/2026   ● Sync 08:15  │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│ Kg Prod  │ Aves     │ Rendim.  │ Granjas  │ Días c/ datos    │
│ 95,200   │ 124,800  │ 50.8%    │ 12       │ 22               │
├──────────────────────────────────────┬──────────────────────┤
│  Producción diaria (línea/área)     │  Mix categorías (dona)│
│  /dashboard/produccion-diaria       │  /dashboard/categorias│
├──────────────────────────────────────┼──────────────────────┤
│  Ranking granjas (barras H)         │  Top productos        │
│  /dashboard/granjas                 │  /dashboard/top-...   │
├──────────────────────────────────────┴──────────────────────┤
│  Insumos SAP: consumo vs averiado (/dashboard/insumos-sap)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Endpoints raw (tablas detalladas)

Si el frontend necesita filas sin agregar (export Excel, tablas editables), usar los endpoints existentes:

- `GET /resumen?codigo_planta&fecha_desde&fecha_hasta`
- `GET /detalle?codigo_planta&fecha_desde&fecha_hasta`

Ver `docs/API-FRONTEND.md` para el detalle completo.
