// Diagramas reproducibles del módulo; SVG editable y PNG para Canva.
const fs=require('node:fs');
const path=require('node:path');
const out=path.join(__dirname,'../docs/diagramas');
fs.mkdirSync(out,{recursive:true});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
let a=[];
function text(x,y,lines,size=25,weight='normal',anchor='start') {
  if(!Array.isArray(lines))lines=[lines];
  a.push(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${lines.map((s,i)=>`<tspan x="${x}" dy="${i?size*1.35:0}">${esc(s)}</tspan>`).join('')}</text>`);
}
function rect(x,y,w,h,fill='#fff',rx=0){a.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="#333" stroke-width="2"/>`);}
function line(points,{arrow=true,dash=false}={}){a.push(`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#333" stroke-width="2.5" ${arrow?'marker-end="url(#arrow)"':''} ${dash?'stroke-dasharray="9 6"':''}/>`);}
function start(x,y){a.push(`<circle cx="${x}" cy="${y}" r="11" fill="#222"/>`);}
function end(x,y){a.push(`<circle cx="${x}" cy="${y}" r="16" fill="#fff" stroke="#222" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="10" fill="#222"/>`);}
function diamond(x,y,size=18){a.push(`<polygon points="${x},${y-size} ${x+size},${y} ${x},${y+size} ${x-size},${y}" fill="#fff" stroke="#333" stroke-width="2.5"/>`);}
function comp(x,y){a.push(`<polygon points="${x},${y} ${x-9},${y+14} ${x},${y+28} ${x+9},${y+14}" fill="#222"/>`);}
function node(x,y,w,h,lines){rect(x,y,w,h,'#ffffdf',12);text(x+w/2,y+h/2-(Array.isArray(lines)?(lines.length-1)*15:0)+8,lines,25,'normal','middle');}
function frame(x,y,w,h,name){rect(x,y,w,h);rect(x,y,Math.min(w-20,620),42,'#f4f4f4');text(x+15,y+29,name,23,'bold');}
function page(file,title,subtitle,draw){a=[`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="#333" stroke-width="1.5"/></marker></defs><g font-family="Segoe UI,Arial,sans-serif" fill="#111"><rect width="1920" height="1080" fill="white"/>`];text(60,65,title,34,'bold');if(subtitle)text(60,107,subtitle,23);draw();a.push('</g></svg>');fs.writeFileSync(path.join(out,file+'.svg'),a.join('\n'));}

page('05_mapa','USER STORY MAP · Althea | Solicitudes, reservas y abonos','Actor: asesor comercial · Recorrido y entregas del módulo',()=>{
  const cols=[['Cliente',['Crear o seleccionar cliente','Buscar por nombre o correo','Editar datos de contacto']],['Perfil de viaje',['Registrar viajeros y fechas','Elegir intereses y presupuesto','Editar perfil y regenerar ideas']],['Cotización',['Crear y editar borrador','Ver servicios y valor total','Rechazar o continuar a reserva']],['Reserva',['Ver disponibilidad y detalles','Elegir asientos y ver políticas','Revisar y confirmar la reserva']],['Abonos y reportes',['Registrar y consultar abonos','Anular registro y recalcular saldo','Filtrar y exportar reporte CSV']]];
  cols.forEach(([title,rows],i)=>{const x=60+i*365;rect(x,160,340,80,'#f1f1f1',10);text(x+170,210,title,28,'bold','middle');rows.forEach((r,j)=>{rect(x,270+j*150,340,125,j===2?'#fff5df':'#f5f8f6',10);const words=r.split(' ');let lines=[''];words.forEach(w=>{let n=lines.length-1;if((lines[n]+' '+w).length>23)lines.push(w);else lines[n]+=(lines[n]?' ':'')+w;});text(x+24,316+j*150,lines,25);});});
  rect(60,780,1800,110,'#edf5ef',8);text(85,820,'Reglas del recorrido',26,'bold');text(85,860,'Validar datos · Un asiento por viajero · Evitar sobrepagos · Comprobar cupos al guardar',25);
  text(60,950,'Sprint 1: cliente, solicitud y cotización. Sprint 2: reserva, políticas, abonos y reportes.',25);
  text(60,997,'Validación externa pendiente: acceso al Supabase original y generación con una clave propia de IA.',23);
});

