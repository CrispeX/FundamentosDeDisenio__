const db = require('../models/db');
const v = require('../utils/validators');
const { HttpError } = require('../utils/errors');
function listar(q) {
  const todos = db.load().clientes;
  const t = String(q || '').toLowerCase();
  return todos.filter(c => [c.nombre, c.correo, c.telefono].some(x => String(x).toLowerCase().includes(t)));
}
function validar(datos, id) {
  const c = { nombre: v.requerido(datos.nombre, 'nombre completo'), correo: v.correo(datos.correo), telefono: v.requerido(datos.telefono, 'teléfono') };
  if (db.load().clientes.some(x => x.id !== Number(id) && x.correo.toLowerCase() === c.correo.toLowerCase()))
    throw new HttpError(409, 'Ya existe un cliente con ese correo');
  return c;
}
function crear(datos) {
  const valores = validar(datos);
  const cliente = { id: db.nextId('clientes'), ...valores };
  db.load().clientes.push(cliente); db.save(); return cliente;
}
function obtener(id) { return db.load().clientes.find(c => c.id === Number(id)); }
function modificar(id, datos) {
  const c = obtener(id);
  if (!c) throw new HttpError(404, 'Cliente no encontrado');
  Object.assign(c, validar(datos, id)); db.save(); return c;
}
module.exports = { listar, crear, obtener, modificar, validar };
