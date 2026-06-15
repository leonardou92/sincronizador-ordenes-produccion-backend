# Sincronizador Órdenes Producción — Backend + ETL

Consolidación de datos de producción desde múltiples bases **Global** (por planta) y **SAP**, con conexiones dinámicas gestionadas en SQL Server.

## Estructura del proyecto

```
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── sql/                          # Referencia legacy (usar Prisma)
├── src/
│   ├── config/env.ts             # Variables de entorno validadas
│   ├── security/crypto.ts        # AES-256-GCM (contraseñas plantas)
│   ├── db/prisma.ts              # Cliente Prisma (BD control)
│   ├── db/controlDb.ts           # Conexiones dinámicas a plantas Global
│   ├── services/plantasService.ts
│   ├── routes/plantas.ts         # CRUD REST
│   ├── etl/                      # Extracción y merge
│   ├── cli/encrypt-password.ts   # Utilidad cifrado
│   └── index.ts                  # API Fastify
├── package.json
└── .env.example
```

## Requisitos

- Node.js 18+
- SQL Server (BD de control según `.env`)
- Llave `ENCRYPTION_KEY` en `.env` (32 bytes Base64)

## Instalación

```bash
npm install
cp .env.example .env
# Editar .env con credenciales reales
npm run encrypt-password -- --generate-key
# Copiar la llave generada a ENCRYPTION_KEY en .env
```

## Base de datos (Prisma)

El esquema vive en `prisma/schema.prisma`. Crear tablas en SQL Server:

```bash
# Desarrollo (crea/aplica migraciones)
npm run db:migrate:dev

# Producción / CI
npm run db:migrate

# Alternativa rápida sin historial de migraciones
npm run db:push
```

Modelos:

- `ConfigPlantaGlobal` → `tbl_config_plantas_global`
- `ResumenOrdenProduccion` → `tbl_ordenes_produccion_resumen`
- `DetalleProduccion` → `tbl_ordenes_produccion_detalle`
- `ProduccionConsolidada` → `tbl_produccion_consolidada`

En cada BD **Global** de planta (fuera de Prisma): tabla `dbo.produccion_global`

## API REST

```bash
npm run dev
```

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/plantas` | Alta (cifra contraseña) |
| GET | `/plantas` | Listado (contraseña enmascarada) |
| GET | `/plantas/:id` | Detalle |
| PUT | `/plantas/:id` | Actualización / activar-desactivar |
| POST | `/plantas/:id/sincronizar` | Sincroniza resumen OP desde Global (MySQL) |
| GET | `/health` | Health check |

### Ejemplo POST `/plantas`

```json
{
  "nombre_planta": "Planta Norte",
  "codigo_planta": "PL001",
  "db_type": "mssql",
  "host": "sql-planta-norte.local",
  "puerto": 1433,
  "db_name": "Global_Norte",
  "usuario": "app_global",
  "contrasena": "Secreta123!",
  "activo": true
}
```

`db_type` soporta: `mssql` o `mysql`.

### Ejemplo POST `/plantas/:id/sincronizar`

Ejecuta ambas sincronizaciones en una sola llamada:

1. Resumen por granja/pedido → `tbl_ordenes_produccion_resumen`
2. Detalle consolidado (Pollo Beneficiado, Vísceras, Aves Ahogadas) → `tbl_ordenes_produccion_detalle`

```json
{
  "fecha_desde": "2026-03-01",
  "fecha_hasta": "2026-03-13"
}
```

Filtra en Global por `granja.codigo = codigo_planta` de la conexión. `codigo_planta` es único entre conexiones (409 si se repite al crear/actualizar).

Respuesta:

```json
{
  "codigo_planta": "PL001",
  "nombre_planta": "Planta Norte",
  "fecha_desde": "2026-03-01",
  "fecha_hasta": "2026-03-13",
  "resumen": {
    "filas_procesadas": 48,
    "filas_upsert": 48,
    "dias_con_datos": 10
  },
  "detalle": {
    "filas_procesadas": 120,
    "filas_upsert": 120,
    "dias_con_datos": 10
  }
}
```

Consultas: `GET /resumen?...` y `GET /detalle?...`

`POST /plantas/:id/sincronizar-detalle` sigue disponible solo para el detalle (opcional).

## ETL

```bash
npm run etl
```

Flujo:

1. Lee plantas con `activo = 1` desde `tbl_config_plantas_global`
2. Descifra contraseñas en memoria
3. Extrae `dbo.produccion_global` y agrega `origen_planta`
4. Extrae SAP (mock si `ETL_SAP_MOCK=true`)
5. Cruce por `orden_produccion` + `material`
6. Log por planta (éxito/error sin detener el proceso)

## Seguridad

- Contraseñas de plantas **nunca** en `.env` ni código
- Solo `ENCRYPTION_KEY` en `.env` para AES-256-GCM
- API no expone contraseñas (máscara `********`)
- Logs ETL no imprimen contraseñas

## Build producción

```bash
npm run build
npm start
npm run etl
```