page('06_actividades','act Althea :: Solicitar y reservar un viaje','Decisiones sin nombre; condiciones en las salidas. Cada proceso tiene un único nodo final.',()=>{
  frame(60,150,1800,375,'Capturar y revisar el perfil de viaje');
  start(100,270);node(145,230,270,80,['Capturar cliente','y viajeros']);node(470,230,270,80,['Ingresar fechas','y preferencias']);diamond(810,270);node(900,220,300,90,['Obtener ideas de IA','o del catálogo']);node(1260,220,300,90,['Elegir destino','y revisar perfil']);diamond(1640,265);
  line([[112,270],[145,270]]);line([[415,270],[470,270]]);line([[740,270],[792,270]]);line([[828,270],[900,270]]);line([[1200,265],[1260,265]]);line([[1560,265],[1622,265]]);line([[1658,265],[1765,265],[1765,425]]);text(1690,240,'[válido]',22);
  node(1495,425,270,65,'Guardar solicitud');line([[1495,458],[1430,458]]);end(1410,458);
  line([[1640,283],[1640,365],[810,365],[810,288]]);text(1180,351,'[datos incompletos] / corregir',22);
  frame(60,565,1800,455,'Formalizar la reserva');
  start(100,735);diamond(160,735,14);node(220,695,260,80,['Consultar cupos','y detalles']);diamond(530,735);diamond(575,735,14);node(620,695,290,80,['Seleccionar asientos','y aceptar políticas']);diamond(980,735);node(1060,695,250,80,['Mostrar vista previa','del servidor']);node(1380,695,250,80,['Confirmar y validar','cupos otra vez']);diamond(1700,735);
  line([[112,735],[146,735]]);line([[174,735],[220,735]]);line([[480,735],[512,735]]);line([[548,735],[561,735]]);line([[589,735],[620,735]]);text(430,680,'[hay cupos]',22);line([[910,735],[962,735]]);line([[998,735],[1060,735]]);text(1010,680,'[selección válida]',22);line([[1310,735],[1380,735]]);line([[1630,735],[1682,735]]);
  node(1410,900,260,70,'Guardar reserva');line([[1700,753],[1700,935],[1670,935]]);text(1720,845,'[vigente]',22);
  diamond(1180,950);line([[1410,935],[1300,935],[1300,950],[1198,950]]);line([[1180,968],[1180,979]]);end(1180,995);
  line([[530,753],[530,950],[1162,950]]);text(555,920,'[sin cupos] / informar',22);
  line([[980,717],[980,665],[575,665],[575,721]]);text(630,653,'[selección inválida] / corregir',22);
  line([[1700,717],[1700,635],[160,635],[160,721]]);text(1120,624,'[cambió disponibilidad] / actualizar',22);
});

