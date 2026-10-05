const db = require('../models/db');
const v = require('../utils/validators');
const { HttpError } = require('../utils/errors');
const clientes = require('./clientes.service');
const solicitudes = require('./solicitudes.service');

function enriquecer(r) {
  const s = db.load().solicitudes.find(x => x.id === r.solicitudId);
  return {
    ...r,
    cliente: clientes.obtener(r.clienteId),
    destino: s ? s.destino.destino : '',
    origen: s ? s.destino.origen : '',
    viajeros: s ? s.viajeros : [],
    preferencias: s ? s.preferencias : {}
  };
}

function buscar(id) {
  const r = db.load().reservas.find(x => x.id === Number(id));
  if (!r) throw new HttpError(404, 'Reserva no encontrada');
  return r;
}

function listar() {
  return db.load().reservas.map(enriquecer).reverse();
}

function obtener(id) {
  return enriquecer(buscar(id));
}

function crear({ solicitudId }) {
  const s = solicitudes.obtener(solicitudId);
  const activa = db.load().reservas.find(r => r.solicitudId === s.id && r.estado !== 'Cancelada');
  if (activa) throw new HttpError(409, 'La solicitud ya tiene una reserva activa');

  const id = db.nextId('reservas');
  const reserva = {
    id,
    codigo: `RES-${String(id).padStart(4, '0')}`,
    solicitudId: s.id,
    clienteId: s.clienteId,
    fechaSalida: s.destino.fechaSalida,
    fechaRegreso: s.destino.fechaRegreso,
    estado: 'Confirmada',
    creadaEn: new Date().toISOString()
  };
  db.load().reservas.push(reserva);
  s.estado = 'Reservada';
  db.save();
  return enriquecer(reserva);
}

function modificar(id, datos) {
  const r = buscar(id);
  if (r.estado === 'Cancelada') throw new HttpError(409, 'No se puede modificar una reserva cancelada');
  const salida = v.fecha(datos.fechaSalida, 'salida');
  const regreso = v.fecha(datos.fechaRegreso, 'regreso');
  v.rangoFechas(salida, regreso);
  r.fechaSalida = salida;
  r.fechaRegreso = regreso;
  db.save();
  return enriquecer(r);
}

function cancelar(id) {
  const r = buscar(id);
  if (r.estado === 'Cancelada') throw new HttpError(409, 'La reserva ya está cancelada');
  r.estado = 'Cancelada';
  const s = db.load().solicitudes.find(x => x.id === r.solicitudId);
  if (s) s.estado = 'Pendiente';
  db.save();
  return enriquecer(r);
}

module.exports = { listar, obtener, crear, modificar, cancelar };
