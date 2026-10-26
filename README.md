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
