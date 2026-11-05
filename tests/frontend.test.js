const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
test('Exportación CSV: contenido, comillas y protección contra fórmulas', async () => {
  let blob, enlace, revocado;
  const ctx = vm.createContext({Blob, URL:{createObjectURL(b){blob=b; return 'blob:test';}, revokeObjectURL(u){revocado=u;}},
    document:{createElement(){ enlace={click(){this.clicked=true;}};return enlace;}}, setTimeout(fn){fn();}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/gestion.js'),'utf8'),ctx);
  vm.runInContext('descargarCsv("prueba.csv", [["Reserva","Cliente"], ["RES-0001", "=1+1"], ["RES-0002", \'Nombre "Prueba"\']])',ctx);
  assert.equal(enlace.download,'prueba.csv'); assert.equal(enlace.clicked,true);
  const contenido=await blob.text();
  assert.ok(contenido.includes('"\'=1+1"'));
  assert.ok(contenido.includes('"Nombre ""Prueba"""'));
  assert.equal(contenido.split('\r\n').length,3);
  assert.equal(revocado,'blob:test');
});

test('Editar perfil en Solicitudes vuelve a cargar la ruta aunque el hash no cambie', async () => {
  let rutas=0,peticion;
  const ctx=vm.createContext({document:{querySelector(){return null;}},location:{hash:'#/solicitudes'},
    api:async(method,url,body)=>{peticion={method,url,body};},toast(){},enrutar:async()=>{rutas++;}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/wizard.js'),'utf8'),ctx);
  vm.runInContext('reiniciarWizard();wz.id=7;wz.cliente.id=1;',ctx);
  await vm.runInContext('enviarSolicitud()',ctx);
  assert.equal(peticion.method,'PATCH');assert.equal(peticion.url,'/api/solicitudes/7/perfil');
  assert.equal(rutas,1);
});
