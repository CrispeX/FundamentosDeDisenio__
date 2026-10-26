const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {crearRecomendador,prepararPerfil}=require('../src/services/recomendaciones.service');
const datos={destino:{origen:'Medellín',destino:'',fechaSalida:'2027-03-01',fechaRegreso:'2027-03-05'},viajeros:[{tipo:'Adulto',nombre:'Nombre privado',documento:'DOCUMENTO-PRIVADO'}],cliente:{correo:'privado@example.test'},preferencias:{tipoServicio:'Paquete',presupuesto:2000000,intereses:['Playa'],notas:'Quiero playa; contactar privado@example.test'}};
const respuesta=(items)=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({recomendaciones:items})}]}]})});
const items=[{id:'cartagena',motivo:'Playa y cultura para comparar con tu viaje.',consejo:'Solicita una cotización.'},{id:'santa-marta',motivo:'Una opción para explorar la costa.',consejo:'Planea traslados adecuados.'},{id:'san-andres',motivo:'Una alternativa de playa.',consejo:'Compara el costo de transporte.'}];
test('Sin clave devuelve tres opciones reales del catálogo y excluye el origen',async()=>{
  const r=await crearRecomendador()(datos);
  assert.equal(r.modo,'local');assert.equal(r.recomendaciones.length,3);
  assert.equal(new Set(r.recomendaciones.map(x=>x.id)).size,3);
  assert.ok(r.recomendaciones.every(x=>x.destino!=='Medellín'));
});
test('Intereses y presupuesto cambian la selección sin prometer tarifas',async()=>{
  const rec=crearRecomendador();
  const playa=await rec({...datos,preferencias:{...datos.preferencias,presupuesto:300000}});
  const alto=await rec({...datos,preferencias:{...datos.preferencias,presupuesto:10000000}});
  const cultura=await rec({...datos,preferencias:{...datos.preferencias,intereses:['Cultura'],notas:''}});
  assert.notDeepEqual(playa.recomendaciones.map(x=>x.id),alto.recomendaciones.map(x=>x.id));
  assert.notDeepEqual(playa.recomendaciones.map(x=>x.id),cultura.recomendaciones.map(x=>x.id));
  assert.match(playa.aviso,/no son cotizaciones/);
});
test('Rechaza fechas imposibles, importes y perfiles inválidos antes del proveedor',async()=>{
  let llamadas=0; const rec=crearRecomendador({apiKey:'clave-ficticia',fetchImpl:async()=>{llamadas++;return respuesta(items);}});
  for(const cambio of [
    {destino:{...datos.destino,fechaSalida:'2027-02-30'}},
    {destino:{...datos.destino,fechaRegreso:'2026-01-01'}},
    {viajeros:[]},
    {preferencias:{presupuesto:-1}},
    {preferencias:{intereses:['Inventado']}}
  ])await assert.rejects(()=>rec({...datos,...cambio}),err=>err.status===400);
  assert.equal(llamadas,0);
});
test('El proveedor solo recibe perfil de viaje; clave en servidor y salida estructurada',async()=>{
  let peticion;
  const rec=crearRecomendador({apiKey:'clave-ficticia',fetchImpl:async(url,options)=>{peticion={url,options};return respuesta(items);}});
  const r=await rec(datos);
  assert.equal(r.modo,'ia');assert.equal(r.recomendaciones[0].destino,'Cartagena');
  const body=JSON.parse(peticion.options.body);
  assert.equal(body.store,false);assert.equal(body.text.format.type,'json_schema');
  assert.ok(!peticion.options.body.includes('DOCUMENTO-PRIVADO'));
  assert.ok(!peticion.options.body.includes('Nombre privado'));
  assert.ok(!peticion.options.body.includes('privado@example.test'));
  assert.ok(!peticion.options.body.includes('clave-ficticia'));
  assert.equal(peticion.options.headers.Authorization,'Bearer clave-ficticia');
});
test('Caché y consultas simultáneas evitan llamadas repetidas',async()=>{
  let llamadas=0;let resolver;const listo=new Promise(r=>resolver=r);
  const rec=crearRecomendador({apiKey:'test',fetchImpl:async()=>{llamadas++;await listo;return respuesta(items);}});
  const a=rec(datos),b=rec(datos);resolver();
  await Promise.all([a,b]);await rec(datos);
  assert.equal(llamadas,1);
});
test('Límite de consultas usa catálogo y vuelve a habilitar IA tras un minuto',async()=>{
  let tiempo=1000, llamadas=0;
  const rec=crearRecomendador({apiKey:'test',now:()=>tiempo,maxRequests:1,fetchImpl:async()=>{llamadas++;return respuesta(items);}});
  assert.equal((await rec(datos)).modo,'ia');
  const otros={...datos,preferencias:{...datos.preferencias,presupuesto:2500000}};
  assert.equal((await rec(otros)).modo,'local');assert.equal(llamadas,1);
  tiempo+=60001;
  assert.equal((await rec(otros)).modo,'ia');assert.equal(llamadas,2);
});
test('Error, tiempo agotado o respuesta inválida no bloquean el registro',async()=>{
  for(const fetchImpl of [
    async()=>({ok:false,json:async()=>({error:'clave-que-no-debe-filtrarse'})}),
    async()=>{throw new DOMException('clave-que-no-debe-filtrarse','TimeoutError');},
    async()=>respuesta([items[0],items[0],items[1]]),
    async()=>respuesta([{...items[0],id:'fuera-del-catalogo'},items[1],items[2]]),
    async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})})
  ]){
    const r=await crearRecomendador({apiKey:'test',fetchImpl})(datos);
    assert.equal(r.modo,'local');assert.equal(r.recomendaciones.length,3);
    assert.ok(!JSON.stringify(r).includes('clave-que-no-debe-filtrarse'));
  }
});
test('Las notas se reducen a categorías y los niños se cuentan sin identificarlos',()=>{
  const p=prepararPerfil({...datos,viajeros:[{tipo:'Adulto'},{tipo:'Niño',nombre:'Privado'}]});
  assert.equal(p.ninos,1);assert.equal(p.viajeros,2);
  assert.ok(p.intereses.includes('Playa'));assert.equal(p.notas,undefined);
});
test('El asistente permite destino vacío en paso 3 y exige elegirlo antes de guardar',()=>{
  const ctx=vm.createContext({document:{querySelector(){return null;}},Intl,setTimeout,clearTimeout});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/utils.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/wizard.js'),'utf8'),ctx);
  vm.runInContext('reiniciarWizard();wz.paso=3;wz.destino='+JSON.stringify(datos.destino),ctx);
  assert.equal(vm.runInContext('validarPaso()',ctx),'');
  vm.runInContext('wz.paso=4',ctx);
  assert.match(vm.runInContext('validarPaso()',ctx),/Elige un destino/);
  vm.runInContext("wz.destino.destino='Cartagena'",ctx);
  assert.equal(vm.runInContext('validarPaso()',ctx),'');
  assert.match(vm.runInContext('vistaPaso()',ctx),/Ideas para tu viaje/);
});

test('El recomendador utiliza el catálogo proporcionado por la base de datos',async()=>{
  const base=require('../src/data/destinos.json');
  const elegidos=base.destinos.filter(d=>['salento','pereira','cali','bogota'].includes(d.id));
  let lecturas=0;
  const rec=crearRecomendador({cargarCatalogo:async()=>{lecturas++;return {...base,destinos:elegidos};}});
  const r=await rec(datos);
  assert.equal(lecturas,1);assert.equal(r.recomendaciones.length,3);
  assert.ok(r.recomendaciones.every(s=>elegidos.some(d=>d.id===s.id)));
});
