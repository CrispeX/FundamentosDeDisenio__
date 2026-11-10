# Vaciar los registros locales de Althea

Para vaciar los clientes, solicitudes con sus viajeros, reservas, cotizaciones y pagos que se registraron al ejecutar `npm run demo`, detener primero la aplicación con **Ctrl + C**. Después, desde la carpeta del proyecto:

```bash
git pull
npm run limpiar:demo
npm run demo
```

El comando vacía `data/practica.json`, o el archivo indicado por la variable de entorno `ALTHEA_DB_FILE` si se configuró. Conserva el catálogo y las opciones del archivo. Conserva también los contadores de identificadores para que las referencias antiguas no se reutilicen. Un archivo inválido se rechaza sin sobrescribirlo.

El archivo local de práctica está excluido de Git: actualizar el repositorio no borra por sí solo lo que ya se registró en un Codespace. Es necesario ejecutar la limpieza con el servidor detenido y volver a iniciarlo para descartar los datos en memoria.

Este comando opera únicamente sobre el archivo local. La aplicación que se ejecuta con Supabase almacena sus registros en las tablas `althea_*` del proyecto autorizado.
