const db = require('../models/db');
const v = require('../utils/validators');

function listar(q) {
  const todos = db.load().clientes;
  if (!q) return todos;
  const t = q.toLowerCase();
  return todos.filter(c =>
    [c.nombre, c.correo, c.telefono].some(x => x.toLowerCase().includes(t))
  );
}

function crear(datos) {
  const cliente = {
    id: db.nextId('clientes'),
    nombre: v.requerido(datos.nombre, 'nombre completo'),
    correo: v.correo(datos.correo),
    telefono: v.requerido(datos.telefono, 'teléfono')
  };
  db.load().clientes.push(cliente);
  db.save();
  return cliente;
}

function obtener(id) {
  return db.load().clientes.find(c => c.id === Number(id));
}

module.exports = { listar, crear, obtener };
