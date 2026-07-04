# Contexto del proyecto

## Empresa

Digital Amenities es una empresa de desarrollo de software formada por tres socios. El foco del sistema interno es ordenar la gestion operativa y financiera de los proyectos.

## Stack habitual

- Repositorios en GitHub
- Deploy en Vercel para proyectos Next.js
- Next.js, React y TypeScript
- Supabase para proyectos simples y persistencia inicial
- AWS en algunos proyectos, aunque no es prioridad para este sistema interno

## Necesidades del sistema interno

- Dashboard de proyectos, estados, precio de venta y formas de pago
- Estados oficiales de proyecto: relevamiento, en desarrollo, MVP armado, MVP entregado, correcciones, implementacion y en uso
- Detalle editable por proyecto: estado, contrato firmado, fecha de contrato, total pactado, cobros por fecha y saldo pendiente
- Registro de costos por herramienta o proyecto, por ejemplo Supabase, Hostinger, Vercel y APIs
- Seguimiento de cobros y destino de la plata: reparto entre socios, plazo fijo, cheques, dolares, reinversion o caja
- Finanzas debe permitir registrar reparto entre socios, compra de divisa, inversiones y rendimiento esperado/real
- Trazabilidad por proyecto: cliente, reuniones, entregas, implementaciones, features, responsables y tiempos
- Lectura clara de cuanto demora cada etapa desde una reunion hasta la siguiente entrega o feature
- Por ahora conviene seguir con datos mock/localStorage para validar funcionalidad y diseno antes de conectar Supabase

## Estado actual del prototipo

- Ya existe base Next.js + React + TypeScript lista para Vercel
- Ya existen rutas: dashboard, proyectos, detalle de proyecto, finanzas, costos y socios
- Ya existen rutas nuevas para crear proyecto y cargar novedad: `/proyectos/nuevo` y `/novedades/nueva`
- Ya se puede entrar a proyectos mock y editar algunos datos localmente con localStorage
- Ya se puede crear un proyecto nuevo en localStorage con cliente local y abrir su detalle
- Ya se puede editar estado, contrato, fecha de contrato, total pactado, moneda y pagos dentro del detalle de proyecto
- Ya se pueden cargar notas/relevamientos dentro del detalle del proyecto
- Ya se puede cargar una novedad rapida vinculada a un proyecto; impacta en trazabilidad y, si aplica, en notas/relevamientos
- Ya existe finanzas con movimientos mock/localStorage para reparto, compra de divisa, inversion, gasto y reserva
- Ya existe sidebar fijo, colapsable y modo dia/noche
- El sidebar ejecutivo ahora sigue las rutas: Overview, Proyectos, Cronograma, Finanzas, Costos, Socios, Reuniones y Ajustes
- El dashboard overview adopta la referencia visual "Executive Suite": topbar, busqueda, alerta financiera, KPIs, reuniones, entregas, proyectos retrasados y rail lateral de estado/actividad
- La ruta `/cronograma` muestra proyectos en un selector lateral y al elegir uno despliega su linea de tiempo vertical con eventos, responsables, horas y resumen de salud
- Todavia no hay persistencia real en Supabase
- El flujo actual sigue siendo localStorage, no multiusuario ni persistente entre navegadores

## Backlog funcional para retomar con base de datos

### Prioridad alta

- Crear flujo real de "Nuevo proyecto"
- Campos iniciales sugeridos: nombre del proyecto, cliente, contacto, industria/rubro, estado inicial, monto pactado o estimado, moneda, forma de pago, socios asignados, contrato firmado/no firmado, fecha de inicio y proximo hito
- Al crear un proyecto, redirigir al detalle para poder completarlo de a poco
- Persistir proyectos, clientes, socios asignados y datos comerciales en Supabase
- Conectar detalle de proyecto a Supabase para editar estado, contrato, fechas, monto total y saldo
- Persistir pagos por proyecto con fecha, monto, moneda, metodo y nota

### Prioridad media

- Convertir "Cargar novedad" en accion rapida global
- La accion rapida deberia permitir registrar novedades sin entrar al detalle completo
- Tipos de novedad sugeridos: reunion, relevamiento, decision, pedido del cliente, entrega, correccion, implementacion, pago, costo, movimiento financiero
- Cada novedad deberia poder vincularse opcionalmente a un proyecto
- Si la novedad es pago o movimiento financiero, deberia impactar tambien en cobranza/finanzas
- Si la novedad es reunion/relevamiento/decision, deberia impactar en trazabilidad del proyecto

### Documentacion y relevamientos

- Agregar seccion dentro del detalle del proyecto para "Notas / Relevamientos"
- Campos sugeridos: fecha, tipo, titulo, texto largo, responsable, proyecto vinculado y si genera tarea/feature
- Tipos sugeridos: reunion, relevamiento, decision, pedido cliente, nota interna, bloqueo, alcance, cambio de alcance
- Esta seccion debe servir para anotar lo hablado despues de reuniones y que trabajo salio de eso
- Mas adelante puede evolucionar a adjuntos, links, archivos de contrato, presupuestos, comprobantes, transcripciones y versionado
- No sobrediseniar esta parte antes de usarla con proyectos reales; empezar simple y ampliar segun uso

### Prioridad posterior

- Historial de cambios por proyecto: quien cambio que, cuando y por que
- Adjuntar contrato, presupuesto, factura, comprobante y documentacion
- Rentabilidad por proyecto: cobrado menos costos menos horas estimadas
- Alertas: contrato pendiente, saldo pendiente, proyecto trabado, vencimiento de costos
- Filtros y busqueda en proyectos, finanzas y costos
- Reportes mensuales exportables
- Dashboard por socio: proyectos asignados, carga, horas y cobros vinculados
- Auth con Supabase y roles: admin, socio y lectura

## Identidad visual

La app debe mantener una linea cercana a la landing de Digital Amenities: sobria, clara, elegante, con foco en operacion real y tecnologia util. La direccion actual apunta a un estilo ejecutivo oscuro, con bordes finos, tipografia compacta, azul claro como acento principal y naranja/verde/rojo solo para estados.
