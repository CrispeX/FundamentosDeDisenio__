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

async function vistaClientes() {
  const lista = await api('GET', '/api/clientes');
  $('#vista').innerHTML = `
    <header class="encabezado"><div class="titulo"><h1>Clientes</h1></div></header>
    <div class="tabla-wrap"><table>
      <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th></tr></thead>
      <tbody>${lista.map(c => `<tr><td>${esc(c.nombre)}</td><td>${esc(c.correo)}</td><td>${esc(c.telefono)}</td></tr>`).join('')}</tbody>
    </table></div>`;
}

function vistaPendiente(titulo) {
  $('#vista').innerHTML = `
    <header class="encabezado"><div class="titulo"><h1>${titulo}</h1></div></header>
    <div class="tabla-wrap"><div class="vacio">Este módulo aún no está disponible.</div></div>`;
}

async function enrutar() {
  const ruta = location.hash.replace(/^#\//, '') || 'inicio';
  const base = ruta.split('/')[0];
  pintarMenu(base);
  try {
    if (ruta === 'solicitudes/nueva') return vistaNuevaSolicitud();
    if (base === 'inicio') return await vistaInicio();
    if (base === 'clientes') return await vistaClientes();
    if (base === 'solicitudes') return await vistaSolicitudes();
    if (base === 'reservas') return await vistaReservas();
    const item = MENU.find(([k]) => k === base);
    vistaPendiente(item ? item[1] : 'No encontrado');
  } catch (e) {
    toast(e.message, true);
  }
}

window.addEventListener('hashchange', enrutar);
enrutar();
