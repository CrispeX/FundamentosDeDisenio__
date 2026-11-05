# Althea | Solicitudes, reservas y abonos

Módulo académico de gestión de viajes para el asesor comercial.

**Equipo:** Johan Murillo, Cristian Escobar y Sara.

## Ejecutar

Requiere Node.js 18 o posterior. No necesita instalar dependencias.

Para practicar sin conexión externa:

```bash
npm run demo
```

Abrir http://localhost:3000. El modo de práctica usa `data/practica.json`, separado de los datos originales y excluido de Git. La interfaz identifica que son datos locales.

Para usar Supabase, copiar `.env.example` a `.env`, configurar `SUPABASE_SECRET_KEY` y ejecutar `npm start`. Se conserva exclusivamente el proyecto **Post**, organización **Practicas_postgres**, referencia `ciwkgqdpogteheeyigxb`. La clave privada permanece en el servidor y no se publica en Git.

La actualización de oferta, asientos y políticas ya fue aplicada y verificada en el proyecto autorizado. Pasaron ocho comprobaciones SQL con ROLLBACK; los datos existentes se conservaron. Para otra instalación existente, usar `database/actualizar_reservas_revision.sql` antes de guardar y comprobar `npm run db:check`. El servidor rechaza escrituras si el esquema es anterior. La conexión de la aplicación sigue necesitando su clave privada en el archivo `.env`.

No volver a ejecutar el esquema de creación sobre tablas existentes. `database/althea_schema.sql` sirve para una instalación nueva; `database/catalogo_destinos.sql` conserva el catálogo inicial. No se modifica ninguna tabla ajena a Althea.

## Recorrido funcional

1. Crear o seleccionar un cliente; registrar viajeros, fechas, origen, destino y preferencias.
2. Ver ideas según presupuesto total, viajeros e intereses. Elegir destino y revisar el perfil antes de guardar la solicitud.
3. Crear y editar una cotización. Aceptar abre el recorrido de reserva; rechazar conserva el historial.
4. Consultar cupos y detalles, seleccionar un asiento por viajero, leer y aceptar políticas y revisar el resumen del servidor antes de confirmar.
5. Registrar abonos, ver recibos, anular registros y consultar reportes exportables en CSV.

Una solicitud pendiente permite **Editar perfil** y regenerar ideas. Cambiar su perfil rechaza las cotizaciones en borrador para evitar aceptar precios obsoletos. Con reserva activa, primero se debe cancelar o usar el cambio de fechas de la reserva.

El inventario es **académico e interno**: 24 cupos con asientos por ruta, salida y servicio Paquete/Vuelo; 10 cupos por Hotel sin asientos. Solo se ofrecen destinos del catálogo. No consulta aerolíneas ni hoteles. Se vuelven a validar cupos y asientos al confirmar o cambiar fechas. Cancelar libera cupos.

La vista previa no guarda ni bloquea disponibilidad: contiene un comprobante firmado válido durante 10 minutos en el mismo proceso del servidor. Si cambian los datos o se reinicia el servidor, se debe revisar otra vez. La aceptación de políticas guarda su versión y fecha.

El presupuesto del perfil es orientativo. El total de la reserva se fija con una cotización aceptada. Los pagos registran abonos recibidos, con referencia única vigente y sin sobrepagos. La aplicación no cobra tarjetas ni hace devoluciones bancarias. Antes de cancelar una reserva con abonos se deben resolver y anular sus registros.

La interfaz incluye nombre del módulo, perfil visual del asesor, banner, menú activo, migas de pan, Atrás/Adelante, mensajes de éxito y error y estado de la conexión. El perfil mostrado no es un inicio de sesión.

## Recomendaciones

Configurar `OPENAI_API_KEY` en el servidor para usar IA real; modelo predeterminado `gpt-4.1-mini`. Si no hay clave o falla la consulta, se usan sugerencias del catálogo y la pantalla lo indica. La generación real requiere clave propia; no se certificó contra el proveedor en esta revisión.

Se envían solo rasgos del viaje, sin nombres, correos, teléfonos ni documentos. Las notas se reducen a categorías conocidas. La respuesta estructurada se valida contra el catálogo; usa `store:false`, caché, límite de peticiones y tiempo de espera. Ningún modo genera una tarifa o disponibilidad externa confirmada.

## Datos y seguridad del adaptador

Supabase usa tablas `althea_*`, RLS y RPC privadas `althea_read_state` / `althea_write_state` con `SECURITY INVOKER`. Una revisión global serializa las escrituras para evitar perder datos y reservar el mismo asiento concurrentemente. Los conflictos repiten las validaciones con los datos actuales. Los cambios SQL directos no participan de ese control.

El adaptador lee el conjunto de Althea por operación; está pensado para el volumen de un proyecto académico. La configuración predeterminada no cae silenciosamente a JSON si falla Supabase. Variables opcionales: `HOST`, `PORT`, `ALTHEA_DB_FILE`, `OPENAI_MODEL`.

## Pruebas y documentación

```bash
npm test
```

Las pruebas HTTP usan archivos temporales y datos ficticios; el proveedor de IA y el adaptador Supabase se simulan. Cubren reservas, cotizaciones, pagos, perfiles, cupos, asientos, políticas y comprobantes de vista previa.

- [Correcciones y guion de demostración](docs/revision-evaluacion.md).
- [Diagramas SVG y PNG para Canva](docs/diagramas).
- `node scripts/generar-diagramas.js` reproduce los SVG. Los PNG se renderizaron con Sharp como herramienta de edición, sin añadir dependencias a la app.
- `database/verify_supabase.sql` conserva las pruebas SQL con ROLLBACK; deben ejecutarse en el proyecto autorizado tras instalar el esquema o su actualización.

No se afirma «20/20 HU»: la evaluación adjunta no incluye el texto de todas las historias numeradas. La trazabilidad identifica requisitos implementados y verificaciones externas pendientes.
