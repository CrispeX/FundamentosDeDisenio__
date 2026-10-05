const service = require('../services/clientes.service');

module.exports = {
  listar: ({ query }) => service.listar(query.q),
  crear: ({ body }) => ({ status: 201, data: service.crear(body) })
};
