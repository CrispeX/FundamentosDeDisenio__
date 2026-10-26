const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'althea-test-'));
process.env.ALTHEA_DB_FILE = path.join(dir, 'db.json');
process.env.OPENAI_API_KEY = '';
const { handleApi } = require('../src/routes');
test('Flujo completo de clientes, solicitudes, cotizaciones, reservas y pagos', async t => {
  const server = http.createServer(handleApi);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, {recursive:true, force:true}); });
  async function api(method, ruta, body, status = 200) {
    const r = await fetch(base + ruta, {method, headers:{'Content-Type':'application/json'}, body:body === undefined ? undefined : JSON.stringify(body)});
    const json = await r.json(); assert.equal(r.status, status, JSON.stringify(json)); return json;
  }
  const cliente = {nombre:'Cliente de prueba',correo:'cliente@example.test',telefono:'3000000000'};
  const datos = {cliente,viajeros:[{nombre:'Viajero de prueba',documento:'TEST-001',tipo:'Adulto'}],destino:{origen:'Medellín',destino:'Cartagena',fechaSalida:'2027-02-01',fechaRegreso:'2027-02-06'},preferencias:{tipoServicio:'Paquete',presupuesto:1500000}};
  await t.test('Una solicitud inválida no crea clientes huérfanos', async () => {
    await api('POST','/api/solicitudes',{...datos,viajeros:[]},400);
    assert.equal((await api('GET','/api/clientes')).length,0);
    await api('POST','/api/solicitudes',{...datos,destino:{...datos.destino,fechaSalida:'2027-02-30'}},400);
    await api('POST','/api/solicitudes',{...datos,preferencias:{presupuesto:-1}},400);
  });
  const ideas = await api('POST','/api/recomendaciones',datos);
  assert.equal(ideas.modo,'local'); assert.equal(ideas.recomendaciones.length,3);
  assert.equal((await api('GET','/api/clientes')).length,0);
  const s = await api('POST','/api/solicitudes',datos,201);
  await t.test('Clientes: buscar, editar y rechazar correo duplicado', async () => {
    const c = (await api('GET','/api/clientes?q=cliente'))[0];
    await api('PATCH','/api/clientes/'+c.id,{...cliente,nombre:'Cliente actualizado'});
    await api('POST','/api/clientes',cliente,409);
    assert.equal((await api('GET','/api/solicitudes'))[0].cliente.nombre,'Cliente actualizado');
  });
  let c;
  await t.test('Cotizaciones: crear, editar y aceptar', async () => {
    await api('POST','/api/cotizaciones',{solicitudId:s.id,descripcion:'Paquete',total:-1},400);
    await api('POST','/api/cotizaciones',{solicitudId:s.id,descripcion:'Paquete',total:0.001},400);
    c = await api('POST','/api/cotizaciones',{solicitudId:s.id,descripcion:'Hotel y vuelos',total:1000},201);
    await api('POST','/api/cotizaciones',{solicitudId:s.id,descripcion:'Duplicada',total:1000},409);
    await api('PATCH','/api/cotizaciones/'+c.id,{descripcion:'Hotel y vuelos editados',total:1200});
    await api('POST','/api/cotizaciones/'+c.id+'/estado',{estado:'Aceptada'});
    await api('POST','/api/cotizaciones/'+c.id+'/estado',{estado:'Aceptada'},409);
  });
  let r = (await api('GET','/api/reservas'))[0];
  await t.test('Reservas: fechas sincronizadas y prevención de duplicados', async () => {
    assert.equal(r.total,1200); assert.equal(r.saldoPendiente,1200);
    await api('POST','/api/reservas',{solicitudId:s.id},409);
    await api('PATCH','/api/reservas/'+r.id,{fechaSalida:'2027-03-01',fechaRegreso:'2027-02-01'},400);
    await api('PATCH','/api/reservas/'+r.id,{fechaSalida:'2027-03-01',fechaRegreso:'2027-03-06'});
    assert.equal((await api('GET','/api/solicitudes'))[0].destino.fechaSalida,'2027-03-01');
  });
  let p;
  await t.test('Pagos parciales, duplicados, sobrepagos y anulación', async () => {
    await api('POST','/api/pagos',{reservaId:r.id,monto:1201,metodo:'Efectivo',referencia:'TEST-X'},409);
    p = await api('POST','/api/pagos',{reservaId:r.id,monto:500,metodo:'Transferencia',referencia:'TEST-1'},201);
    await api('POST','/api/pagos',{reservaId:r.id,monto:1,metodo:'Transferencia',referencia:'TEST-1'},409);
    r = await api('GET','/api/reservas/'+r.id); assert.equal(r.saldoPendiente,700);
    await api('POST','/api/reservas/'+r.id+'/cancelar',undefined,409);
    await api('POST','/api/pagos/'+p.id+'/anular');
    assert.equal((await api('GET','/api/reservas/'+r.id)).saldoPendiente,1200);
    await api('POST','/api/pagos/'+p.id+'/anular',undefined,409);
  });
  await t.test('Cancelación coherente y nueva reserva de la misma solicitud', async () => {
    await api('POST','/api/reservas/'+r.id+'/cancelar');
    assert.equal((await api('GET','/api/solicitudes'))[0].estado,'Pendiente');
    assert.equal((await api('GET','/api/reservas/'+r.id)).saldoPendiente,0);
    assert.equal((await api('GET','/api/cotizaciones'))[0].estado,'Cancelada');
    await api('POST','/api/pagos',{reservaId:r.id,monto:1,metodo:'Efectivo',referencia:'TEST-2'},409);
    await api('PATCH','/api/reservas/'+r.id,{fechaSalida:'2027-03-01',fechaRegreso:'2027-03-06'},409);
    const nueva = await api('POST','/api/reservas',{solicitudId:s.id},201);
    assert.equal(nueva.fechaSalida,'2027-03-01');
    const cot = await api('POST','/api/cotizaciones',{solicitudId:s.id,descripcion:'Paquete nuevo',total:10.25},201);
    await api('POST','/api/cotizaciones/'+cot.id+'/estado',{estado:'Aceptada'});
    assert.equal((await api('GET','/api/reservas')).length,2);
    await api('POST','/api/pagos',{reservaId:nueva.id,monto:10.25,metodo:'Efectivo',referencia:'TEST-3'},201);
    assert.equal((await api('GET','/api/reservas/'+nueva.id)).saldoPendiente,0);
  });
  await t.test('Rechazo, errores de rutas y persistencia JSON', async () => {
    const s2 = await api('POST','/api/solicitudes',{...datos,cliente:{id:s.clienteId}},201);
    const cot = await api('POST','/api/cotizaciones',{solicitudId:s2.id,descripcion:'Prueba',total:100},201);
    await api('POST','/api/cotizaciones/'+cot.id+'/estado',{estado:'Rechazada'});
    await api('PATCH','/api/cotizaciones/'+cot.id,{descripcion:'No editable',total:1},409);
    await api('GET','/api/reservas/999',undefined,404);
    await api('GET','/api/inexistente',undefined,404);
    const persisted=JSON.parse(fs.readFileSync(process.env.ALTHEA_DB_FILE,'utf8'));
    assert.equal(persisted.reservas.length,2); assert.equal(persisted.pagos.length,2);
  });
});
