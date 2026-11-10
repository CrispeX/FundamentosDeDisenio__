const fs=require('node:fs');
const path=require('node:path');

function limpiarDemo(archivo) {
  const tablas=['clientes','solicitudes','reservas','cotizaciones','pagos'];
  const existe=fs.existsSync(archivo);
  const datos=existe ? JSON.parse(fs.readFileSync(archivo,'utf8')) : {};
  if(!datos || Array.isArray(datos) || typeof datos!=='object' ||
    (existe && !tablas.some(t=>Array.isArray(datos[t]))) ||
    tablas.some(t=>datos[t]!==undefined && !Array.isArray(datos[t])) ||
    (datos.seq!==undefined && (!datos.seq || Array.isArray(datos.seq) || typeof datos.seq!=='object')))
    throw new Error('El archivo no tiene el formato de datos de Althea. No se ha modificado.');
  const eliminados={};datos.seq ||= {};
  for(const tabla of tablas) {
    eliminados[tabla]=(datos[tabla] || []).length;
    datos.seq[tabla]=Math.max(Number(datos.seq[tabla]) || 0,...(datos[tabla] || []).map(r=>Number(r.id) || 0));
    datos[tabla]=[];
  }
  fs.mkdirSync(path.dirname(archivo),{recursive:true});
  const temporal=archivo+'.limpiar.tmp';
  fs.writeFileSync(temporal,JSON.stringify(datos,null,2)+'\n');
  fs.renameSync(temporal,archivo);
  return eliminados;
}

if(require.main===module) {
  const archivo=path.resolve(process.env.ALTHEA_DB_FILE || path.join(__dirname,'../data/practica.json'));
  try { console.log(JSON.stringify({archivo,eliminados:limpiarDemo(archivo)}));console.log('Registros locales vaciados. Inicia de nuevo la aplicación con npm run demo.'); }
  catch(err){console.error(err.message);process.exitCode=1;}
}
module.exports={limpiarDemo};