function klass(x,y,title,attrs,methods){rect(x,y,330,270,'#ffffdf');line([[x,y+55],[x+330,y+55]],{arrow:false});line([[x,y+174],[x+330,y+174]],{arrow:false});text(x+165,y+36,title,27,'bold','middle');text(x+16,y+88,attrs,23);text(x+16,y+211,methods,23);}
page('07_clases','class Althea :: Modelo de dominio','Relaciones ortogonales · Composición para objetos contenidos · Dependencia del recomendador',()=>{
  klass(60,185,'Cliente',['- id: entero','- nombre: texto','- correo: texto'],['+ crear()','+ modificar()']);
  klass(525,185,'Solicitud',['- id: entero','- destino: texto','- estado: EstadoSolicitud'],['+ crear()','+ modificarPerfil()']);
  klass(990,185,'Cotización',['- id: entero','- total: dinero','- estado: EstadoCotización'],['+ modificar()','+ resolver()']);
  klass(1455,185,'Reserva',['- id: entero','- asientos: texto[]','- políticas: aceptación'],['+ vistaPrevia()','+ crear() / cancelar()']);
  klass(60,690,'Viajero',['- nombre: texto','- documento: texto','- tipo: Adulto | Niño'],['+ validarDatos()']);
  klass(525,690,'PerfilViaje',['- fechas: fecha[]','- presupuesto: dinero','- intereses: texto[]'],['+ validarViaje()','+ guardarPerfil()']);
  klass(990,690,'Recomendador',['- catálogo: Destino[]','- modo: IA | local'],['+ recomendar(perfil)','+ sugerenciasLocales()']);
  klass(1455,690,'Pago',['- monto: dinero','- referencia: texto','- estado: EstadoPago'],['+ registrarPago()','+ anularPago()']);
  line([[390,310],[525,310]],{arrow:false});text(405,292,'1',22);text(465,292,'0..*',22);text(410,345,'solicita',21);
  line([[855,310],[990,310]],{arrow:false});text(870,292,'1',22);text(930,292,'0..*',22);text(875,345,'origina',21);
  line([[1320,310],[1455,310]],{arrow:false});text(1333,292,'0..1',22);text(1405,292,'0..1',22);
  comp(595,455);line([[595,483],[595,570],[225,570],[225,690]],{arrow:false});text(235,668,'1..30',22);text(610,495,'1',22);
  comp(735,455);line([[735,483],[735,690]],{arrow:false});text(750,660,'1',22);text(750,500,'1',22);
  line([[990,825],[855,825]],{dash:true});text(871,802,'usa',22);
  comp(1620,455);line([[1620,483],[1620,690]],{arrow:false});text(1635,500,'1',22);text(1635,660,'0..*',22);
  line([[780,185],[780,145],[1690,145],[1690,185]],{arrow:false});text(795,173,'1',22);text(1610,173,'0..*',22);text(1120,135,'Solicitud genera reservas',22);text(1010,660,'«servicio»',22);
});

page('08_estados','stm Althea :: Estados de entidades del viaje','Los rectángulos representan estados; los eventos y las guardas se escriben en las transiciones.',()=>{
  frame(60,155,1800,235,'Objeto: Solicitud');start(120,275);node(230,230,340,85,'Pendiente');node(1320,230,340,85,'Reservada');line([[132,275],[230,275]]);line([[570,255],[1320,255]]);text(690,236,'confirmarReserva [vista válida y cupos]',24);line([[1320,300],[1320,350],[400,350],[400,315]]);text(690,337,'cancelarReserva / liberar cupos',24);
  frame(60,430,1800,235,'Objeto: Reserva');start(120,550);node(230,505,340,85,'Confirmada');node(1320,505,340,85,'Cancelada');line([[132,550],[230,550]]);line([[570,550],[1320,550]]);text(690,528,'cancelar [totalPagado = 0] / liberar cupos',24);line([[1660,550],[1745,550]]);end(1765,550);line([[320,590],[320,630],[520,630],[520,590]]);text(620,632,'modificarFechas [cupos y asientos libres]',23);
  frame(60,705,1800,315,'Objeto: Cotización');start(120,835);node(230,790,320,85,'Borrador');node(800,750,320,85,'Aceptada');node(1420,750,320,85,'Cancelada');node(800,910,320,75,'Rechazada');line([[132,835],[230,835]]);line([[550,810],[650,810],[650,790],[800,790]]);text(560,775,'aceptar [vista válida]',23);line([[1120,790],[1420,790]]);text(1150,765,'cancelarReserva',22);line([[550,855],[650,855],[650,947],[800,947]]);text(80,985,'rechazar / editarPerfil',22);line([[1740,790],[1790,790],[1790,947],[1120,947]],{arrow:false});line([[1790,947],[1815,947]]);end(1835,947);
});

