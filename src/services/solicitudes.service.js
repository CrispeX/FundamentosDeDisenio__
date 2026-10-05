const db = require('../models/db');
const v = require('../utils/validators');
const { HttpError } = require('../utils/errors');
const clientes = require('./clientes.service');

function enriquecer(s) {
  return { ...s, cliente: clientes.obtener(s.clienteId) };
}

function listar() {
  return db.load().solicitudes.map(enriquecer).reverse();
}

function obtener(id) {
  const s = db.load().solicitudes.find(x => x.id === Number(id));
  if (!s) throw new HttpError(404, 'Solicitud no encontrada');
  return s;
}

function crear(datos) {
  let cliente;
  if (datos.cliente && datos.cliente.id) {
    cliente = clientes.obtener(datos.cliente.id);
    if (!cliente) throw new HttpError(404, 'Cliente no encontrado');
  } else {
    cliente = clientes.crear(datos.cliente || {});
  }

  const viajeros = Array.isArray(datos.viajeros) ? datos.viajeros : [];
  if (viajeros.length === 0) throw new HttpError(400, 'Agrega al menos un viajero');
  const viajerosOk = viajeros.map(p => ({
    nombre: v.requerido(p.nombre, 'nombre del viajero'),
    documento: v.requerido(p.documento, 'documento del viajero'),
    tipo: p.tipo === 'Niño' ? 'Niño' : 'Adulto'
  }));

  const d = datos.destino || {};
  const destino = {
    origen: v.requerido(d.origen, 'origen'),
    destino: v.requerido(d.destino, 'destino'),
    fechaSalida: v.fecha(d.fechaSalida, 'salida'),
    fechaRegreso: v.fecha(d.fechaRegreso, 'regreso')
  };
  v.rangoFechas(destino.fechaSalida, destino.fechaRegreso);

  const p = datos.preferencias || {};
  const solicitud = {
    id: db.nextId('solicitudes'),
    clienteId: cliente.id,
    viajeros: viajerosOk,
    destino,
    preferencias: {
      tipoServicio: p.tipoServicio || 'Paquete',
      presupuesto: p.presupuesto ? Number(p.presupuesto) : null,
      notas: (p.notas || '').trim()
    },
    estado: 'Pendiente',
    creadaEn: new Date().toISOString()
  };
  db.load().solicitudes.push(solicitud);
  db.save();
  return enriquecer(solicitud);
}

module.exports = { listar, obtener, crear };
