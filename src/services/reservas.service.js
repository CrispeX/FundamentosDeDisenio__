const db = require('../models/db');
const v = require('../utils/validators');
const { HttpError } = require('../utils/errors');
const clientes = require('./clientes.service');
const solicitudes = require('./solicitudes.service');
const inventario = require('./disponibilidad.service');
const preview = require('./preview.service');

function enriquecer(r) {
  const s = r.oferta?.perfil || solicitudes.obtener(r.solicitudId);
  const totalPagado = Math.round(db.load().pagos.filter(p => p.reservaId === r.id && p.estado === 'Registrado').reduce((n,p) => n+p.monto,0)*100)/100;
  return {...r,totalPagado,saldoPendiente:r.estado==='Cancelada'?0:Math.max(0,Math.round(((r.total||0)-totalPagado)*100)/100),
    estadoPago:r.estado==='Cancelada'?'Cancelada':!r.total?'Sin cotización':totalPagado===0?'Pendiente':totalPagado<r.total?'Parcial':'Pagada',
    cliente:clientes.obtener(r.clienteId),destino:s.destino.destino,origen:s.destino.origen,viajeros:s.viajeros,preferencias:s.preferencias};
}
function buscar(id) {
  const r=db.load().reservas.find(x=>x.id===Number(id));
  if(!r)throw new HttpError(404,'Reserva no encontrada');
  return r;
}
function listar() { return db.load().reservas.map(enriquecer).reverse(); }
function obtener(id) { return enriquecer(buscar(id)); }
function disponibilidad(solicitudId,cotizacionId) {
  const s=solicitudes.obtener(solicitudId);
  const c=db.load().cotizaciones.find(c=>c.id===Number(cotizacionId) && c.solicitudId===s.id && c.estado==='Borrador');
  const propia=c && db.load().reservas.find(r=>r.solicitudId===s.id && r.estado!=='Cancelada' && !r.cotizacionId);
  return inventario.consultar(s,{},propia?.id);
}
function preparar(datos) {
  const s=solicitudes.obtener(datos.solicitudId);
  const activa=db.load().reservas.find(r=>r.solicitudId===s.id && r.estado!=='Cancelada');
  const c=datos.cotizacionId ? db.load().cotizaciones.find(c=>c.id===Number(datos.cotizacionId)) : null;
  if(datos.cotizacionId && (!c || c.solicitudId!==s.id || c.estado!=='Borrador'))throw new HttpError(409,'La cotización no está disponible para esta solicitud');
  if(activa && (!c || activa.cotizacionId))throw new HttpError(409,'La solicitud ya tiene una reserva activa');
  if(datos.politicasAceptadas!==true)throw new HttpError(400,'Debes leer y aceptar las políticas de la reserva');
  const oferta=inventario.consultar(s,{},activa?.id);
  const asientos=inventario.validarSeleccion(oferta,datos.asientos);
  const resumen={solicitudId:s.id,reservaExistente:activa?.id||null,cotizacionId:c?.id||null,
    cliente:clientes.obtener(s.clienteId),viajeros:s.viajeros,destino:s.destino,preferencias:s.preferencias,
    oferta:{clave:oferta.clave,nombre:oferta.nombre,cupos:s.viajeros.length},asientos,total:c?.total||null,
    descripcion:c?.descripcion||'Total pendiente de cotización',politicasVersion:inventario.POLITICAS.version};
  return {s,activa,c,oferta,asientos,resumen};
}
function vistaPrevia(datos) {
  const {resumen,oferta}=preparar(datos);
  return {...resumen,disponibilidad:oferta,politicas:inventario.POLITICAS,vistaPreviaToken:preview.emitir(resumen)};
}
function crear(datos) {
  const {s,activa,c,asientos,resumen}=preparar(datos);
  preview.verificar(datos.vistaPreviaToken,resumen);
  const id=activa?.id || db.nextId('reservas');
  const reserva=activa || {id,codigo:'RES-'+String(id).padStart(4,'0'),solicitudId:s.id,clienteId:s.clienteId,
    fechaSalida:s.destino.fechaSalida,fechaRegreso:s.destino.fechaRegreso,estado:'Confirmada',creadaEn:new Date().toISOString()};
  const perfil=JSON.parse(JSON.stringify({destino:s.destino,viajeros:s.viajeros,preferencias:s.preferencias}));
  Object.assign(reserva,{oferta:{...resumen.oferta,perfil},asientos,politicas:{version:inventario.POLITICAS.version,aceptadasEn:new Date().toISOString()}});
  if(c){reserva.cotizacionId=c.id;reserva.total=c.total;c.reservaId=id;c.estado='Aceptada';}
  if(!activa)db.load().reservas.push(reserva);
  s.estado='Reservada';db.save();return enriquecer(reserva);
}
function modificar(id,datos) {
  const r=buscar(id);
  if(r.estado==='Cancelada')throw new HttpError(409,'No se puede modificar una reserva cancelada');
  const salida=v.fecha(datos.fechaSalida,'salida'),regreso=v.fecha(datos.fechaRegreso,'regreso');
  v.rangoFechas(salida,regreso);
  const s=solicitudes.obtener(r.solicitudId),oferta=inventario.consultar(s,{fechaSalida:salida,fechaRegreso:regreso},r.id);
  const asientos=inventario.validarSeleccion(oferta,datos.asientos ?? r.asientos ?? []);
  r.fechaSalida=salida;r.fechaRegreso=regreso;r.asientos=asientos;
  s.destino.fechaSalida=salida;s.destino.fechaRegreso=regreso;
  r.oferta={clave:oferta.clave,nombre:oferta.nombre,cupos:s.viajeros.length,perfil:JSON.parse(JSON.stringify({destino:s.destino,viajeros:s.viajeros,preferencias:s.preferencias}))};
  db.save();return enriquecer(r);
}
function cancelar(id) {
  const r=buscar(id);
  if(r.estado==='Cancelada')throw new HttpError(409,'La reserva ya está cancelada');
  if(enriquecer(r).totalPagado>0)throw new HttpError(409,'Anula los registros de pago antes de cancelar la reserva');
  r.estado='Cancelada';
  const c=db.load().cotizaciones.find(c=>c.id===r.cotizacionId);if(c)c.estado='Cancelada';
  solicitudes.obtener(r.solicitudId).estado='Pendiente';db.save();return enriquecer(r);
}
module.exports={listar,obtener,crear,modificar,cancelar,disponibilidad,vistaPrevia};
