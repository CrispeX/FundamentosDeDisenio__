const fs = require('fs');
const path = require('path');
const { DB_FILE } = require('../config');

let data = null;

function load() {
  if (!data) {
    try {
      data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      data = {
        clientes: [],
        solicitudes: [],
        reservas: [],
        seq: { clientes: 0, solicitudes: 0, reservas: 0 }
      };
    }
  }
  return data;
}

function save() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function nextId(tabla) {
  const d = load();
  d.seq[tabla] = (d.seq[tabla] || 0) + 1;
  return d.seq[tabla];
}

module.exports = { load, save, nextId };
