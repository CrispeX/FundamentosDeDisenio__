function cerrarDialogo() { $('#dialogo').close(); }
function detalleReserva(r) {
  abrirDialogo(`Reserva ${r.codigo}`, `<dl>
    <dt>Estado</dt><dd><span class="badge ${r.estado}">${r.estado}</span></dd>
    <dt>Cliente</dt><dd>${esc(r.cliente?.nombre)}</dd>
    <dt>Ruta</dt><dd>${esc(r.origen)} → ${esc(r.destino)}</dd>
    <dt>Salida</dt><dd>${fmtFecha(r.fechaSalida)}</dd>
    <dt>Regreso</dt><dd>${fmtFecha(r.fechaRegreso)}</dd>
    <dt>Viajeros</dt><dd>${r.viajeros.map(p=>`${esc(p.nombre)} (${esc(p.tipo)})`).join(', ')}</dd>
    <dt>Servicio</dt><dd>${esc(r.preferencias.tipoServicio)}</dd>
    <dt>Asientos</dt><dd>${(r.asientos||[]).map(esc).join(', ')||'No aplica / reserva anterior'}</dd>
    <dt>Políticas</dt><dd>${esc(r.politicas?.version)||'Reserva anterior sin aceptación registrada'}${r.politicas?.aceptadasEn?' · '+fmtFecha(r.politicas.aceptadasEn):''}</dd>
    <dt>Estado del pago</dt><dd>${esc(r.estadoPago)}</dd>
    <dt>Presupuesto</dt><dd>${fmtMoneda(r.preferencias.presupuesto)}</dd>
    <dt>Total acordado</dt><dd>${r.total ? fmtMoneda(r.total) : 'Pendiente de cotización'}</dd>
    <dt>Pagado</dt><dd>${fmtMoneda(r.totalPagado)}</dd>
    <dt>Saldo</dt><dd>${r.total ? fmtMoneda(r.saldoPendiente) : '—'}</dd></dl>`);
}
function modificarReserva(r) {
  abrirDialogo(`Modificar fechas · ${r.codigo}`,
    entrada('fechaSalida','Fecha de salida',r.fechaSalida,'date') + entrada('fechaRegreso','Fecha de regreso',r.fechaRegreso,'date') +
    '<p>Se comprobarán los cupos y los asientos en la nueva salida. Puedes indicar otros asientos, en el orden de los viajeros y separados por comas.</p>' +
    (r.preferencias.tipoServicio!=='Hotel'?entrada('asientos','Asientos por viajero (ej. 1A, 1B)',(r.asientos||[]).join(', ')) : ''),
    async form => {
      const datos=Object.fromEntries(form);
      datos.asientos=r.preferencias.tipoServicio==='Hotel'?[]:String(datos.asientos||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
      await api('PATCH',`/api/reservas/${r.id}`,datos);
      cerrarDialogo(); toast('Fechas actualizadas'); await vistaReservas();
    },'Guardar cambios');
}
function cancelarReserva(r) {
  abrirDialogo(`Cancelar reserva ${r.codigo}`,
    `<p>La reserva de ${esc(r.cliente?.nombre)} a ${esc(r.destino)} quedará cancelada y la solicitud volverá a estado pendiente.</p>
    ${r.totalPagado > 0 ? '<p class="error">Primero debes anular sus registros de pago en el módulo Pagos.</p>' : ''}`,
    async () => {
      await api('POST',`/api/reservas/${r.id}/cancelar`);
      cerrarDialogo(); toast('Reserva cancelada'); await vistaReservas();
    },'Cancelar reserva');
}
async function vistaReservas() {
  const lista=await api('GET','/api/reservas');
  $('#vista').innerHTML = cabecera('Reservas') + filtrosTabla(['Confirmada','Cancelada']);
  conectarFiltros(lista, filas => {
    $('#lista-gestion').innerHTML = tabla(['Código','Cliente','Ruta','Fechas','Estado','Total / saldo','Acciones'],filas.map(r=>`<tr>
    <td>${esc(r.codigo)}</td><td>${esc(r.cliente?.nombre)}<small>${esc(r.cliente?.correo)}</small></td>
    <td>${esc(r.origen)} → ${esc(r.destino)}</td><td>${fmtFecha(r.fechaSalida)} – ${fmtFecha(r.fechaRegreso)}</td>
    <td><span class="badge ${r.estado}">${r.estado}</span></td>
    <td>${r.total ? fmtMoneda(r.total) + '<small>Saldo: ' + fmtMoneda(r.saldoPendiente) + '</small>' : 'Sin cotización'}</td>
    <td><div class="acciones">${botonAccion('Ver detalle','data-ver',r.id)}
    ${r.estado !== 'Cancelada' ? botonAccion('Modificar fechas','data-mod',r.id) + botonAccion('Cancelar','data-can',r.id,true) + (r.total ? '<a class="btn btn-chico btn-soft" href="#/pagos">Ver pagos</a>' : '<a class="btn btn-chico btn-soft" href="#/cotizaciones">Cotizar</a>') : ''}</div></td></tr>`),'No hay reservas para esta búsqueda.');
    enlazarAccion('data-ver',lista,detalleReserva);
    enlazarAccion('data-mod',lista,modificarReserva);
    enlazarAccion('data-can',lista,cancelarReserva);
  });
}
