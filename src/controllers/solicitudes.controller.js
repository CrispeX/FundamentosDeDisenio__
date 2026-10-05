const service = require('../services/solicitudes.service');

module.exports = {
  listar: () => service.listar(),
  crear: ({ body }) => ({ status: 201, data: service.crear(body) })
};
