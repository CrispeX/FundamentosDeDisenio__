# Althea · Correcciones de Review 2

La evaluación aportada registra 30 historias en el mapa, 15 en Sprint 2 y 12 de estas mostradas con éxito. No identifica las tres historias restantes. Esta revisión conserva las épicas, subépicas y distribución del mapa; sus pruebas técnicas no sustituyen la demostración ante el docente.

## Cambios y comprobaciones

| Observación | Corrección / evidencia |
| --- | --- |
| Generar reporte CSV | Descargar vuelve a aplicar las fechas actuales, incluso sin pulsar Aplicar. Un rango invertido muestra error y no genera archivo. Un rango vacío genera solo cabecera. CSV UTF-8 con BOM, separación por punto y coma, comillas escapadas y protección contra fórmulas. El enlace de descarga se incorpora al documento y se retira después de usarlo. |
| Cambiar fechas | Prueba por API de persistencia de ambas fechas y asientos, actualización de solicitud, liberación de la salida anterior y ocupación de la nueva. Un conflicto de asientos o un rango inválido conserva los datos anteriores. Reservas canceladas no admiten cambios. |
| Editar o quitar viajeros | La edición se hace en Solicitudes → Editar perfil → Viajeros. Quitar un viajero conserva los cambios de los demás. Se impide dejar cero viajeros, repetir documentos o superar treinta. Guardar invalida cotizaciones obsoletas; una reserva posterior usa la nueva cantidad de viajeros. Cancelar vuelve al listado sin guardar aunque la ruta no haya cambiado. |
| IA no demostrada | Actualizar sugerencias vuelve a consultar aunque el perfil no cambie. Las pruebas cubren proveedor simulado, privacidad, errores, catálogo de respaldo, caché y límites. La ejecución real continúa pendiente de configurar una clave propia del servidor y comprobarla. |
| Falta matriz Excel | Matriz con las 30 historias y criterios en formato «Yo como asesor comercial quiero…», recorrido de comprobación, pantalla y referencia. Copia accesible en [backlog.csv](revision-2/backlog.csv), abierta por Excel; se entrega también XLSX con filtros, paneles inmovilizados y conteos por sprint. |
| Secuencias | Dos funcionalidades: confirmar reserva y registrar abono. Las instancias se nombran objeto:Clasificador y corresponden al modelo de clases. Incluyen llamadas síncronas, creación de objetos y retornos con trazo discontinuo. |
| Comunicación | Mismas dos funcionalidades. Orden explícito 1 → 1.1 → 1.1.1 → 1.1.2 → 1.1.3. La creación queda entre la lectura y el guardado. Los retornos discontinuos no representan nuevas llamadas. |
| Implementación | Vistas separadas de despliegue y componentes. Nodos, entornos, artefactos y dependencias «deploy»; interfaces requeridas por uso y provistas por realización; dependencias «manifest» de artefactos a componentes. Los servicios externos aparecen condicionados a su configuración. |

## Validación

`npm test`: **41 pruebas superadas, 0 fallos** (9 de noviembre de 2026). Incluye HTTP local, persistencia JSON y adaptador Supabase con proveedor simulado. No acredita una conexión actual a Supabase ni una respuesta real de OpenAI.

Archivos de pruebas: `tests/frontend.test.js`, `tests/reserva-revision.test.js`, `tests/integration.test.js`, `tests/recomendaciones.test.js` y `tests/supabase.test.js`.

En Windows, si el entorno restringe renombrar archivos temporales fuera del proyecto, configurar `TEMP` y `TMP` a una carpeta de trabajo autorizada antes de ejecutar las pruebas. No cambiar el almacenamiento de producción para ejecutar los tests: estos usan archivos temporales independientes.

## Comprobación de IA real

