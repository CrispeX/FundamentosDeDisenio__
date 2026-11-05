# Verificación de Supabase

Proyecto autorizado: **Post**, organización **Practicas_postgres**, referencia `ciwkgqdpogteheeyigxb`.

La actualización `althea_reservas_asientos_politicas_revision` fue aplicada el 4 de noviembre de 2026. Agrega la persistencia de oferta, asientos y aceptación de políticas, y actualiza las dos funciones RPC del módulo. No modifica tablas ajenas a Althea.

## Resultado

Ocho comprobaciones SQL aprobadas, ejecutadas con el rol del servidor dentro de una transacción revertida al terminar:

1. El lector devuelve la versión 2 del flujo de reservas.
2. Creación de cliente, solicitud, viajero y cotización vinculados.
3. Rechazo de una escritura con revisión obsoleta.
4. Creación de reserva vinculada a la cotización.
5. Lectura posterior conserva oferta, asiento y versión de políticas.
6. Registro de abono parcial.
7. Rechazo de sobrepago sin datos parciales ni incremento de revisión.
8. Anulación del abono y cancelación coherente de reserva y cotización.

Después del ROLLBACK se comprobaron los mismos registros y revisión existentes antes de la prueba: **4 clientes, 2 solicitudes, 2 reservas, 1 pago y revisión 5**. No quedaron datos de prueba.

Las tablas Althea mantienen RLS. La función de escritura no permite ejecución a `anon` ni `authenticated`; sí al rol del servidor. La revisión posterior no detectó avisos de seguridad sobre las tablas Althea.

## Configuración de la aplicación

La conexión de administración usada para verificar la base es independiente de las credenciales del servidor Node.js. Para que la aplicación use Supabase, configurar `SUPABASE_SECRET_KEY` en su `.env` privado y ejecutar `npm run db:check`. La clave no se incluye en GitHub ni en esta documentación.

La IA real continúa requiriendo su propia clave. El modo de práctica y las recomendaciones del catálogo siguen disponibles para la demostración.
