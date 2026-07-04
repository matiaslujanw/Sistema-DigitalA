# Supabase setup

La app ya esta preparada para leer y escribir desde Supabase usando:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 1. Crear tablas

Abrir el SQL Editor del proyecto `dashboard-DA` y ejecutar completo:

```sql
-- copiar y pegar el contenido de supabase/schema.sql
```

El script es idempotente: se puede correr mas de una vez sin recrear tablas existentes.

## 2. Cargar mock data inicial

Desde el proyecto local:

```bash
npm run seed:supabase
```

El seed se cancela si ya encuentra proyectos cargados, para evitar duplicados.

## 3. Modelo actual

Tablas principales:

- `clients`
- `partners`
- `projects`
- `project_partners`
- `project_payments`
- `project_events`
- `project_notes`
- `costs`
- `cash_movements`

Por ahora la app escribe desde server actions usando `SUPABASE_SERVICE_ROLE_KEY`. Mas adelante, cuando agreguemos login, conviene reemplazar esto por auth de Supabase + politicas RLS por usuario/rol.
