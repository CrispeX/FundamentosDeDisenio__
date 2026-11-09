const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
test('Exportación CSV: contenido, comillas y protección contra fórmulas', async () => {
  let blob, enlace, revocado;
  const ctx = vm.createContext({Blob, URL:{createObjectURL(b){blob=b; return 'blob:test';}, revokeObjectURL(u){revocado=u;}},
    document:{body:{appendChild(a){a.attached=true;}},createElement(){ enlace={click(){assert.equal(this.attached,true);this.clicked=true;},remove(){this.removed=true;}};return enlace;}}, setTimeout(fn){fn();}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/gestion.js'),'utf8'),ctx);
  vm.runInContext('descargarCsv("prueba.csv", [["Reserva","Cliente"], ["RES-0001", "=1+1"], ["RES-0002", \'Nombre "Prueba"\']])',ctx);
  assert.equal(enlace.download,'prueba.csv'); assert.equal(enlace.clicked,true);
  assert.equal(enlace.removed,true);
  const contenido=await blob.text();
  assert.ok(contenido.includes('"\'=1+1"'));
  assert.ok(contenido.includes('"Nombre ""Prueba"""'));
  assert.equal(contenido.split('\r\n').length,3);
  assert.equal(revocado,'blob:test');
});

test('CSV usa las fechas actuales aunque no se pulse Aplicar; no exporta rangos inválidos', async () => {
  const nodos = Object.fromEntries(['vista','desde','hasta','filtros-reporte','error-reporte','resultado-reporte','exportar','limpiar-reporte'].map(id=>['#'+id,{value:'',innerHTML:'',textContent:''}]));
  const reservas = [{id:1,codigo:'RES-1',cliente:{nombre:'Ana'},destino:'Cartagena',fechaSalida:'2028-01-10',fechaRegreso:'2028-01-15',estado:'Confirmada',total:1000,totalPagado:100,saldoPendiente:900},
    {id:2,codigo:'RES-2',cliente:{nombre:'Luis'},destino:'Bogotá',fechaSalida:'2028-02-10',fechaRegreso:'2028-02-15',estado:'Confirmada',total:2000,totalPagado:0,saldoPendiente:2000}];
  let filas, descargas=0;
  nodos['#filtros-reporte'].reset=()=>{nodos['#desde'].value='';nodos['#hasta'].value='';};
  const ctx=vm.createContext({$:s=>nodos[s],api:async(_,ruta)=>ruta==='/api/reservas'?reservas:[{reservaId:1,estado:'Registrado',monto:100}],esc:String,fmtMoneda:String,fmtFecha:String,
    exportar:(_,f)=>{filas=f;descargas++;}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/gestion.js'),'utf8'),ctx);
  vm.runInContext('descargarCsv=exportar',ctx);
  await vm.runInContext('gestionarReportes()',ctx);
  nodos['#desde'].value='2028-02-01';nodos['#hasta'].value='2028-02-29';
  nodos['#exportar'].onclick();
  assert.equal(filas.length,2);assert.equal(filas[1][0],'RES-2');
  assert.ok(!nodos['#resultado-reporte'].innerHTML.includes('RES-1'));
  nodos['#hasta'].value='2028-01-01';nodos['#exportar'].onclick();
  assert.equal(descargas,1);assert.match(nodos['#error-reporte'].textContent,/posterior/);
  assert.equal(nodos['#resultado-reporte'].innerHTML,'');
  nodos['#limpiar-reporte'].onclick();nodos['#exportar'].onclick();assert.equal(filas.length,3);
  nodos['#desde'].value='2030-01-01';nodos['#exportar'].onclick();assert.equal(filas.length,1);
});

test('Cancelar una edición vuelve al listado sin guardar y quitar conserva los campos editados', async () => {
  let rutas=0, llamadas=0;
  const nodos=new Map();const nodo=s=>{if(!nodos.has(s))nodos.set(s,{value:'',innerHTML:''});return nodos.get(s);};
  const quitar={dataset:{quitar:'0'}};
  const ctx=vm.createContext({$:nodo,document:{querySelectorAll:()=>[quitar]},location:{hash:'#/solicitudes'},esc:String,
    detenerRecomendaciones(){},enrutar:async()=>{rutas++;},api:async()=>{llamadas++;}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/wizard.js'),'utf8'),ctx);
  vm.runInContext('reiniciarWizard();wz.id=7;wz.paso=2;wz.viajeros=[{nombre:"A",documento:"1",tipo:"Adulto"},{nombre:"B",documento:"2",tipo:"Adulto"}];vistaPaso=()=>"";renderStepper=()=>"";renderWizard()',ctx);
  for(const [id,value] of Object.entries({'#v-nombre-0':'A editado','#v-doc-0':'1','#v-tipo-0':'Adulto','#v-nombre-1':'B editado','#v-doc-1':'DOC-2','#v-tipo-1':'Niño'}))nodo(id).value=value;
  quitar.onclick();
  const viajeros=JSON.parse(vm.runInContext('JSON.stringify(wz.viajeros)',ctx));
  assert.deepEqual(viajeros,[{nombre:'B editado',documento:'DOC-2',tipo:'Niño'}]);
  quitar.onclick();assert.equal(vm.runInContext('wz.viajeros.length',ctx),1);
  await nodo('#cancelar').onclick();assert.equal(rutas,1);assert.equal(llamadas,0);
});

test('Paso Viajeros rechaza cero viajeros, documentos repetidos y más de treinta', () => {
  const ctx=vm.createContext({document:{querySelector(){return null;}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/wizard.js'),'utf8'),ctx);
  vm.runInContext('reiniciarWizard();wz.paso=2;wz.viajeros=[]',ctx);
  assert.match(vm.runInContext('validarPaso()',ctx),/1 y 30/);
  vm.runInContext('wz.viajeros=[{nombre:"A",documento:"doc"},{nombre:"B",documento:" DOC "}]',ctx);
  assert.match(vm.runInContext('validarPaso()',ctx),/diferente/);
  vm.runInContext('wz.viajeros=Array.from({length:31},(_,i)=>({nombre:"A",documento:String(i)}))',ctx);
  assert.match(vm.runInContext('validarPaso()',ctx),/1 y 30/);
});

test('Actualizar sugerencias vuelve a consultar aun si el perfil conserva un resultado anterior', () => {
  let consultas=0;
  const ctx=vm.createContext({wz:{paso:4,destino:{origen:'Medellín'},viajeros:[{tipo:'Adulto'}],preferencias:{presupuesto:1000},recomendaciones:{}},
    leerPaso(){},clearTimeout(){},setTimeout(fn){fn();return 1;}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/recomendaciones.js'),'utf8'),ctx);
  ctx.registrar=()=>{consultas++;};
  vm.runInContext('pintarRecomendaciones=()=>{};consultarRecomendaciones=registrar;wz.recomendaciones={clave:JSON.stringify(datosParaRecomendar()),datos:{modo:"local"}};programarRecomendaciones(false)',ctx);
  assert.equal(consultas,0);
  vm.runInContext('programarRecomendaciones(true)',ctx);
  assert.equal(consultas,1);
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
