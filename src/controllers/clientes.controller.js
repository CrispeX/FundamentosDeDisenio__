const service = require('../services/clientes.service');

module.exports = {
  modificar: ({ params, body }) => service.modificar(params.id, body),
  listar: ({ query }) => service.listar(query.q),
  crear: ({ body }) => ({ status: 201, data: service.crear(body) })
};
