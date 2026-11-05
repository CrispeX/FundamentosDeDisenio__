const ICONOS = {
  inicio: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6z"/>',
  clientes: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6z"/>',
  solicitudes: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  cotizaciones: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  reservas: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  pagos: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18M7 15h4"/>',
  reportes: '<path d="M5 20V10M10 20V4M15 20v-7M20 20v-4"/>'
};

const MENU = [
  ['inicio', 'Inicio'], ['clientes', 'Clientes'], ['solicitudes', 'Solicitudes'], ['cotizaciones', 'Cotizaciones'],
  ['reservas', 'Reservas'], ['pagos', 'Pagos'], ['reportes', 'Reportes']
];
let rutasVisitadas=[location.hash || '#/inicio'],posicionRuta=0,moviendoHistorial=false;
function contextoNavegacion(ruta) {
  const hash=location.hash || '#/inicio';
  if(!moviendoHistorial && rutasVisitadas[posicionRuta]!==hash){rutasVisitadas=rutasVisitadas.slice(0,posicionRuta+1);rutasVisitadas.push(hash);posicionRuta++;}
  moviendoHistorial=false;
  $('#nav-atras').disabled=posicionRuta===0;
  $('#nav-adelante').disabled=posicionRuta>=rutasVisitadas.length-1;
  const titulo=MENU.find(([clave])=>clave===ruta.split('/')[0])?.[1] || 'Página';
  $('#miga').innerHTML='<a href="#/inicio">Inicio</a>'+ (ruta!=='inicio'?' / <span aria-current="page">'+esc(titulo)+'</span>':'');
}
$('#nav-atras').onclick=()=>{if(posicionRuta>0){moviendoHistorial=true;location.hash=rutasVisitadas[--posicionRuta];}};
$('#nav-adelante').onclick=()=>{if(posicionRuta<rutasVisitadas.length-1){moviendoHistorial=true;location.hash=rutasVisitadas[++posicionRuta];}};
async function revisarConexion() {
  const aviso = $('#conexion');
  try {
    const estado = await api('GET', '/api/estado');
    const conectado = estado.almacenamiento === 'supabase';
    aviso.hidden = !conectado;
    aviso.textContent = conectado ? 'Datos: Supabase conectado' : '';
    aviso.classList.remove('sin-conexion');
  } catch {
    aviso.hidden = false;
    aviso.textContent = 'Conexión de datos pendiente. Revisa la configuración y vuelve a intentar.';
    aviso.classList.add('sin-conexion');
  }
}

function pintarMenu(activo) {
  $('#menu').innerHTML = MENU.map(([clave, texto]) => `
    <a href="#/${clave}" class="${clave === activo ? 'activo' : ''}" ${clave === activo ? 'aria-current="page"' : ''}>
      <svg viewBox="0 0 24 24">${ICONOS[clave]}</svg>${texto}</a>`).join('');
}

async function vistaInicio() {
  const [clientes, solicitudes, reservas] = await Promise.all([
    api('GET', '/api/clientes'), api('GET', '/api/solicitudes'), api('GET', '/api/reservas')
  ]);
  const activas = reservas.filter(r => r.estado !== 'Cancelada').length;
  $('#vista').innerHTML = `
    <header class="encabezado">
      <div class="titulo"><h1>Inicio</h1></div>
      <a class="btn btn-primario" href="#/solicitudes/nueva" style="text-decoration:none">+ Nueva solicitud</a>
    </header>
    <div class="resumen">
      <div class="dato"><strong>${clientes.length}</strong><span>Clientes</span></div>
      <div class="dato"><strong>${solicitudes.length}</strong><span>Solicitudes</span></div>
      <div class="dato"><strong>${activas}</strong><span>Reservas activas</span></div>
    </div>`;
}

async function enrutar() {
  detenerRecomendaciones();
  const ruta = location.hash.replace(/^#\//, '') || 'inicio';
  const base = ruta.split('/')[0];
  if ($('#dialogo').open) cerrarDialogo();
  pintarMenu(base);
  contextoNavegacion(ruta);
  revisarConexion();
  try {
    if (ruta === 'solicitudes/nueva') return vistaNuevaSolicitud();
    if (base === 'inicio') return await vistaInicio();
    if (base === 'clientes') return await gestionarClientes();
    if (base === 'solicitudes') return await gestionarSolicitudes();
    if (base === 'reservas') return await vistaReservas();
    if (base === 'cotizaciones') return await gestionarCotizaciones();
    if (base === 'pagos') return await gestionarPagos();
    if (base === 'reportes') return await gestionarReportes();
    $('#vista').innerHTML = cabecera('Página no encontrada') + '<a href="#/inicio" class="btn">Volver al inicio</a>';
  } catch (e) {
    $('#vista').innerHTML = cabecera('No se pudo cargar la página') + '<p class="error">' + esc(e.message) + '</p><button class="btn" id="reintentar">Reintentar</button>';
    $('#reintentar').onclick = enrutar;
    toast(e.message, true);
  }
}

window.addEventListener('hashchange', enrutar);
enrutar();
