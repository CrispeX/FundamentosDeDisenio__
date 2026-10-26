function abrirDialogo(titulo, contenido, guardar, etiqueta = 'Guardar') {
  const d = $('#dialogo');
  d.innerHTML = `<form id="form-dialogo"><h3>${esc(titulo)}</h3>${contenido}
    <div class="error" id="form-error" role="alert"></div>
    <div class="dialogo-pie"><button class="btn btn-borde" type="button" id="form-cerrar">Cerrar</button>
    ${guardar ? `<button class="btn btn-primario" type="submit">${esc(etiqueta)}</button>` : ''}</div></form>`;
  $('#form-cerrar').onclick = cerrarDialogo;
  $('#form-dialogo').onsubmit = async e => {
    e.preventDefault();
    if (!guardar) return;
    const boton = e.submitter; boton.disabled = true;
    $('#form-cerrar').disabled = true;
    const bloquear = e => e.preventDefault();
    d.addEventListener('cancel', bloquear);
    try { await guardar(new FormData(e.target)); }
    catch (err) { $('#form-error').textContent = err.message; }
    finally { boton.disabled = false; $('#form-cerrar').disabled = false; d.removeEventListener('cancel', bloquear); }
  };
  if (!d.open) d.showModal();
}
function entrada(nombre, etiqueta, valor = '', tipo = 'text', extra = '') {
  return `<div class="campo"><label for="f-${nombre}">${esc(etiqueta)} *</label><input id="f-${nombre}" name="${nombre}" type="${tipo}" value="${esc(valor)}" required ${extra}></div>`;
}
function cabecera(titulo, accion = '') {
  return `<header class="encabezado"><div class="titulo"><h1>${esc(titulo)}</h1></div>${accion}</header>`;
}
function botonAccion(etiqueta, atributo, id, peligro = false) {
  return `<button class="btn btn-chico ${peligro ? 'btn-peligro' : 'btn-soft'}" ${atributo}="${id}">${esc(etiqueta)}</button>`;
}
function tabla(encabezados, filas, vacio) {
  return filas.length ? `<table><thead><tr>${encabezados.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table>` : `<div class="vacio">${esc(vacio)}</div>`;
}
function buscarTabla(filas, q) {
  const normalizar = texto => String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return filas.filter(x => normalizar(JSON.stringify({ ...x, codigo: x.codigo || 'SOL-' + String(x.id).padStart(4, '0') })).includes(normalizar(q)));
}
function filtrosTabla(estados = []) {
  return `<div class="filtros"><input id="filtro-texto" type="search" aria-label="Buscar" placeholder="Buscar por código, cliente o destino…">${estados.length ? `<select id="filtro-estado" aria-label="Filtrar por estado"><option value="">Todos los estados</option>${estados.map(e => `<option>${e}</option>`).join('')}</select>` : ''}</div><div class="tabla-wrap" id="lista-gestion"></div>`;
}
function conectarFiltros(lista, pintar) {
  const render = () => pintar(buscarTabla(lista, $('#filtro-texto').value).filter(x => !$('#filtro-estado')?.value || x.estado === $('#filtro-estado').value));
  $('#filtro-texto').oninput = render;
  if ($('#filtro-estado')) $('#filtro-estado').onchange = render;
  render();
}
function enlazarAccion(atributo, lista, accion) {
  document.querySelectorAll(`[${atributo}]`).forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await accion(lista.find(x => x.id === Number(b.getAttribute(atributo)))); }
    catch (err) { toast(err.message, true); }
    finally { b.disabled = false; }
  });
}
async function gestionarClientes() {
  const lista = await api('GET', '/api/clientes');
  $('#vista').innerHTML = cabecera('Clientes', '<button id="crear-cliente" class="btn btn-primario">+ Nuevo cliente</button>') + filtrosTabla();
  $('#crear-cliente').onclick = () => formularioCliente();
  conectarFiltros(lista, filas => {
    $('#lista-gestion').innerHTML = tabla(['Nombre', 'Correo', 'Teléfono', 'Acciones'], filas.map(c => `<tr><td>${esc(c.nombre)}</td><td>${esc(c.correo)}</td><td>${esc(c.telefono)}</td><td>${botonAccion('Editar', 'data-editar-cliente', c.id)}</td></tr>`), 'No hay clientes para esta búsqueda.');
    enlazarAccion('data-editar-cliente', lista, formularioCliente);
  });
}
function formularioCliente(c = {}) {
  abrirDialogo(c.id ? 'Editar cliente' : 'Nuevo cliente',
    entrada('nombre', 'Nombre completo', c.nombre) + entrada('correo', 'Correo electrónico', c.correo, 'email') + entrada('telefono', 'Teléfono', c.telefono, 'tel'),
    async form => {
      await api(c.id ? 'PATCH' : 'POST', c.id ? `/api/clientes/${c.id}` : '/api/clientes', Object.fromEntries(form));
      cerrarDialogo(); toast(c.id ? 'Cliente actualizado' : 'Cliente creado'); await gestionarClientes();
    });
}
function detalleSolicitud(s) {
  abrirDialogo(`Solicitud SOL-${String(s.id).padStart(4, '0')}`, `<dl>
    <dt>Cliente</dt><dd>${esc(s.cliente?.nombre)}</dd><dt>Correo</dt><dd>${esc(s.cliente?.correo)}</dd>
    <dt>Ruta</dt><dd>${esc(s.destino.origen)} → ${esc(s.destino.destino)}</dd>
    <dt>Fechas</dt><dd>${fmtFecha(s.destino.fechaSalida)} – ${fmtFecha(s.destino.fechaRegreso)}</dd>
    <dt>Servicio</dt><dd>${esc(s.preferencias.tipoServicio)}</dd><dt>Presupuesto</dt><dd>${fmtMoneda(s.preferencias.presupuesto)}</dd>
    <dt>Viajeros</dt><dd>${s.viajeros.map(v => `${esc(v.nombre)} · ${esc(v.documento)} (${esc(v.tipo)})`).join('<br>')}</dd>
    <dt>Notas</dt><dd>${esc(s.preferencias.notas) || 'Sin notas'}</dd></dl>`);
}
async function gestionarSolicitudes() {
  const [lista, cotizaciones] = await Promise.all([api('GET', '/api/solicitudes'), api('GET', '/api/cotizaciones')]);
  $('#vista').innerHTML = cabecera('Solicitudes', '<a class="btn btn-primario" href="#/solicitudes/nueva">+ Nueva solicitud</a>') + filtrosTabla(['Pendiente', 'Reservada']);
  conectarFiltros(lista, filas => {
    $('#lista-gestion').innerHTML = tabla(['Código', 'Cliente', 'Ruta', 'Fechas', 'Estado', 'Acciones'], filas.map(s => {
      const vigente = cotizaciones.some(c => c.solicitudId === s.id && ['Borrador', 'Aceptada'].includes(c.estado));
      return `<tr><td>SOL-${String(s.id).padStart(4, '0')}</td><td>${esc(s.cliente?.nombre)}</td><td>${esc(s.destino.origen)} → ${esc(s.destino.destino)}</td><td>${fmtFecha(s.destino.fechaSalida)} – ${fmtFecha(s.destino.fechaRegreso)}</td><td><span class="badge ${s.estado}">${s.estado}</span></td><td><div class="acciones">
      ${botonAccion('Ver detalle', 'data-detalle-sol', s.id)}
      ${!vigente ? botonAccion('Cotizar', 'data-cotizar', s.id) : '<a class="btn btn-chico btn-soft" href="#/cotizaciones">Ver cotización</a>'}
      ${s.estado === 'Pendiente' ? botonAccion('Crear reserva', 'data-reservar-sol', s.id) : '<a class="btn btn-chico btn-soft" href="#/reservas">Ver reservas</a>'}</div></td></tr>`;
    }), 'No hay solicitudes para esta búsqueda.');
    enlazarAccion('data-detalle-sol', lista, detalleSolicitud);
    enlazarAccion('data-cotizar', lista, s => formularioCotizacion(null, [s], gestionarSolicitudes));
    enlazarAccion('data-reservar-sol', lista, async s => {
      const r = await api('POST', '/api/reservas', { solicitudId: s.id });
      toast(`Reserva ${r.codigo} confirmada`); location.hash = '#/reservas';
    });
  });
}
async function gestionarCotizaciones() {
  const [lista, solicitudes] = await Promise.all([api('GET', '/api/cotizaciones'), api('GET', '/api/solicitudes')]);
  const disponibles = solicitudes.filter(s => !lista.some(c => c.solicitudId === s.id && ['Borrador', 'Aceptada'].includes(c.estado)));
  $('#vista').innerHTML = cabecera('Cotizaciones', '<button id="crear-cotizacion" class="btn btn-primario">+ Nueva cotización</button>') + filtrosTabla(['Borrador', 'Aceptada', 'Rechazada', 'Cancelada']);
  $('#crear-cotizacion').onclick = () => {
    if (!disponibles.length) return toast('Crea una solicitud o revisa sus cotizaciones vigentes.', true);
    formularioCotizacion(null, disponibles, gestionarCotizaciones);
  };
  conectarFiltros(lista, filas => {
    $('#lista-gestion').innerHTML = tabla(['Código', 'Cliente / destino', 'Total', 'Estado', 'Acciones'], filas.map(c => `<tr>
      <td>${esc(c.codigo)}</td><td>${esc(c.solicitud.cliente?.nombre)}<small>${esc(c.solicitud.destino.destino)}</small></td><td>${fmtMoneda(c.total)}</td>
      <td><span class="badge ${c.estado}">${c.estado}</span></td><td><div class="acciones">
      ${botonAccion('Ver detalle', 'data-ver-cot', c.id)}
      ${c.estado === 'Borrador' ? botonAccion('Editar', 'data-editar-cot', c.id) + botonAccion('Aceptar y reservar', 'data-aceptar-cot', c.id) + botonAccion('Rechazar', 'data-rechazar-cot', c.id, true) : ''}</div></td></tr>`), 'No hay cotizaciones para esta búsqueda.');
    enlazarAccion('data-ver-cot', lista, c => abrirDialogo(c.codigo, `<dl><dt>Cliente</dt><dd>${esc(c.solicitud.cliente?.nombre)}</dd><dt>Servicio</dt><dd class="texto-multilinea">${esc(c.descripcion)}</dd><dt>Total</dt><dd>${fmtMoneda(c.total)}</dd><dt>Estado</dt><dd>${c.estado}</dd></dl>`));
    enlazarAccion('data-editar-cot', lista, c => formularioCotizacion(c, [c.solicitud], gestionarCotizaciones));
    enlazarAccion('data-aceptar-cot', lista, c => confirmarCotizacion(c, 'Aceptada'));
    enlazarAccion('data-rechazar-cot', lista, c => confirmarCotizacion(c, 'Rechazada'));
  });
}
function formularioCotizacion(c, solicitudes, recargar) {
  abrirDialogo(c ? `Editar ${c.codigo}` : 'Nueva cotización',
    `<div class="campo"><label for="f-solicitudId">Solicitud *</label><select id="f-solicitudId" name="solicitudId" required ${c ? 'disabled' : ''}>${solicitudes.map(s => `<option value="${s.id}">SOL-${String(s.id).padStart(4, '0')} · ${esc(s.cliente?.nombre)} · ${esc(s.destino.destino)}</option>`).join('')}</select></div>
    <div class="campo"><label for="f-descripcion">Servicios incluidos *</label><textarea id="f-descripcion" name="descripcion" required>${esc(c?.descripcion || '')}</textarea></div>` +
    entrada('total', 'Total (COP)', c?.total || '', 'number', 'min="0.01" max="1000000000000" step="0.01"'),
    async form => {
      await api(c ? 'PATCH' : 'POST', c ? `/api/cotizaciones/${c.id}` : '/api/cotizaciones', Object.fromEntries(form));
      cerrarDialogo(); toast('Cotización guardada'); await recargar();
    });
}
function confirmarCotizacion(c, estado) {
  abrirDialogo(estado === 'Aceptada' ? 'Aceptar cotización y reservar' : 'Rechazar cotización',
    `<p>${esc(c.codigo)} · ${esc(c.solicitud.cliente?.nombre)} · ${fmtMoneda(c.total)}</p>
    <p>${estado === 'Aceptada' ? 'Se confirmará la reserva y se establecerá este total para registrar sus pagos.' : 'La cotización quedará rechazada. Podrás crear una nueva para esta solicitud.'}</p>`,
    async () => {
      await api('POST', `/api/cotizaciones/${c.id}/estado`, { estado });
      cerrarDialogo(); toast(estado === 'Aceptada' ? 'Cotización aceptada y reserva confirmada' : 'Cotización rechazada'); await gestionarCotizaciones();
    }, 'Confirmar');
}
async function gestionarPagos() {
  const [lista, reservas] = await Promise.all([api('GET', '/api/pagos'), api('GET', '/api/reservas')]);
  const disponibles = reservas.filter(r => r.estado !== 'Cancelada' && r.total && r.saldoPendiente > 0);
  $('#vista').innerHTML = cabecera('Pagos', '<button id="registrar-pago" class="btn btn-primario">+ Registrar pago</button>') +
    '<p class="nota">Registro de pagos recibidos. Esta aplicación no efectúa cobros ni devoluciones bancarias.</p>' +
    `<div class="resumen"><div class="dato"><strong>${fmtMoneda(lista.filter(p => p.estado === 'Registrado').reduce((n,p) => n+p.monto,0))}</strong><span>Pagos registrados</span></div><div class="dato"><strong>${fmtMoneda(reservas.filter(r=>r.estado !== 'Cancelada').reduce((n,r) => n+r.saldoPendiente,0))}</strong><span>Saldo por cobrar</span></div></div>` +
    filtrosTabla(['Registrado', 'Anulado']);
  $('#registrar-pago').onclick = () => {
    if (!disponibles.length) return toast('No hay reservas con saldo pendiente. Acepta una cotización para establecer su total.', true);
    formularioPago(disponibles);
  };
  conectarFiltros(lista, filas => {
    $('#lista-gestion').innerHTML = tabla(['Recibo', 'Reserva / cliente', 'Monto', 'Método / referencia', 'Estado', 'Acciones'], filas.map(p => `<tr><td>${p.codigo}<small>${fmtFecha(p.creadaEn)}</small></td><td>${esc(p.reserva.codigo)}<small>${esc(p.reserva.cliente?.nombre)}</small></td><td>${fmtMoneda(p.monto)}</td><td>${esc(p.metodo)}<small>${esc(p.referencia)}</small></td><td><span class="badge ${p.estado}">${p.estado}</span></td><td><div class="acciones">${botonAccion('Ver recibo', 'data-recibo', p.id)}${p.estado === 'Registrado' ? botonAccion('Anular registro', 'data-anular-pago', p.id, true) : ''}</div></td></tr>`), 'No hay pagos para esta búsqueda.');
    enlazarAccion('data-recibo', lista, p => abrirDialogo(p.codigo, `<dl><dt>Reserva</dt><dd>${esc(p.reserva.codigo)}</dd><dt>Cliente</dt><dd>${esc(p.reserva.cliente?.nombre)}</dd><dt>Monto</dt><dd>${fmtMoneda(p.monto)}</dd><dt>Método</dt><dd>${esc(p.metodo)}</dd><dt>Referencia</dt><dd>${esc(p.referencia)}</dd><dt>Estado</dt><dd>${p.estado}</dd></dl>`));
    enlazarAccion('data-anular-pago', lista, p => abrirDialogo('Anular registro de pago', `<p>Se anulará ${p.codigo} por ${fmtMoneda(p.monto)} y se recalculará el saldo de la reserva. Esta acción no devuelve dinero.</p>`, async () => {
      await api('POST', `/api/pagos/${p.id}/anular`); cerrarDialogo(); toast('Registro anulado'); await gestionarPagos();
    }, 'Anular registro'));
  });
}
function formularioPago(reservas) {
  abrirDialogo('Registrar pago recibido', `<div class="campo"><label for="f-reservaId">Reserva *</label><select id="f-reservaId" name="reservaId" required>${reservas.map(r => `<option value="${r.id}">${esc(r.codigo)} · ${esc(r.cliente?.nombre)} · Saldo: ${fmtMoneda(r.saldoPendiente)}</option>`).join('')}</select></div>` +
    entrada('monto', 'Monto recibido (COP)', '', 'number', 'min="0.01" step="0.01"') +
    `<div class="campo"><label for="f-metodo">Método *</label><select id="f-metodo" name="metodo"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select></div>` +
    entrada('referencia', 'Referencia o número de recibo'),
    async form => { await api('POST', '/api/pagos', Object.fromEntries(form)); cerrarDialogo(); toast('Pago registrado'); await gestionarPagos(); }, 'Registrar pago');
  const actualizar = () => {
    const r = reservas.find(r => r.id === Number($('#f-reservaId').value));
    $('#f-monto').max = r.saldoPendiente; $('#f-monto').value = r.saldoPendiente;
  };
  $('#f-reservaId').onchange = actualizar; actualizar();
}
function descargarCsv(nombre, filas) {
  const texto = '\uFEFF' + filas.map(f => f.map(x => {
    let valor = String(x ?? '');
    if (/^[\s]*[=+@-]/.test(valor)) valor = "'" + valor;
    return '"' + valor.replace(/"/g, '""') + '"';
  }).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], {type: 'text/csv;charset=utf-8;'}));
  const a = document.createElement('a'); a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function gestionarReportes() {
  const [reservas, pagos] = await Promise.all([api('GET', '/api/reservas'), api('GET', '/api/pagos')]);
  $('#vista').innerHTML = cabecera('Reportes', '<button id="exportar" class="btn btn-primario">Descargar CSV</button>') +
    '<p class="nota">Filtra las reservas por fecha de salida. Los pagos corresponden a esas reservas.</p>' +
    '<form id="filtros-reporte" class="filtros"><div class="campo"><label for="desde">Salida desde</label><input id="desde" type="date"></div><div class="campo"><label for="hasta">Salida hasta</label><input id="hasta" type="date"></div><button class="btn btn-soft" type="submit">Aplicar</button><button id="limpiar-reporte" class="btn btn-borde" type="button">Limpiar</button></form><div id="error-reporte" class="error" role="alert"></div><div id="resultado-reporte"></div>';
  let visibles = reservas;
  const render = () => {
    const desde = $('#desde').value, hasta = $('#hasta').value;
    if (desde && hasta && hasta < desde) { $('#error-reporte').textContent = 'La fecha final debe ser igual o posterior a la inicial.'; return; }
    $('#error-reporte').textContent = '';
    visibles = reservas.filter(r => (!desde || r.fechaSalida >= desde) && (!hasta || r.fechaSalida <= hasta));
    const activas = visibles.filter(r => r.estado !== 'Cancelada');
    const ids = new Set(visibles.map(r=>r.id));
    const cobrados = pagos.filter(p=>ids.has(p.reservaId) && p.estado === 'Registrado').reduce((n,p)=>n+p.monto,0);
    $('#resultado-reporte').innerHTML = `<div class="resumen"><div class="dato"><strong>${activas.length}</strong><span>Reservas activas</span></div><div class="dato"><strong>${fmtMoneda(cobrados)}</strong><span>Pagos registrados</span></div><div class="dato"><strong>${fmtMoneda(activas.reduce((n,r)=>n+r.saldoPendiente,0))}</strong><span>Saldo pendiente</span></div></div><div class="tabla-wrap">${tabla(['Reserva', 'Cliente', 'Destino', 'Salida', 'Estado', 'Total', 'Pagado', 'Saldo'], visibles.map(r=>`<tr><td>${r.codigo}</td><td>${esc(r.cliente?.nombre)}</td><td>${esc(r.destino)}</td><td>${fmtFecha(r.fechaSalida)}</td><td>${r.estado}</td><td>${r.total ? fmtMoneda(r.total) : 'Sin cotización'}</td><td>${fmtMoneda(r.totalPagado)}</td><td>${r.total ? fmtMoneda(r.saldoPendiente) : '—'}</td></tr>`), 'No hay reservas en este periodo.')}</div>`;
  };
  $('#filtros-reporte').onsubmit = e => { e.preventDefault(); render(); };
  $('#limpiar-reporte').onclick = () => { $('#filtros-reporte').reset(); render(); };
  $('#exportar').onclick = () => descargarCsv('reporte-reservas.csv', [['Reserva','Cliente','Destino','Salida','Regreso','Estado','Total COP','Pagado COP','Saldo COP'], ...visibles.map(r=>[r.codigo,r.cliente?.nombre,r.destino,r.fechaSalida,r.fechaRegreso,r.estado,r.total ?? '',r.totalPagado,r.total ? r.saldoPendiente : ''])]);
  render();
}
