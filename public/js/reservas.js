function cerrarDialogo() {
  $('#dialogo').close();
}

function detalleReserva(r) {
  const viajeros = r.viajeros.map(p => `${esc(p.nombre)} (${p.tipo})`).join(', ');
  $('#dialogo').innerHTML = `
    <h3>Reserva ${esc(r.codigo)}</h3>
    <dl>
      <dt>Estado</dt><dd><span class="badge ${r.estado}">${r.estado}</span></dd>
      <dt>Cliente</dt><dd>${esc(r.cliente ? r.cliente.nombre : '')}</dd>
      <dt>Ruta</dt><dd>${esc(r.origen)} → ${esc(r.destino)}</dd>
      <dt>Salida</dt><dd>${fmtFecha(r.fechaSalida)}</dd>
      <dt>Regreso</dt><dd>${fmtFecha(r.fechaRegreso)}</dd>
      <dt>Viajeros</dt><dd>${viajeros}</dd>
      <dt>Servicio</dt><dd>${esc(r.preferencias.tipoServicio || '')}</dd>
      <dt>Presupuesto</dt><dd>${fmtMoneda(r.preferencias.presupuesto)}</dd>
    </dl>
    <div class="dialogo-pie"><button class="btn btn-borde" id="cerrar">Cerrar</button></div>`;
  $('#cerrar').onclick = cerrarDialogo;
  $('#dialogo').showModal();
}

function modificarReserva(r) {
  $('#dialogo').innerHTML = `
    <h3>Modificar fechas · ${esc(r.codigo)}</h3>
    <div class="rejilla-2">
      <div class="campo"><label for="m-salida">Fecha de salida</label><input id="m-salida" type="date" value="${r.fechaSalida}"></div>
      <div class="campo"><label for="m-regreso">Fecha de regreso</label><input id="m-regreso" type="date" value="${r.fechaRegreso}"></div>
    </div>
    <div class="error" id="m-error" role="alert"></div>
    <div class="dialogo-pie">
      <button class="btn btn-borde" id="m-cancelar">Cancelar</button>
      <button class="btn btn-primario" id="m-guardar">Guardar cambios</button>
    </div>`;
  $('#m-cancelar').onclick = cerrarDialogo;
  $('#m-guardar').onclick = async () => {
    try {
      await api('PATCH', `/api/reservas/${r.id}`, { fechaSalida: $('#m-salida').value, fechaRegreso: $('#m-regreso').value });
      cerrarDialogo();
      toast('Fechas actualizadas');
      vistaReservas();
    } catch (e) {
      $('#m-error').textContent = e.message;
    }
  };
  $('#dialogo').showModal();
}

function cancelarReserva(r) {
  $('#dialogo').innerHTML = `
    <h3>Cancelar reserva ${esc(r.codigo)}</h3>
    <p>La reserva de ${esc(r.cliente ? r.cliente.nombre : '')} a ${esc(r.destino)} quedará cancelada y la solicitud volverá a estado pendiente.</p>
    <div class="dialogo-pie">
      <button class="btn btn-borde" id="k-volver">Volver</button>
      <button class="btn btn-peligro" id="k-confirmar">Cancelar reserva</button>
    </div>`;
  $('#k-volver').onclick = cerrarDialogo;
  $('#k-confirmar').onclick = async () => {
    try {
      await api('POST', `/api/reservas/${r.id}/cancelar`);
      cerrarDialogo();
      toast('Reserva cancelada');
      vistaReservas();
    } catch (e) {
      cerrarDialogo();
      toast(e.message, true);
    }
  };
  $('#dialogo').showModal();
}

async function vistaReservas() {
  const lista = await api('GET', '/api/reservas');
  const filas = lista.map(r => `
    <tr>
      <td>${esc(r.codigo)}</td>
      <td>${esc(r.cliente ? r.cliente.nombre : '')}<small>${esc(r.cliente ? r.cliente.correo : '')}</small></td>
      <td>${esc(r.origen)} → ${esc(r.destino)}</td>
      <td>${fmtFecha(r.fechaSalida)} – ${fmtFecha(r.fechaRegreso)}</td>
      <td><span class="badge ${r.estado}">${r.estado}</span></td>
      <td class="acciones">
        <button class="btn btn-chico btn-soft" data-ver="${r.id}">Ver detalle</button>
        ${r.estado !== 'Cancelada' ? `
          <button class="btn btn-chico btn-soft" data-mod="${r.id}">Modificar fechas</button>
          <button class="btn btn-chico btn-peligro" data-can="${r.id}">Cancelar</button>` : ''}
      </td>
    </tr>`).join('');

  $('#vista').innerHTML = `
    <header class="encabezado"><div class="titulo"><h1>Reservas</h1></div></header>
    <div class="tabla-wrap">${lista.length ? `
      <table>
        <thead><tr><th>Código</th><th>Cliente</th><th>Ruta</th><th>Fechas</th><th>Estado</th><th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table>` : '<div class="vacio">Aún no hay reservas. Crea una desde una solicitud pendiente.</div>'}
    </div>`;

  const buscar = id => lista.find(r => r.id === Number(id));
  document.querySelectorAll('[data-ver]').forEach(b => (b.onclick = () => detalleReserva(buscar(b.dataset.ver))));
  document.querySelectorAll('[data-mod]').forEach(b => (b.onclick = () => modificarReserva(buscar(b.dataset.mod))));
  document.querySelectorAll('[data-can]').forEach(b => (b.onclick = () => cancelarReserva(buscar(b.dataset.can))));
}