page('09_pagos','stm Althea :: Registro de pagos y saldo','El registro de abonos y el estado financiero de la reserva son objetos diferentes.',()=>{
  frame(60,150,1800,300,'Objeto: Pago');start(120,300);node(300,255,350,90,'Registrado');node(1260,255,350,90,'Anulado');line([[132,300],[300,300]]);text(150,220,'registrar [monto ≤ saldo]',23);line([[650,300],[1260,300]]);text(790,278,'anularPago / recalcular saldo',25);line([[1610,300],[1740,300]]);end(1760,300);
  frame(60,500,1800,500,'Reserva: reglas del saldo y estado financiero');
  text(105,610,'Condición del objeto Reserva',27,'bold');text(1030,610,'Estado y resultado',27,'bold');
  const reglas=[['Sin cotización aceptada','Sin cotización · no admite pagos'],['Total > 0 y pagado = 0','Pendiente · saldo = total'],['0 < pagado < total','Parcial · saldo = total − pagado'],['Pagado = total','Pagada · saldo = 0'],['Reserva cancelada','Cancelada · saldo = 0; no admite pagos']];
  reglas.forEach(([c,r],i)=>{const yy=665+i*60;line([[100,yy+18],[1815,yy+18]],{arrow:false});text(105,yy,c,25);text(1030,yy,r,25);});
  text(105,982,'Pagado = suma de abonos Registrados. Anular un abono recalcula el saldo.',23);
});

page('10_arquitectura','cmp Althea :: Arquitectura y alcance comprobado','Aplicación Node.js sin dependencias de ejecución · Interfaz del asesor comercial',()=>{
  node(100,250,400,150,['Navegador','Clientes · Perfil · Reservas','Abonos · Reportes']);node(730,250,450,150,['Servidor Node.js','Validaciones y servicios','Vista previa e inventario']);node(1430,250,400,150,['Supabase autorizado','Tablas althea_*','RPC y revisión atómica']);line([[500,325],[730,325]]);text(555,300,'HTTP / JSON',23);line([[1180,325],[1430,325]]);text(1210,300,'RPC privada',23);
  node(100,610,400,150,['Modo de práctica','Archivo JSON aislado','Pruebas sin conexión']);node(730,610,450,150,['Recomendador','OpenAI si hay clave propia','Catálogo si falta o falla']);node(1430,610,400,150,['Inventario interno','Cupos por salida y servicio','Asientos por viajero']);line([[730,360],[615,360],[615,685],[500,685]]);line([[950,400],[950,610]]);line([[1180,360],[1290,360],[1290,685],[1430,685]]);
  rect(100,850,1730,150,'#f4f4f4',8);text(130,892,'Estado de la entrega',27,'bold');text(130,936,'Flujo local verificable. La IA real necesita clave. La base original requiere acceso y actualización SQL.',25);text(130,976,'La selección usa inventario académico; no integra proveedores de vuelos, hoteles o pasarelas bancarias.',24);
});

a=[`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900" viewBox="0 0 700 900"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="#333" stroke-width="1.5"/></marker></defs><g font-family="Segoe UI,Arial,sans-serif"><rect width="700" height="900" fill="white"/>`];
text(30,55,'act Althea :: Capturar y revisar perfil',27,'bold');start(350,105);line([[350,116],[350,160]]);
const pasos=[['Cliente','Buscar o registrar'],['Viajeros','Nombres, documentos y tipo'],['Destino y fechas','Origen, salida y regreso'],['Preferencias e ideas','Servicio, presupuesto e intereses'],['Revisión','Comprobar y guardar solicitud']];
pasos.forEach((s,i)=>{node(60,160+i*120,580,80,s);if(i<4)line([[350,240+i*120],[350,280+i*120]]);});line([[350,720],[350,800]]);end(350,820);a.push('</g></svg>');fs.writeFileSync(path.join(out,'03_perfil.svg'),a.join('\n'));
console.log('Se generaron los diagramas SVG en '+out);
