async function vistaSolicitudes() {
  const lista = await api('GET', '/api/solicitudes');
  const filas = lista.map(s => `
    <tr>
      <td>SOL-${String(s.id).padStart(4, '0')}</td>
      <td>${esc(s.cliente ? s.cliente.nombre : '')}<small>${esc(s.cliente ? s.cliente.correo : '')}</small></td>
      <td>${esc(s.destino.origen)} → ${esc(s.destino.destino)}</td>
      <td>${fmtFecha(s.destino.fechaSalida)} – ${fmtFecha(s.destino.fechaRegreso)}</td>
      <td>${s.viajeros.length}</td>
      <td><span class="badge ${s.estado}">${s.estado}</span></td>
      <td>${s.estado === 'Pendiente'
        ? `<button class="btn btn-chico btn-soft" data-reservar="${s.id}">Crear reserva</button>` : ''}</td>
    </tr>`).join('');

  $('#vista').innerHTML = `
    <header class="encabezado">
      <div class="titulo"><h1>Solicitudes</h1></div>
      <a class="btn btn-primario" href="#/solicitudes/nueva" style="text-decoration:none">+ Nueva solicitud</a>
    </header>
    <div class="tabla-wrap">${lista.length ? `
      <table>
        <thead><tr><th>Código</th><th>Cliente</th><th>Ruta</th><th>Fechas</th><th>Viajeros</th><th>Estado</th><th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table>` : '<div class="vacio">Aún no hay solicitudes. Crea la primera con “Nueva solicitud”.</div>'}
    </div>`;

  document.querySelectorAll('[data-reservar]').forEach(b => {
    b.onclick = async () => {
      try {
        const r = await api('POST', '/api/reservas', { solicitudId: Number(b.dataset.reservar) });
        toast(`Reserva ${r.codigo} confirmada`);
        location.hash = '#/reservas';
      } catch (e) {
        toast(e.message, true);
      }
    };
  });
}
