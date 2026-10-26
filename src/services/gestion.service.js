const db = require('../models/db');
const { HttpError } = require('../utils/errors');
const v = require('../utils/validators');
const solicitudes = require('./solicitudes.service');
const reservas = require('./reservas.service');

function dinero(valor, campo = 'valor') {
  const numero = Number(valor);
  if (valor === '' || valor == null || !Number.isFinite(numero) || numero <= 0 || numero > 1e12)
    throw new HttpError(400, `El ${campo} debe ser un número positivo`);
  const redondeado = Math.round(numero * 100) / 100;
  if (redondeado <= 0) throw new HttpError(400, 'El valor mínimo es 0.01 COP');
  return redondeado;
}
function buscar(tabla, id) {
  const item = db.load()[tabla].find(x => x.id === Number(id));
  if (!item) throw new HttpError(404, tabla === 'pagos' ? 'Pago no encontrado' : 'Cotización no encontrada');
  return item;
}
function enriquecerCotizacion(c) {
  const s = solicitudes.obtener(c.solicitudId);
  return { ...c, solicitud: { ...s, cliente: db.load().clientes.find(x => x.id === s.clienteId) } };
}
function listarCotizaciones() { return db.load().cotizaciones.map(enriquecerCotizacion).reverse(); }
function validarCotizacion(datos) {
  return { descripcion: v.requerido(datos.descripcion, 'descripción'), total: dinero(datos.total, 'total de la cotización') };
}
function crearCotizacion(datos) {
  const s = solicitudes.obtener(datos.solicitudId);
  if (db.load().cotizaciones.some(c => c.solicitudId === s.id && ['Borrador', 'Aceptada'].includes(c.estado)))
    throw new HttpError(409, 'La solicitud ya tiene una cotización vigente');
  const valores = validarCotizacion(datos);
  const id = db.nextId('cotizaciones');
  const c = { id, codigo: `COT-${String(id).padStart(4, '0')}`, solicitudId: s.id, ...valores, estado: 'Borrador', creadaEn: new Date().toISOString() };
  db.load().cotizaciones.push(c); db.save();
  return enriquecerCotizacion(c);
}
function modificarCotizacion(id, datos) {
  const c = buscar('cotizaciones', id);
  if (c.estado !== 'Borrador') throw new HttpError(409, 'Solo se puede editar una cotización en borrador');
  Object.assign(c, validarCotizacion(datos)); db.save(); return enriquecerCotizacion(c);
}
function resolverCotizacion(id, datos) {
  const c = buscar('cotizaciones', id);
  if (c.estado !== 'Borrador') throw new HttpError(409, 'La cotización ya fue procesada');
  if (!['Aceptada', 'Rechazada'].includes(datos.estado)) throw new HttpError(400, 'Estado de cotización inválido');
  let reserva;
  if (datos.estado === 'Aceptada') {
    reserva = db.load().reservas.find(r => r.solicitudId === c.solicitudId && r.estado !== 'Cancelada');
    if (reserva?.cotizacionId) throw new HttpError(409, 'La reserva ya tiene una cotización aceptada');
    if (!reserva) {
      const nueva = reservas.crear({ solicitudId: c.solicitudId });
      reserva = db.load().reservas.find(r => r.id === nueva.id);
    }
    reserva.cotizacionId = c.id;
    reserva.total = c.total;
    c.reservaId = reserva.id;
  }
  c.estado = datos.estado; db.save();
  return { ...enriquecerCotizacion(c), reservaId: reserva?.id || c.reservaId };
}
function enriquecerPago(p) {
  const r = reservas.obtener(p.reservaId);
  return { ...p, reserva: r };
}
function listarPagos() { return db.load().pagos.map(enriquecerPago).reverse(); }
function registrarPago(datos) {
  const r = reservas.obtener(datos.reservaId);
  if (r.estado === 'Cancelada') throw new HttpError(409, 'La reserva está cancelada');
  if (!r.total) throw new HttpError(409, 'Acepta una cotización para establecer el total de la reserva');
  const monto = dinero(datos.monto, 'monto');
  if (!['Efectivo', 'Transferencia', 'Tarjeta'].includes(datos.metodo)) throw new HttpError(400, 'Selecciona un método de pago válido');
  if (monto > r.saldoPendiente) throw new HttpError(409, 'El pago supera el saldo pendiente');
  const referencia = v.requerido(datos.referencia, 'referencia o recibo');
  if (db.load().pagos.some(p => p.estado === 'Registrado' && p.referencia.toLowerCase() === referencia.toLowerCase()))
    throw new HttpError(409, 'Ya existe un pago registrado con esa referencia');
  const id = db.nextId('pagos');
  const p = { id, codigo: `PAG-${String(id).padStart(4, '0')}`, reservaId: r.id, monto, metodo: datos.metodo, referencia, estado: 'Registrado', creadaEn: new Date().toISOString() };
  db.load().pagos.push(p); db.save(); return enriquecerPago(p);
}
function anularPago(id) {
  const p = buscar('pagos', id);
  if (p.estado !== 'Registrado') throw new HttpError(409, 'El registro de pago ya está anulado');
  p.estado = 'Anulado'; p.anuladoEn = new Date().toISOString(); db.save(); return enriquecerPago(p);
}
module.exports = { listarCotizaciones, crearCotizacion, modificarCotizacion, resolverCotizacion, listarPagos, registrarPago, anularPago };
