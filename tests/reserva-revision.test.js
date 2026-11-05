process.env.ALTHEA_STORAGE='json';
process.env.OPENAI_API_KEY='';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'althea-revision-'));
process.env.ALTHEA_DB_FILE=path.join(dir,'db.json');
const {handleApi}=require('../src/routes');

test('Reservas: revisión, inventario, perfiles y políticas',async t=>{
  const server=http.createServer(handleApi);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port;
  async function api(method,ruta,body,status=200){const r=await fetch(base+ruta,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j;}
  const perfil={cliente:{nombre:'Prueba académica',correo:'revision@example.test',telefono:'3000000000'},viajeros:[{nombre:'A',documento:'PRUEBA-A',tipo:'Adulto'},{nombre:'B',documento:'PRUEBA-B',tipo:'Niño'}],destino:{origen:'Medellín',destino:'Cartagena',fechaSalida:'2028-03-01',fechaRegreso:'2028-03-05'},preferencias:{tipoServicio:'Paquete',presupuesto:5000000,intereses:['Playa']}};
  const s=await api('POST','/api/solicitudes',perfil,201);
  const datos={solicitudId:s.id,asientos:['1A','1B'],politicasAceptadas:true};
  await t.test('No se reserva sin políticas, sin revisar o con asientos inválidos',async()=>{
    await api('POST','/api/reservas/vista-previa',{...datos,politicasAceptadas:false},400);
    await api('POST','/api/reservas',datos,409);
    await api('POST','/api/reservas/vista-previa',{...datos,asientos:['1A','1A']},400);
    await api('POST','/api/reservas/vista-previa',{...datos,asientos:['1A','99Z']},400);
    assert.equal((await api('GET','/api/reservas')).length,0);
  });
  let previa=await api('POST','/api/reservas/vista-previa',datos);
  await t.test('La revisión no guarda ni bloquea; una selección alterada se rechaza',async()=>{
    assert.equal((await api('GET','/api/reservas')).length,0);
    assert.equal((await api('GET','/api/disponibilidad?solicitudId='+s.id)).disponibles,24);
    await api('POST','/api/reservas',{...datos,asientos:['2A','2B'],vistaPreviaToken:previa.vistaPreviaToken},409);
  });
  const s2=await api('POST','/api/solicitudes',{...perfil,cliente:{id:s.clienteId}},201);
  const datos2={...datos,solicitudId:s2.id};
  const previa2=await api('POST','/api/reservas/vista-previa',datos2);
  let reserva=await api('POST','/api/reservas',{...datos,vistaPreviaToken:previa.vistaPreviaToken},201);
  await t.test('Confirmar comprueba de nuevo asientos; cancelar los libera',async()=>{
    await api('POST','/api/reservas',{...datos2,vistaPreviaToken:previa2.vistaPreviaToken},409);
    let o=await api('GET','/api/disponibilidad?solicitudId='+s2.id);
    assert.equal(o.disponibles,22);assert.equal(o.asientos.find(a=>a.codigo==='1A').disponible,false);
    await api('PATCH','/api/solicitudes/'+s.id+'/perfil',perfil,409);
    await api('POST','/api/reservas/'+reserva.id+'/cancelar');
    o=await api('GET','/api/disponibilidad?solicitudId='+s2.id);assert.equal(o.disponibles,24);
  });
  await t.test('Editar un perfil guarda sus preferencias y rechaza cotizaciones obsoletas',async()=>{
    const c=await api('POST','/api/cotizaciones',{solicitudId:s.id,descripcion:'Prueba',total:1000},201);
    const antes=await api('POST','/api/reservas/vista-previa',{...datos,cotizacionId:c.id});
    const editado=await api('PATCH','/api/solicitudes/'+s.id+'/perfil',{...perfil,preferencias:{...perfil.preferencias,intereses:['Cultura'],presupuesto:6000000}});
    assert.deepEqual(editado.preferencias.intereses,['Cultura']);assert.equal(editado.preferencias.presupuesto,6000000);
    assert.equal((await api('GET','/api/cotizaciones')).find(x=>x.id===c.id).estado,'Rechazada');
    await api('POST','/api/cotizaciones/'+c.id+'/estado',{...datos,estado:'Aceptada',vistaPreviaToken:antes.vistaPreviaToken},409);
    await api('POST','/api/reservas',{...datos,vistaPreviaToken:previa.vistaPreviaToken},409);
  });
  await t.test('Hoteles no admiten asientos y destinos sin oferta no se pueden reservar',async()=>{
    const hotel=await api('PATCH','/api/solicitudes/'+s.id+'/perfil',{...perfil,preferencias:{tipoServicio:'Hotel'}});
    assert.equal((await api('GET','/api/reservas/'+reserva.id)).preferencias.tipoServicio,'Paquete');
    const o=await api('GET','/api/disponibilidad?solicitudId='+s.id);assert.equal(o.tieneAsientos,false);assert.equal(o.capacidad,10);
    await api('POST','/api/reservas/vista-previa',datos,400);
    const d={...datos,asientos:[]};const p=await api('POST','/api/reservas/vista-previa',d);
    const r=await api('POST','/api/reservas',{...d,vistaPreviaToken:p.vistaPreviaToken},201);
    assert.deepEqual(r.asientos,[]);assert.ok(r.politicas.version);assert.equal(r.estadoPago,'Sin cotización');
    await api('PATCH','/api/solicitudes/'+s2.id+'/perfil',{...perfil,destino:{...perfil.destino,destino:'Destino sin catálogo'}});
    await api('POST','/api/reservas/vista-previa',datos2,409);
  });
  await t.test('Fechas e inventario de toda la salida se validan al reservar',async()=>{
    await api('PATCH','/api/solicitudes/'+s2.id+'/perfil',{...perfil,destino:{...perfil.destino,fechaSalida:'2020-01-01',fechaRegreso:'2020-01-03'}});
    await api('GET','/api/disponibilidad?solicitudId='+s2.id,undefined,400);
    const viajeros=Array.from({length:25},(_,i)=>({nombre:'Prueba '+i,documento:'T-'+i,tipo:'Adulto'}));
    await api('PATCH','/api/solicitudes/'+s2.id+'/perfil',{...perfil,viajeros});
    const o=await api('GET','/api/disponibilidad?solicitudId='+s2.id);assert.equal(o.puedeReservar,false);
    await api('POST','/api/reservas/vista-previa',datos2,409);
    await api('PATCH','/api/solicitudes/'+s2.id+'/perfil',{...perfil,viajeros:[perfil.viajeros[0],perfil.viajeros[0]]},400);
  });
});
