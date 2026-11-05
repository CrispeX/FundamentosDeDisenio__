const db = require('../models/db');
const v = require('../utils/validators');
const { HttpError } = require('../utils/errors');
const catalogo = require('../data/destinos.json');
const normalizar = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const claveOferta=(origen,destino,salida,servicio)=>JSON.stringify([normalizar(origen),normalizar(destino),salida,servicio]);
const POLITICAS = {
  version: 'academica-2026-11-v1',
  titulo: 'Políticas de la reserva académica',
  condiciones: [
    'El inventario y los asientos pertenecen al catálogo académico de Althea. No representan disponibilidad de aerolíneas, hoteles ni proveedores externos.',
    'El presupuesto del perfil es orientativo. El precio acordado es el de la cotización aceptada; sin cotización, el total queda pendiente.',
    'La vista previa no bloquea cupos. Al confirmar se comprueban nuevamente los cupos y asientos.',
    'Los cambios de fecha están sujetos al inventario de la nueva salida. Cancelar libera los cupos y asientos.',
    'Los abonos registran dinero recibido por el asesor. La aplicación no cobra tarjetas ni hace devoluciones; antes de cancelar se deben resolver y anular sus registros de pago.'
  ]
};
function consultar(s, cambios = {}, excluirReservaId = null) {
  const salida = v.fecha(cambios.fechaSalida || s.destino.fechaSalida, 'salida');
  const regreso = v.fecha(cambios.fechaRegreso || s.destino.fechaRegreso, 'regreso');
  v.rangoFechas(salida, regreso);
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  if (salida < hoy) throw new HttpError(400, 'La salida no puede estar en el pasado');
  const destino = catalogo.destinos.find(d => normalizar(d.nombre) === normalizar(s.destino.destino));
  const servicio = s.preferencias.tipoServicio;
  const tieneAsientos = servicio !== 'Hotel';
  const capacidad = destino ? (tieneAsientos ? 24 : 10) : 0;
  const clave = claveOferta(s.destino.origen,s.destino.destino,salida,servicio);
  const activas = db.load().reservas.filter(r => {
    if(r.estado==='Cancelada' || r.id===excluirReservaId)return false;
    if(r.oferta)return r.oferta.clave===clave;
    const original=db.load().solicitudes.find(x=>x.id===r.solicitudId);
    return original && claveOferta(original.destino.origen,original.destino.destino,r.fechaSalida,original.preferencias.tipoServicio)===clave;
  });
  const usados = new Set(activas.flatMap(r => r.asientos || []));
  const ocupados = activas.reduce((n,r) => n + (r.oferta?.cupos ?? db.load().solicitudes.find(x=>x.id===r.solicitudId)?.viajeros.length ?? 0), 0);
  const asientos = tieneAsientos && capacidad ? Array.from({length:6}, (_,i) => ['A','B','C','D'].map(letra => ({codigo:`${i+1}${letra}`, disponible:!usados.has(`${i+1}${letra}`)}))).flat() : [];
  return {
    clave, nombre: servicio === 'Hotel' ? 'Estadía del catálogo académico' : 'Salida del catálogo académico',
    origen:s.destino.origen, destino:s.destino.destino, fechaSalida:salida, fechaRegreso:regreso, servicio,
    capacidad, disponibles:Math.max(0,capacidad-ocupados), solicitados:s.viajeros.length,
    puedeReservar:capacidad-ocupados >= s.viajeros.length, tieneAsientos, asientos,
    aviso:'Inventario académico interno. No se consulta disponibilidad de proveedores externos.',
    detalle:destino ? `${servicio}: ${destino.actividades.join(', ')}. Cupos por viajero; los hoteles no incluyen selección de asiento.` : 'No hay una oferta registrada para este destino. Edita el perfil y elige un destino del catálogo.',
    politicas:POLITICAS
  };
}
function validarSeleccion(oferta, asientos) {
  if (!oferta.puedeReservar) throw new HttpError(409, 'No hay cupos suficientes para todos los viajeros');
  if (!Array.isArray(asientos)) throw new HttpError(400, 'Selecciona los asientos de los viajeros');
  if (!oferta.tieneAsientos) {
    if(asientos.length) throw new HttpError(400, 'El servicio Hotel no admite asientos');
    return [];
  }
  if(asientos.length !== oferta.solicitados || new Set(asientos).size !== asientos.length)
    throw new HttpError(400, 'Selecciona un asiento distinto por viajero');
  if(asientos.some(c => !oferta.asientos.some(a => a.codigo===c))) throw new HttpError(400, 'Asiento inválido');
  if(asientos.some(c => !oferta.asientos.some(a => a.codigo===c && a.disponible))) throw new HttpError(409, 'Uno de los asientos ya está ocupado. Actualiza la disponibilidad');
  return [...asientos];
}
module.exports = { consultar, validarSeleccion, POLITICAS };
