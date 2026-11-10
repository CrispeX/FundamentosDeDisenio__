const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {limpiarDemo}=require('../scripts/limpiar-demo');

test('Vaciar datos elimina las operaciones y conserva catálogo, configuración e identificadores',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'althea-limpiar-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'practica.json');
  fs.writeFileSync(file,JSON.stringify({clientes:[{id:8,nombre:'Prueba'}],solicitudes:[{id:3,viajeros:[{documento:'TEST'}]}],reservas:[{id:5}],cotizaciones:[{id:7}],pagos:[{id:9}],seq:{clientes:10},destinos:[{id:'cartagena'}],reservasRevision:2}));
  assert.deepEqual(limpiarDemo(file),{clientes:1,solicitudes:1,reservas:1,cotizaciones:1,pagos:1});
  const d=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const tabla of ['clientes','solicitudes','reservas','cotizaciones','pagos'])assert.deepEqual(d[tabla],[]);
  assert.deepEqual(d.destinos,[{id:'cartagena'}]);assert.equal(d.reservasRevision,2);
  assert.deepEqual(d.seq,{clientes:10,solicitudes:3,reservas:5,cotizaciones:7,pagos:9});
  assert.equal(fs.existsSync(file+'.limpiar.tmp'),false);
});
test('Una demo inexistente queda vacía y un archivo inválido se conserva intacto',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'althea-limpiar-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'practica.json');limpiarDemo(file);
  assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).clientes.length,0);
  for(const texto of ['{mal JSON','{"clientes":"no es una lista"}','{"otroProyecto":[1]}']) {
    fs.writeFileSync(file,texto);assert.throws(()=>limpiarDemo(file));assert.equal(fs.readFileSync(file,'utf8'),texto);
  }
});
