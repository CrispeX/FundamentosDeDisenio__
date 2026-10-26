const { HttpError } = require('../utils/errors');
function crearAlmacenSupabase({url,key,projectRef,fetchImpl=globalThis.fetch,timeoutMs=15000}={}) {
  let destino;
  function comprobarConfiguracion() {
    if (!url || !key) throw new HttpError(503,'Configura SUPABASE_URL y SUPABASE_SECRET_KEY en el archivo .env del servidor.');
    try { destino=new URL(url); } catch { throw new HttpError(503,'La dirección de Supabase no es válida.'); }
    if (destino.protocol!=='https:' || destino.username || destino.password || destino.search || destino.hash ||
      (destino.pathname!=='/' && destino.pathname!=='') || (projectRef && destino.hostname!==projectRef+'.supabase.co'))
      throw new HttpError(503,'La dirección de Supabase no corresponde al proyecto autorizado.');
    if (key.startsWith('sb_publishable_')) throw new HttpError(503,'La conexión del servidor necesita una clave secret o service_role, no una clave pública.');
    if (key.split('.').length===3) {
      try {
        if(JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role!=='service_role') throw new Error();
      } catch { throw new HttpError(503,'La clave del servidor no tiene el rol service_role.'); }
    }
  }
  async function rpc(nombre,body={}) {
    comprobarConfiguracion();
    const headers={'Content-Type':'application/json',apikey:key};
    if(key.split('.').length===3)headers.Authorization='Bearer '+key;
    let res;
    try {
      res=await fetchImpl(new URL('/rest/v1/rpc/'+nombre,destino),{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
    } catch { throw new HttpError(503,'No se pudo completar la comunicación con Supabase. Comprueba la lista antes de repetir la operación.'); }
    const data=await res.json().catch(()=>null);
    if(!res.ok) {
      const conflicto=data?.message==='ALTHEA_REVISION_CONFLICT';
      const status=conflicto || data?.code==='23505' || data?.code==='PT409' ? 409 : ['23503','23514','23502','22P02','22007','22008','PT400'].includes(data?.code) ? 400 : 503;
      const mensaje=conflicto ? 'Los datos cambiaron. Vuelve a intentar.' :
        data?.code==='23505' ? 'Ya existe un registro con esos datos.' :
        data?.code==='PT409' || data?.code==='PT400' ? data.message :
        status===400 ? 'Los datos no cumplen las reglas de la base de datos.' :
        'Supabase rechazó la conexión. Revisa la clave y que el esquema Althea esté instalado.';
      const error=new HttpError(status,mensaje);error.reintentar=conflicto;throw error;
    }
    if(data===null)throw new HttpError(503,'Supabase devolvió una respuesta incompleta.');
    return data;
  }
  return {
    comprobarConfiguracion,
    leer:()=>rpc('althea_read_state'),
    guardar:(revision,data)=>rpc('althea_write_state',{expected_revision:revision,payload:data})
  };
}
module.exports={crearAlmacenSupabase};
