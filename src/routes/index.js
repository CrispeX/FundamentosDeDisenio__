const { sendJson, readBody } = require('../utils/http');
const { HttpError } = require('../utils/errors');
const clientes = require('../controllers/clientes.controller');
const solicitudes = require('../controllers/solicitudes.controller');
const reservas = require('../controllers/reservas.controller');

const gestion = require('../services/gestion.service');

const { crearRecomendador } = require('../services/recomendaciones.service');
const recomendar = crearRecomendador({apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL || 'gpt-4.1-mini'});

const definiciones = [
  ['POST', '/api/recomendaciones', ({body}) => recomendar(body)],
  ['PATCH', '/api/clientes/:id', ({params, body}) => clientes.modificar({params, body})],
  ['GET', '/api/cotizaciones', () => gestion.listarCotizaciones()],
  ['POST', '/api/cotizaciones', ({body}) => ({status: 201, data: gestion.crearCotizacion(body)})],
  ['PATCH', '/api/cotizaciones/:id', ({params, body}) => gestion.modificarCotizacion(params.id, body)],
  ['POST', '/api/cotizaciones/:id/estado', ({params, body}) => gestion.resolverCotizacion(params.id, body)],
  ['GET', '/api/pagos', () => gestion.listarPagos()],
  ['POST', '/api/pagos', ({body}) => ({status: 201, data: gestion.registrarPago(body)})],
  ['POST', '/api/pagos/:id/anular', ({params}) => gestion.anularPago(params.id)],
  ['GET', '/api/clientes', clientes.listar],
  ['POST', '/api/clientes', clientes.crear],
  ['GET', '/api/solicitudes', solicitudes.listar],
  ['POST', '/api/solicitudes', solicitudes.crear],
  ['GET', '/api/reservas', reservas.listar],
  ['GET', '/api/reservas/:id', reservas.obtener],
  ['POST', '/api/reservas', reservas.crear],
  ['PATCH', '/api/reservas/:id', reservas.modificar],
  ['POST', '/api/reservas/:id/cancelar', reservas.cancelar]
];

const rutas = definiciones.map(([metodo, patron, handler]) => ({
  metodo,
  handler,
  regex: new RegExp('^' + patron.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$')
}));

async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  try {
    for (const ruta of rutas) {
      const m = url.pathname.match(ruta.regex);
      if (!m || ruta.metodo !== req.method) continue;
      const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};
      const out = await ruta.handler({
        params: m.groups || {},
        query: Object.fromEntries(url.searchParams),
        body
      });
      if (out && out.status) return sendJson(res, out.status, out.data);
      return sendJson(res, 200, out);
    }
    throw new HttpError(404, 'Ruta no encontrada');
  } catch (err) {
    sendJson(res, err.status || 400, { error: err.message });
  }
}

module.exports = { handleApi };
