const {test}=require('node:test');
const assert=require('node:assert/strict');
const {crearAlmacenSupabase}=require('../src/models/supabase');
const db=require('../src/models/db');
const clientes=require('../src/services/clientes.service');
const {HttpError}=require('../src/utils/errors');
const proyecto='ciwkgqdpogteheeyigxb';
const url='https://'+proyecto+'.supabase.co';
const estado=()=>({revision:0,data:{seq:{clientes:0,solicitudes:0,reservas:0,cotizaciones:0,pagos:0},clientes:[],solicitudes:[],reservas:[],cotizaciones:[],pagos:[],destinos:[]}});
const respuesta=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('El adaptador usa RPC y mantiene la clave fuera de URL y cuerpo',async()=>{
  const peticiones=[];
  const almacen=crearAlmacenSupabase({url,key:'sb_secret_ficticia',projectRef:proyecto,fetchImpl:async(u,o)=>{peticiones.push({u:String(u),o});return respuesta(200,String(u).endsWith('read_state')?estado():1);}});
  await almacen.leer();await almacen.guardar(0,estado().data);
  assert.match(peticiones[0].u,/\/rest\/v1\/rpc\/althea_read_state$/);
  assert.equal(peticiones[0].o.headers.apikey,'sb_secret_ficticia');
  assert.ok(!peticiones[0].u.includes('sb_secret_'));
  assert.ok(!peticiones[1].o.body.includes('sb_secret_'));
  assert.equal(JSON.parse(peticiones[1].o.body).expected_revision,0);
});
test('Rechaza proyectos distintos y claves públicas antes de hacer solicitudes',async()=>{
  let llamadas=0;const fetchImpl=async()=>{llamadas++;return respuesta(200,{});};
  for(const datos of [{url:'https://otro.supabase.co',key:'test'},{url,key:'sb_publishable_test'},{url,key:''}]){
    await assert.rejects(()=>crearAlmacenSupabase({...datos,projectRef:proyecto,fetchImpl}).leer(),e=>e.status===503);
  }
  assert.equal(llamadas,0);
});
test('Los errores del proveedor no filtran claves y solo la revisión permite reintentos',async()=>{
  for(const failure of [
    async()=>{throw Error('sb_secret_privada');},
    async()=>respuesta(401,{message:'sb_secret_privada',code:'42501'}),
  ]){
    await assert.rejects(()=>crearAlmacenSupabase({url,key:'sb_secret_privada',fetchImpl:failure}).leer(),e=>e.status===503 && !e.message.includes('sb_secret_privada'));
  }
  const a=crearAlmacenSupabase({url,key:'test',fetchImpl:async()=>respuesta(409,{code:'PT409',message:'ALTHEA_REVISION_CONFLICT'})});
  await assert.rejects(()=>a.guardar(0,{}),e=>e.status===409 && e.reintentar);
});
test('Dos clientes concurrentes se conservan con identificadores diferentes',async()=>{
  let persistido=estado(),guardados=0;
  const sesion=db.crearSesionRemota({
    leer:async()=>structuredClone(persistido),
    guardar:async(revision,data)=>{
      if(revision!==persistido.revision){const e=new HttpError(409,'Conflicto');e.reintentar=true;throw e;}
      persistido={revision:revision+1,data:structuredClone(data)};guardados++;
    }
  });
  const crear=n=>sesion(()=>clientes.crear({nombre:'Prueba '+n,correo:'prueba'+n+'@example.test',telefono:'3000000000'}));
  const lista=await Promise.all([crear(1),crear(2)]);
  assert.deepEqual(lista.map(c=>c.id).sort(),[1,2]);
  assert.equal(persistido.data.clientes.length,2);assert.equal(guardados,2);
});
test('Un error de negocio no guarda los cambios parciales; las lecturas tampoco escriben',async()=>{
  let llamadas=0;
  const sesion=db.crearSesionRemota({leer:async()=>estado(),guardar:async()=>llamadas++});
  await assert.rejects(()=>sesion(()=>{clientes.crear({nombre:'Prueba',correo:'rollback@example.test',telefono:'3000000000'});throw new HttpError(400,'Error de prueba');}));
  await sesion(()=>db.load().clientes);
  assert.equal(llamadas,0);
});
test('Una escritura fallida no devuelve éxito y los conflictos tienen límite',async()=>{
  let intentos=0;
  const sesion=db.crearSesionRemota({leer:async()=>estado(),guardar:async()=>{intentos++;const e=new HttpError(409,'Conflicto');e.reintentar=true;throw e;}});
  await assert.rejects(()=>sesion(()=>clientes.crear({nombre:'Prueba',correo:'limite@example.test',telefono:'3000000000'})),e=>e.status===409);
  assert.equal(intentos,4);
});
