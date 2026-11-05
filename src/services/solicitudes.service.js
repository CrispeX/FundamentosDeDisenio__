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

function validarViaje(datos) {
  const viajeros = Array.isArray(datos.viajeros) ? datos.viajeros : [];
  if (viajeros.length === 0) throw new HttpError(400, 'Agrega al menos un viajero');
  if (viajeros.length > 30) throw new HttpError(400, 'El perfil admite hasta 30 viajeros');
  const viajerosOk = viajeros.map(p => ({
    nombre: v.requerido(p.nombre, 'nombre del viajero'),
    documento: v.requerido(p.documento, 'documento del viajero'),
    tipo: p.tipo === 'Niño' ? 'Niño' : 'Adulto'
  }));
  if (new Set(viajerosOk.map(p=>p.documento.toLowerCase())).size !== viajerosOk.length)
    throw new HttpError(400, 'Los documentos de los viajeros no pueden repetirse');

  const d = datos.destino || {};
  const destino = {
    origen: v.requerido(d.origen, 'origen'),
    destino: v.requerido(d.destino, 'destino'),
    fechaSalida: v.fecha(d.fechaSalida, 'salida'),
    fechaRegreso: v.fecha(d.fechaRegreso, 'regreso')
  };
  v.rangoFechas(destino.fechaSalida, destino.fechaRegreso);

  const p = datos.preferencias || {};
  const presupuesto = p.presupuesto == null || p.presupuesto === '' ? null : Number(p.presupuesto);
  if (presupuesto !== null && (!Number.isFinite(presupuesto) || presupuesto <= 0)) throw new HttpError(400, 'El presupuesto debe ser un número positivo');
  if (p.tipoServicio && !['Paquete', 'Vuelo', 'Hotel'].includes(p.tipoServicio)) throw new HttpError(400, 'Tipo de servicio inválido');
  if (p.intereses != null && (!Array.isArray(p.intereses) || p.intereses.some(i=>!require('../data/destinos.json').intereses.includes(i))))
    throw new HttpError(400,'Selecciona intereses válidos');
  return {viajerosOk,destino,p,presupuesto};
}
function preferenciasOk(p,presupuesto) {
  return {tipoServicio:p.tipoServicio || 'Paquete',presupuesto,
    intereses:[...new Set(p.intereses || [])],notas:String(p.notas || '').trim()};
}
function crear(datos) {
  const {viajerosOk,destino,p,presupuesto}=validarViaje(datos);
  let cliente;
  if (datos.cliente && datos.cliente.id) {
    cliente = clientes.obtener(datos.cliente.id);
    if (!cliente) throw new HttpError(404, 'Cliente no encontrado');
  } else {
    cliente = clientes.crear(datos.cliente || {});
  }

  const solicitud = {
    id: db.nextId('solicitudes'),
    clienteId: cliente.id,
    viajeros: viajerosOk,
    destino,
    preferencias: preferenciasOk(p,presupuesto),
    estado: 'Pendiente',
    creadaEn: new Date().toISOString()
  };
  db.load().solicitudes.push(solicitud);
  db.save();
  return enriquecer(solicitud);
}

function modificarPerfil(id,datos) {
  const s=obtener(id);
  if(s.estado !== 'Pendiente')throw new HttpError(409,'Para editar el perfil primero cancela su reserva activa');
  const {viajerosOk,destino,p,presupuesto}=validarViaje(datos);
  Object.assign(s,{viajeros:viajerosOk,destino,preferencias:preferenciasOk(p,presupuesto)});
  for(const c of db.load().cotizaciones.filter(c=>c.solicitudId===s.id && c.estado==='Borrador'))c.estado='Rechazada';
  db.save();return enriquecer(s);
}
module.exports = { listar, obtener, crear, modificarPerfil };
