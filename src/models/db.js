const fs = require('fs');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');
const config = require('../config');
const { HttpError } = require('../utils/errors');
const { crearAlmacenSupabase } = require('./supabase');
const contexto = new AsyncLocalStorage();
const remoto=crearAlmacenSupabase({url:config.SUPABASE_URL,key:config.SUPABASE_SECRET_KEY,projectRef:config.SUPABASE_PROJECT_REF});
let local=null;
function normalizar(data) {
  data.seq ||= {};
  for(const tabla of ['clientes','solicitudes','reservas','cotizaciones','pagos']) {
    data[tabla] ||= [];
    data.seq[tabla]=data[tabla].reduce((n,x)=>Math.max(n,x.id),data.seq[tabla] || 0);
  }
  return data;
}
function load() {
  const actual=contexto.getStore();
  if(actual)return actual.data;
  if(config.STORAGE!=='json')throw new HttpError(503,'La operación necesita una sesión de base de datos.');
  if(!local) {
    try { local=JSON.parse(fs.readFileSync(config.DB_FILE,'utf8')); }
    catch(err){if(err.code!=='ENOENT')throw err;local={};}
    normalizar(local);
  }
  return local;
}
function save() {
  const actual=contexto.getStore();
  if(actual){actual.modificado=true;return;}
  if(config.STORAGE!=='json')throw new HttpError(503,'No hay una sesión de base de datos activa.');
  fs.mkdirSync(path.dirname(config.DB_FILE),{recursive:true});
  const temporal=config.DB_FILE+'.tmp';
  fs.writeFileSync(temporal,JSON.stringify(load(),null,2));fs.renameSync(temporal,config.DB_FILE);
}
function nextId(tabla){const d=load();return ++d.seq[tabla];}
function crearSesionRemota(almacen) {
  return async function request(accion) {
    for(let intento=0;intento<4;intento++) {
      const snapshot=await almacen.leer();
      if(!snapshot || !Number.isSafeInteger(snapshot.revision) || !snapshot.data || !['clientes','solicitudes','reservas','cotizaciones','pagos','destinos'].every(t=>Array.isArray(snapshot.data[t])))
        throw new HttpError(503,'La base de datos devolvió un estado inválido.');
      const sesion={data:normalizar(snapshot.data),modificado:false};
      try {
        return await contexto.run(sesion,async()=>{
          const resultado=await accion();
          if(sesion.modificado)await almacen.guardar(snapshot.revision,sesion.data);
          return resultado;
        });
      } catch(err) {
        if(!err.reintentar || intento===3)throw err;
      }
    }
  };
}
const sesionRemota=crearSesionRemota(remoto);
async function request(accion) {
  if(config.STORAGE==='json')return accion();
  if(config.STORAGE!=='supabase')throw new HttpError(503,'ALTHEA_STORAGE debe ser supabase o json.');
  return sesionRemota(accion);
}
async function comprobarConexion() {
  if(config.STORAGE==='json'){load();return;}
  if(config.STORAGE!=='supabase')throw new HttpError(503,'ALTHEA_STORAGE debe ser supabase o json.');
  remoto.comprobarConfiguracion();
  await sesionRemota(()=>load());
}
module.exports={load,save,nextId,request,comprobarConexion,crearSesionRemota};
