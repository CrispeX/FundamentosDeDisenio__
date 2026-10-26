# ✈️ Sistema de Cotizaciones, Reservas y Pagos - App de Viajes

Esta aplicación web está diseñada para simplificar y optimizar la gestión de cotizaciones, reservas y procesamiento de pagos para una plataforma de viajes.

---

## 👥 Integrantes del Equipo

* **Johan Murillo**
* **Cristian Escobar**
* **Sara**

---

## 🚀 Características Principales

* 📊 **Gestión de Cotizaciones:** Generación y personalización de cotizaciones de viajes.
* 📅 **Módulo de Reservas:** Sistema interactivo para agendar y gestionar paquetes de viaje.
* 💳 **Procesamiento de Pagos:** Registro e integración de pagos seguros.

---

## 📂 Estructura del Proyecto

```text
FundamentosDeDiseno/
├── 📁 data/             # Archivos de datos locales o mocks (JSON/DB)
├── 📁 public/           # Archivos estáticos (HTML, imágenes, CSS)
├── 📁 src/              # Código fuente de la aplicación (Lógica principal)
├── 📄 .gitignore        # Archivos e historial excluidos de Git
├── 🖼️ image.png         # Capturas de pantalla o recursos gráficos
├── 📦 package.json      # Configuración de dependencias y scripts
├── 📝 README.md         # Documentación del proyecto
└── ⚙️ server.js        # Punto de entrada principal y servidor local
```

## Ejecutar la aplicación

Requiere Node.js 18 o posterior. No necesita instalar dependencias. Desde la carpeta del proyecto:

```bash
node server.js
```

Abre http://localhost:3000. También puedes usar `npm start`. Para ejecutar las pruebas: `npm test`.

## Funciones disponibles

- **Clientes:** crear, buscar y editar. El correo debe ser único.
- **Solicitudes:** asistente de cuatro pasos, selección de clientes, agregar o quitar viajeros, detalle y creación de reservas o cotizaciones.
- **Cotizaciones:** crear, editar borradores, ver detalle, rechazar o aceptar y reservar. Aceptar establece el total de la reserva; si ya existe una reserva sin cotización, se usa esa misma.
- **Reservas:** buscar, filtrar, consultar detalle, cambiar fechas y cancelar. Las fechas se sincronizan con la solicitud.
- **Pagos:** registrar abonos recibidos, consultar recibos y anular registros. El saldo se calcula con los pagos vigentes y no se permiten sobrepagos ni referencias duplicadas. Son registros locales; no se efectúan cobros ni devoluciones bancarias.
- **Reportes:** filtrar por fecha de salida y descargar el resultado en CSV. Los saldos de reservas canceladas son cero.
- **Perfil:** Laura Gómez, Asesor Comercial, aparece en la esquina superior derecha y permanece visible en móvil.

## Datos y flujo

Los datos se guardan en `data/db.json`. Las colecciones nuevas se agregan automáticamente al cargar una base existente. Se conservan los clientes, solicitudes y reservas previos.

Flujo recomendado: solicitud → cotización → aceptar y reservar → registrar abonos → consultar reportes. Una reserva creada directamente puede cotizarse después desde Solicitudes o Cotizaciones. Para cancelar una reserva con pagos, primero anula sus registros de pago; la aplicación no gestiona devoluciones de dinero.

Configuración opcional: `PORT`, `HOST` y `ALTHEA_DB_FILE` (ruta de otro archivo de datos). Las pruebas usan archivos temporales y no modifican la base del proyecto.

## Recomendaciones en el paso Preferencias

Al llegar al paso 4 aparecen tres ideas de destinos del catálogo colombiano. Se actualizan al cambiar el presupuesto total del grupo, el servicio, los intereses o las notas. Puedes dejar el destino vacío en el paso 3; antes de crear la solicitud debes elegir una sugerencia o escribir un destino manualmente. Seleccionar una tarjeta actualiza el destino y conserva los datos del formulario.

Hay dos modos claramente identificados en pantalla:

- **Recomendaciones con IA:** se usa OpenAI desde el servidor cuando existe una clave configurada.
- **Sugerencias del catálogo:** comparación local por afinidad y bandas orientativas de planificación cuando no hay clave, se alcanza el límite o falla la IA. Este modo no es una respuesta generada por IA.

El catálogo se puede ampliar en `src/data/destinos.json`. Los niveles de gasto del modo local son datos de demostración, no tarifas investigadas. Ningún modo consulta disponibilidad o precios reales; las sugerencias sirven para inspirar y deben cotizarse.

### Activar OpenAI

1. Copia `.env.example` a `.env` en la raíz del proyecto.
2. Agrega tu clave propia en `OPENAI_API_KEY`. El modelo predeterminado es `gpt-4.1-mini`; se puede cambiar con `OPENAI_MODEL`.
3. Reinicia `node server.js`.

También se admiten variables de entorno, que tienen prioridad sobre `.env`. La clave queda en el servidor y `.env` está excluido de Git. No la pongas en JavaScript del navegador ni la publiques en el repositorio. El uso del proveedor requiere una cuenta API configurada y puede generar cargos.

El proveedor recibe únicamente origen, destino deseado, fechas, cantidad y tipos de viajeros, presupuesto total, servicio e intereses. Las notas libres se reducen a categorías conocidas. No se envían nombres de clientes o viajeros, correos, teléfonos, documentos ni las notas originales. Las respuestas usan `store: false` y se valida que los destinos existan en el catálogo.

Se utiliza la [Responses API](https://developers.openai.com/api/docs/guides/structured-outputs) con salida JSON estructurada. Hay caché en memoria durante 10 minutos, coalescencia de peticiones idénticas, dos consultas simultáneas como máximo, seis consultas nuevas por minuto por proceso y un tiempo máximo de espera del proveedor de 15 segundos. No se persisten las recomendaciones en la base de datos.

`POST /api/recomendaciones` acepta los campos `destino`, `viajeros` y `preferencias`. Devuelve `modo`, `aviso` y `recomendaciones`. No crea clientes, solicitudes ni reservas. Para inspirar, admite de 1 a 30 viajeros y viajes de hasta 90 días; los límites no cambian las reglas de registro de solicitudes.

Las pruebas nuevas simulan el proveedor: cubren modo local, validación, exclusión de identificadores personales, respuestas estructuradas, caché, límite de peticiones, fallos, destino opcional y selección obligatoria antes de guardar. No necesitan clave ni hacen llamadas externas.
