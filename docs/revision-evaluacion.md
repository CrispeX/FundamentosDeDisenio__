# Correcciones de la evaluación de Althea

Se trabajó con las observaciones de las tres imágenes. No se recibió el texto original de las 20 historias, por lo que los números de HU sin descripción no se consideran certificados.

| Observación | Corrección y comprobación |
| --- | --- |
| Perfil de viaje con IA incompleto | Crear, revisar y editar viajeros, fechas, destino, servicio, presupuesto e intereses. Regenerar ideas y elegir destino. Se conserva el modo IA cuando hay clave y el modo catálogo cuando no la hay o falla. Proveedor simulado probado; generación real pendiente de clave. |
| HU 1.3: ver disponibilidad y detalle antes de elegir | Consulta del inventario académico por ruta, servicio y fecha; cupos, detalles y mapa de asientos antes de reservar. No integra proveedores externos. |
| HU 1.5: seleccionar asiento | Un asiento libre y distinto por viajero en Paquete/Vuelo; Hotel no tiene asientos. Se vuelve a validar al confirmar y al cambiar fechas; cancelar libera cupos. |
| Vista previa antes de guardar reserva | Resumen generado por el servidor: cliente, viajeros, ruta, fechas, servicio, asientos, precio cotizado y políticas. La confirmación exige una vista firmada vigente que coincida con los datos actuales. |
| HU 1.9: ver políticas | Políticas visibles antes de reservar; aceptación obligatoria y registro de la versión y fecha en la reserva. Son reglas del prototipo académico. |
| Gestión de pagos | Flujo completo cotización → reserva → abono → recibo → anular. Valida montos, referencias únicas, saldo, cancelación y sobrepagos. Registra abonos; no procesa cobros bancarios. |
| No conectado con BD | Se conserva el adaptador del proyecto Post / Practicas_postgres y se agrega actualización SQL para oferta, asientos y aceptación de políticas. El servidor detecta un esquema antiguo antes de guardar. El proyecto original no está disponible en las conexiones de esta sesión: actualización y prueba real pendientes. |
| Identidad, header y navegación | Nombre distintivo del módulo, banner, perfil del asesor, menú activo, migas de pan y botones Atrás/Adelante dentro de la aplicación. |
| Respuestas de la interfaz | Mensajes de éxito, errores de validación, estados vacíos, carga y estado de la conexión. |
| Actividades | Procesos nombrados, decisiones sin texto dentro, condiciones en salidas, convergencias explícitas y un nodo final por proceso. |
| Clases | Atributos y métodos legibles; asociaciones con multiplicidad, composición y dependencia; relaciones ortogonales. No se incorpora una clase Transacción sin función en el modelo. |
| Estados | Cada máquina identifica su objeto: Solicitud, Reserva, Cotización y Pago. Los estados están dentro de los nodos; los eventos y guardas, en transiciones. |
| USM sobredimensionado | Mapa limitado al recorrido del módulo; propuesta de Sprint 1 para cliente, solicitud y cotización; Sprint 2 para reserva, políticas, abonos y reportes. |
| Calidad de exposición y plan B | Demostración reproducible con `npm run demo`, datos separados y guion de verificación. |

## HU que necesitan el enunciado original

Las imágenes enumeran HU 1.1, 1.2 y varias del grupo 2.1–3.2, pero no incluyen sus enunciados completos. Se implementan los requisitos visibles; no se inventa una equivalencia exacta entre esos números y funcionalidades. La numeración de «1.3» también aparece repetida en la evaluación y debe cotejarse con el backlog original antes de afirmar «20/20 historias».

## Demostración en cinco minutos

1. Ejecutar `npm run demo` y abrir http://localhost:3000. Verificar que indica datos locales.
2. Crear un cliente y una solicitud con salida futura, viajeros con documentos diferentes y un destino del catálogo, por ejemplo Cartagena. Probar intereses y presupuesto; elegir una idea y revisar el perfil.
3. Crear una cotización, abrir «Aceptar y reservar» y comprobar cupos y detalles antes de seleccionar asientos.
4. Seleccionar un asiento por viajero, leer y aceptar políticas, ver el resumen y confirmar. Verificar el código de reserva y el saldo.
5. Registrar un abono parcial; abrir el recibo. Intentar pagar más del saldo y observar el rechazo.
6. Consultar Reportes y descargar CSV. Anular el abono, cancelar la reserva y comprobar que vuelve la disponibilidad.
7. Editar el perfil de la solicitud pendiente y generar nuevas sugerencias. Las cotizaciones en borrador de ese perfil quedan rechazadas para evitar aceptar precios obsoletos.

Plan B: si no hay acceso a Supabase, usar el modo de práctica explícito. Si no hay clave de IA o el proveedor falla, el catálogo continúa disponible y la interfaz lo identifica. No presentar ninguno de estos modos como una conexión externa verificada.

## Validación

`npm test` ejecuta pruebas HTTP del flujo, pagos, integridad de perfiles, cupos, políticas, asientos y vistas previas, además del adaptador remoto simulado. Las pruebas usan archivos temporales y datos ficticios. La comprobación visual se hace con una demostración aislada; no escribe en la base de Supabase.

Los diagramas están en `docs/diagramas`, con sus fuentes SVG y PNG para Canva. `scripts/generar-diagramas.js` reproduce los SVG sin dependencias. La actualización SQL debe probarse y aplicarse exclusivamente en el proyecto autorizado antes de usar estas funciones en Supabase.
