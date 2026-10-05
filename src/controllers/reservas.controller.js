const service = require('../services/reservas.service');

module.exports = {
  listar: () => service.listar(),
  obtener: ({ params }) => service.obtener(params.id),
  crear: ({ body }) => ({ status: 201, data: service.crear(body) }),
  modificar: ({ params, body }) => service.modificar(params.id, body),
  cancelar: ({ params }) => service.cancelar(params.id)
};
