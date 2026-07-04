# Sistema interno Digital Amenities

Dashboard interno para ordenar proyectos, cobros, costos, trazabilidad operativa y decisiones de caja de los tres socios.

## Stack

- Next.js
- React
- TypeScript
- Supabase-ready
- Deploy pensado para Vercel

## Comandos

```bash
npm install
npm run dev
```

## Variables de entorno futuras

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

La UI actual trabaja con datos mock en memoria. El archivo `supabase/schema.sql` deja preparado el modelo inicial para pasar a persistencia real.
