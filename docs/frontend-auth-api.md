# API de autenticación — Guía para frontend

Backend: **Sincronizador Órdenes Producción**  
Base URL por defecto: `http://localhost:3000`

---

## Resumen

- El login valida credenciales contra **Active Directory** (no contra la BD local).
- El usuario **debe existir previamente** en `tbl_users` (vía sync AD: `POST /users/sync-ad`).
- La autenticación LDAP usa **solo datos de BD**: `ldap_dn` (1 bind) o UPN del `username` guardado (1 bind). Sin búsquedas LDAP adicionales.
- **Solo usuarios del departamento IT** pueden iniciar sesión (`department` en BD, sincronizado desde AD).
- La respuesta incluye un **JWT** que debe enviarse en rutas protegidas.

---

## 1. Login

### Request

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "username": "jperez",
  "password": "clave_del_dominio"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `username` | string | Usuario AD (`sAMAccountName`) o email corporativo |
| `password` | string | Contraseña del dominio |

### Respuesta exitosa (200)

```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "jperez",
      "email": "jperez@alimentoskiri.local",
      "firstName": "Juan",
      "lastName": "Pérez",
      "department": "Producción",
      "cargo": "Analista",
      "cedula": "12345678",
      "authSource": "ad",
      "role": {
        "id": 2,
        "roleName": "user",
        "description": "Usuario estándar"
      }
    }
  }
}
```

### Errores

| HTTP | `msg` | Causa |
|------|-------|-------|
| 400 | Usuario y contraseña son obligatorios | Body incompleto |
| 401 | Credenciales inválidas | Usuario no en BD o contraseña AD incorrecta |
| 401 | Este usuario no está habilitado para login con Active Directory | `auth_source !== "ad"` |
| 403 | Solo usuarios del departamento IT pueden iniciar sesión | `department` no es IT |
| 500 | Configuración LDAP incompleta | Faltan variables LDAP en el servidor |
| 500 | Configuración JWT incompleta | Falta `JWT_SECRET` en el servidor |
| 502 | No se pudo validar las credenciales con Active Directory | Error de red/LDAP |

Formato de error:

```json
{
  "ok": false,
  "msg": "Credenciales inválidas"
}
```

---

## 2. Sesión actual (`/auth/me`)

Útil para restaurar sesión al recargar la app.

### Request

```http
GET /auth/me
Authorization: Bearer <token>
```

### Respuesta exitosa (200)

```json
{
  "ok": true,
  "data": {
    "id": 1,
    "username": "jperez",
    "email": "jperez@alimentoskiri.local",
    "firstName": "Juan",
    "lastName": "Pérez",
    "department": "Producción",
    "cargo": "Analista",
    "cedula": "12345678",
    "authSource": "ad",
    "role": {
      "id": 2,
      "roleName": "user",
      "description": "Usuario estándar"
    }
  }
}
```

### Errores

| HTTP | `msg` |
|------|-------|
| 401 | Token no proporcionado |
| 401 | Token inválido o expirado |
| 401 | Usuario no encontrado o inactivo |

---

## 3. JWT — contenido y uso

### Rendimiento del login

| Escenario | Tiempo aprox. | Intentos LDAP |
|-----------|---------------|---------------|
| Con `ldap_dn` en BD (recomendado) | ~1–3 s | 1 bind directo |
| Sin `ldap_dn` (solo username en BD) | ~1–3 s | 1 bind UPN |

Ejecute `POST /users/sync-ad` periódicamente para mantener `ldap_dn` actualizado.

### Payload del token

```json
{
  "sub": 1,
  "username": "jperez",
  "email": "jperez@alimentoskiri.local",
  "roleId": 2,
  "roleName": "user",
  "iat": 1717000000,
  "exp": 1717028800
}
```

| Claim | Uso en frontend |
|-------|-----------------|
| `sub` | ID del usuario |
| `username` | Login |
| `roleId` / `roleName` | Control de acceso en UI |
| `exp` | Expiración (default servidor: 8h) |

### Enviar en requests protegidas

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 4. Ejemplo React (fetch)

```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type LoginResponse = {
  ok: boolean;
  data?: {
    token: string;
    user: {
      id: number;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      role: { id: number; roleName: string } | null;
    };
  };
  msg?: string;
};

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data: LoginResponse = await res.json();
  if (!res.ok || !data.ok || !data.data) {
    throw new Error(data.msg ?? "Error de login");
  }

  localStorage.setItem("accessToken", data.data.token);
  localStorage.setItem("authUser", JSON.stringify(data.data.user));
  return data.data;
}

export async function fetchWithAuth(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authUser");
    throw new Error("Sesión expirada");
  }

  return res;
}

export async function getCurrentUser() {
  const res = await fetchWithAuth("/auth/me");
  const data = await res.json();
  if (!data.ok) throw new Error(data.msg ?? "No autenticado");
  return data.data;
}
```

---

## 5. Flujo recomendado en el frontend

```text
1. Pantalla login → POST /auth/login
2. Guardar token + user en memoria/localStorage
3. Al iniciar app → GET /auth/me (validar token)
4. Si 401 → redirigir a login
5. En cada request API → header Authorization: Bearer <token>
6. Logout → borrar token y user del storage
```

---

## 6. Requisitos previos (operaciones)

El usuario debe existir en BD antes de poder loguearse:

```http
POST /users/sync-ad
```

(Sincronización AD → `tbl_users`. Normalmente la ejecuta el backend por cron o un admin.)

---

## 7. CORS

El backend tiene CORS habilitado (`origin: true`). En producción conviene restringir el origen del frontend en configuración del servidor.

---

## 8. Variables de entorno del frontend (sugeridas)

```env
VITE_API_URL=http://localhost:3000
```

---

## 9. Checklist integración

- [ ] Usuario sincronizado desde AD (`authSource: "ad"`, `active: true`)
- [ ] Login con credenciales de dominio reales
- [ ] Token guardado y enviado en `Authorization`
- [ ] Manejo de 401 (token expirado → login)
- [ ] `GET /auth/me` al cargar la app
- [ ] Roles (`roleName`) usados para mostrar/ocultar funcionalidades

---

## 10. Endpoints relacionados

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login AD + JWT |
| GET | `/auth/me` | Bearer | Usuario actual |
| POST | `/users/sync-ad` | No* | Sync usuarios AD → BD |
| GET | `/health` | No | Health check |

\* En producción se recomienda proteger `/users/sync-ad` con API key o rol admin.
