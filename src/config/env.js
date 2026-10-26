const fs = require('fs');
const path = require('path');
// Archivo opcional del proyecto. Las variables del entorno tienen prioridad.
const archivo = path.join(__dirname, '..', '..', '.env');
try {
  const permitidas = new Set(['OPENAI_API_KEY','OPENAI_MODEL']);
  for (const linea of fs.readFileSync(archivo,'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (!m || !permitidas.has(m[1]) || process.env[m[1]] !== undefined) continue;
    let valor=m[2];
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) valor=valor.slice(1,-1);
    process.env[m[1]]=valor;
  }
} catch(err) { if(err.code !== 'ENOENT') throw err; }
