const fs = require('fs');
const path = require('path');
const { DB_FILE } = require('../config');
let data = null;
function load() {
  if (!data) {
    try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch (err) {
      if (err.code !== 'ENOENT') throw err;
      data = {};
    }
    data.seq ||= {};
    for (const tabla of ['clientes', 'solicitudes', 'reservas', 'cotizaciones', 'pagos']) {
      data[tabla] ||= [];
      data.seq[tabla] = Math.max(data.seq[tabla] || 0, ...data[tabla].map(x => x.id), 0);
    }
  }
  return data;
}
function save() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const temporal = DB_FILE + '.tmp';
  fs.writeFileSync(temporal, JSON.stringify(data, null, 2));
  fs.renameSync(temporal, DB_FILE);
}
function nextId(tabla) { const d = load(); return ++d.seq[tabla]; }
module.exports = { load, save, nextId };
