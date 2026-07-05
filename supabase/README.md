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
- `ideas`

> Si el proyecto ya tenia las tablas creadas antes de que existiera `ideas`, volver a correr
> `supabase/schema.sql` en el SQL Editor (es idempotente) para crearla. Mientras la tabla no
> exista, la pantalla de Ideas funciona pero no persiste entre sesiones.

## 4. Login

La app usa Supabase Auth con email + contraseña. Los usuarios se crean a mano desde
Authentication → Users en el panel de Supabase. Todos comparten rol admin por ahora.

Por ahora la app escribe desde server actions usando `SUPABASE_SERVICE_ROLE_KEY`. El siguiente paso de seguridad es reemplazar esto por el cliente autenticado + politicas RLS por usuario/rol.
