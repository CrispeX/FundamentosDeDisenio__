const fs=require('fs');
const path=require('path');
const config=require('../src/config');
const {crearAlmacenSupabase}=require('../src/models/supabase');
async function main(){
  const almacen=crearAlmacenSupabase({url:config.SUPABASE_URL,key:config.SUPABASE_SECRET_KEY,projectRef:config.SUPABASE_PROJECT_REF});
  const snapshot=await almacen.leer();
  const tablas=['clientes','solicitudes','reservas','cotizaciones','pagos'];
  if(tablas.some(t=>snapshot.data[t].length))throw new Error('Las tablas Althea ya contienen datos. La importación inicial no sobrescribe registros.');
  const archivo=process.argv[2] || config.DB_FILE;
  const data=JSON.parse(fs.readFileSync(path.resolve(archivo),'utf8'));
  data.seq ||= {};
  for(const t of tablas){data[t] ||= [];data.seq[t]=data[t].reduce((n,x)=>Math.max(n,x.id),data.seq[t] || 0);}
  await almacen.guardar(snapshot.revision,data);
  console.log('Importación completada:',Object.fromEntries(tablas.map(t=>[t,data[t].length])));
}
main().catch(err=>{console.error(err.message);process.exitCode=1;});