1. Configurar `OPENAI_API_KEY` en el servidor o en el archivo `.env`, que está excluido de Git. No colocarla en `public/` ni en el navegador.
2. Ejecutar `npm run ia:check`. Hace una consulta con perfil ficticio sin documentos ni correos, comprueba que el resultado indique `modo: ia` y muestra tres destinos. Termina con error si falta clave o se usa el catálogo de respaldo; ese caso no se presenta como IA real verificada.
3. Reiniciar la aplicación. En Nueva solicitud → Preferencias, comparar sugerencias con intereses y presupuestos diferentes, pulsar Actualizar, elegir un destino y guardar la solicitud. Volver a consultarla para demostrar persistencia.

El script implica una consulta al proveedor cuando existe clave. Las recomendaciones no equivalen a tarifas, disponibilidad real de proveedores ni reservas comerciales.

## Diagramas y correspondencia

Los archivos SVG en [revision-2/](revision-2/) son la fuente vectorial de esta corrección. Se generan con `python scripts/generar-diagramas-revision2.py` (requiere Pillow y reportlab); la aplicación no depende de estas bibliotecas. El generador produce también PNG y un PDF de siete páginas para la presentación, con aspecto similar a Enterprise Architect. No son un proyecto nativo `.qea`.

| Clasificador de interacción | Correspondencia en la implementación |
| --- | --- |
| InterfazAsesor | `public/js/reservas.js`, `gestion.js` y el resto de la interfaz del asesor |
| ServicioReservas | `src/services/reservas.service.js`: `vistaPrevia`, `crear`, `modificar` |
| GestionComercial | `src/services/gestion.service.js`: `registrarPago`, `anularPago` |
| AlmacenDatos | `src/models/db.js`: `load`, `save`, `nextId`; selección de persistencia JSON o Supabase |
| Reserva / Pago | Objetos de dominio creados en los servicios y persistidos por el adaptador |

Son clasificadores del diseño UML, incluidos ahora en el modelo de clases para permitir la trazabilidad. El código JavaScript implementa servicios mediante módulos y funciones; no declara clases JavaScript con esos nombres. Las interfaces del diagrama de componentes representan contratos entre módulos, no nuevas rutas HTTP.

## Recorrido de Sprint 2 para la exposición

| Historia | Demostración |
| --- | --- |
| HU-04 Consultar lista de clientes | Abrir Clientes y comprobar los datos guardados. |
| HU-05 Editar datos de contacto | Editar teléfono y volver a consultar. |
| HU-06 Editar o quitar viajeros | Editar un viajero, quitar otro, guardar y abrir de nuevo. |
| HU-10 Buscar y filtrar solicitudes | Buscar por cliente y combinar filtro de estado. |
| HU-11 Actualizar sugerencias y elegir destino | Demostrar el modo IA real después de configurar la clave, elegir y guardar el destino. |
| HU-12 Consultar y editar el perfil guardado | Cambiar preferencias, guardar y verificar el perfil actualizado. |
| HU-16 Editar cotización | Cambiar servicios y total de un Borrador. |
| HU-17 Buscar y filtrar cotizaciones | Combinar texto y estado. |
| HU-18 Rechazar cotización | Rechazar un Borrador y crear una nueva cotización. |
| HU-22 Editar selección de asientos | Cambiar a asientos libres; comprobar rechazo de ocupados. |
| HU-23 Buscar, filtrar y consultar reservas | Buscar una reserva y revisar su detalle. |
| HU-24 Cambiar fechas o cancelar | Cambiar fechas, comprobar persistencia y cupos; cancelar otra reserva sin abonos vigentes. |
| HU-28 Buscar, filtrar y anular pagos | Buscar un recibo, anularlo y contrastar el saldo recalculado. |
| HU-29 Filtrar reporte por fechas y limpiar el rango | Filtrar un mes, probar rango inválido y limpiar. |
| HU-30 Descargar reporte CSV | Cambiar el rango sin Aplicar, descargar y abrir el archivo para comparar filas. |

Esta lista prepara una exposición completa; no cambia retroactivamente el resultado 12/15 de la evaluación.
