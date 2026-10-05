const PASOS = ['Cliente', 'Viajeros', 'Destino', 'Preferencias'];

const ICONO_BUSCAR = '<svg viewBox="0 0 24 24"><circle cx="14" cy="10" r="6.5"/><path d="M9.5 14.5 3 21"/></svg>';

let wz = null;

function reiniciarWizard() {
  wz = {
    paso: 1,
    cliente: { id: null, nombre: '', correo: '', telefono: '' },
    viajeros: [{ nombre: '', documento: '', tipo: 'Adulto' }],
    destino: { origen: '', destino: '', fechaSalida: '', fechaRegreso: '' },
    preferencias: { tipoServicio: 'Paquete', presupuesto: '', notas: '' },
    error: ''
  };
}

function renderStepper() {
  return PASOS.map((nombre, i) => {
    const n = i + 1;
    const clase = n < wz.paso ? 'hecho' : n === wz.paso ? 'actual' : '';
    return `${i ? '<div class="conector"></div>' : ''}
      <div class="paso ${clase}"><div class="circulo">${n}</div><span>${nombre}</span></div>`;
  }).join('');
}

function campo(id, etiqueta, valor, { placeholder = '', tipo = 'text', requerido = true, readonly = false } = {}) {
  return `<div class="campo">
    <label for="${id}">${etiqueta}${requerido ? ' <b>*</b>' : ''}</label>
    <input id="${id}" type="${tipo}" value="${esc(valor)}" placeholder="${esc(placeholder)}" ${readonly ? 'readonly' : ''}>
  </div>`;
}

function vistaPaso() {
  if (wz.paso === 1) {
    const ro = Boolean(wz.cliente.id);
    return `<section class="tarjeta">
      <h2>Información del cliente</h2>
      <div class="fila-buscar">
        <div class="buscador">${ICONO_BUSCAR}
          <input id="buscar" type="search" placeholder="Buscar cliente existente..." autocomplete="off">
          <ul id="resultados" class="resultados" hidden></ul>
        </div>
        <button class="btn btn-soft" id="nuevo" type="button">+ &nbsp;Nuevo cliente</button>
      </div>
      <div class="rejilla-3">
        ${campo('c-nombre', 'Nombre Completo', wz.cliente.nombre, { placeholder: 'Ej. Johan Murillo', readonly: ro })}
        ${campo('c-correo', 'Correo electronico', wz.cliente.correo, { placeholder: 'ejemplo@correo.com', tipo: 'email', readonly: ro })}
        ${campo('c-telefono', 'Telefono', wz.cliente.telefono, { placeholder: '+57 300 123 4567', tipo: 'tel', readonly: ro })}
      </div>
    </section>`;
  }
  if (wz.paso === 2) {
    const filas = wz.viajeros.map((p, i) => `
      <div class="fila-viajero">
        ${campo(`v-nombre-${i}`, 'Nombre Completo', p.nombre, { placeholder: 'Ej. Ana Murillo' })}
        ${campo(`v-doc-${i}`, 'Documento', p.documento, { placeholder: 'Cédula o pasaporte' })}
        <div class="campo"><label for="v-tipo-${i}">Tipo <b>*</b></label>
          <select id="v-tipo-${i}">
            <option ${p.tipo === 'Adulto' ? 'selected' : ''}>Adulto</option>
            <option ${p.tipo === 'Niño' ? 'selected' : ''}>Niño</option>
          </select></div>
        <button class="btn btn-chico btn-peligro" type="button" data-quitar="${i}" ${wz.viajeros.length === 1 ? 'disabled' : ''}>Quitar</button>
      </div>`).join('');
    return `<section class="tarjeta"><h2>Información de los viajeros</h2>${filas}
      <button class="btn btn-soft" id="agregar" type="button">+ &nbsp;Agregar viajero</button></section>`;
  }
  if (wz.paso === 3) {
    const d = wz.destino;
    return `<section class="tarjeta"><h2>Información del destino</h2>
      <div class="rejilla-2" style="margin-bottom:24px">
        ${campo('d-origen', 'Origen', d.origen, { placeholder: 'Ej. Medellín' })}
        ${campo('d-destino', 'Destino', d.destino, { placeholder: 'Ej. Cartagena' })}
      </div>
      <div class="rejilla-2">
        ${campo('d-salida', 'Fecha de salida', d.fechaSalida, { tipo: 'date' })}
        ${campo('d-regreso', 'Fecha de regreso', d.fechaRegreso, { tipo: 'date' })}
      </div></section>`;
  }
  const p = wz.preferencias;
  return `<section class="tarjeta"><h2>Preferencias del viaje</h2>
    <div class="rejilla-2" style="margin-bottom:24px">
      <div class="campo"><label for="p-tipo">Tipo de servicio</label>
        <select id="p-tipo">
          ${['Paquete', 'Vuelo', 'Hotel'].map(t => `<option ${p.tipoServicio === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></div>
      ${campo('p-presupuesto', 'Presupuesto (COP)', p.presupuesto, { placeholder: 'Ej. 3000000', tipo: 'number', requerido: false })}
    </div>
    <div class="campo"><label for="p-notas">Notas</label>
      <textarea id="p-notas" placeholder="Preferencias adicionales">${esc(p.notas)}</textarea></div></section>`;
}

function leerPaso() {
  const val = id => ($(id) ? $(id).value.trim() : '');
  if (wz.paso === 1 && !wz.cliente.id) {
    wz.cliente.nombre = val('#c-nombre');
    wz.cliente.correo = val('#c-correo');
    wz.cliente.telefono = val('#c-telefono');
  }
  if (wz.paso === 2) {
    wz.viajeros = wz.viajeros.map((_, i) => ({
      nombre: val(`#v-nombre-${i}`), documento: val(`#v-doc-${i}`), tipo: $(`#v-tipo-${i}`).value
    }));
  }
  if (wz.paso === 3) {
    wz.destino = { origen: val('#d-origen'), destino: val('#d-destino'), fechaSalida: val('#d-salida'), fechaRegreso: val('#d-regreso') };
  }
  if (wz.paso === 4) {
    wz.preferencias = { tipoServicio: val('#p-tipo'), presupuesto: val('#p-presupuesto'), notas: val('#p-notas') };
  }
}

function validarPaso() {
  const c = wz.cliente, d = wz.destino;
  if (wz.paso === 1) {
    if (!c.nombre || !c.correo || !c.telefono) return 'Completa nombre, correo y teléfono del cliente.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.correo)) return 'El correo electrónico no es válido.';
  }
  if (wz.paso === 2 && wz.viajeros.some(p => !p.nombre || !p.documento)) return 'Completa nombre y documento de cada viajero.';
  if (wz.paso === 3) {
    if (!d.origen || !d.destino || !d.fechaSalida || !d.fechaRegreso) return 'Completa origen, destino y fechas.';
    if (d.fechaRegreso < d.fechaSalida) return 'La fecha de regreso no puede ser anterior a la de salida.';
  }
  return '';
}

async function enviarSolicitud() {
  const cliente = wz.cliente.id ? { id: wz.cliente.id } : wz.cliente;
  await api('POST', '/api/solicitudes', {
    cliente, viajeros: wz.viajeros, destino: wz.destino, preferencias: wz.preferencias
  });
  toast('Solicitud creada');
  location.hash = '#/solicitudes';
}

function enlazarBuscador() {
  const input = $('#buscar'), lista = $('#resultados');
  let temporizador;
  input.addEventListener('input', () => {
    clearTimeout(temporizador);
    const q = input.value.trim();
    if (!q) { lista.hidden = true; return; }
    temporizador = setTimeout(async () => {
      const clientes = await api('GET', `/api/clientes?q=${encodeURIComponent(q)}`);
      lista.innerHTML = clientes.length
        ? clientes.map(c => `<li data-id="${c.id}">${esc(c.nombre)}<small>${esc(c.correo)} · ${esc(c.telefono)}</small></li>`).join('')
        : '<li>Sin resultados</li>';
      lista.hidden = false;
      lista.onclick = e => {
        const li = e.target.closest('li[data-id]');
        if (!li) return;
        wz.cliente = { ...clientes.find(c => c.id === Number(li.dataset.id)) };
        renderWizard();
      };
    }, 200);
  });
  $('#nuevo').addEventListener('click', () => {
    wz.cliente = { id: null, nombre: '', correo: '', telefono: '' };
    renderWizard();
    $('#c-nombre').focus();
  });
}

function renderWizard() {
  const ultimo = wz.paso === PASOS.length;
  $('#vista').innerHTML = `
    <header class="encabezado">
      <div class="titulo">
        <button class="volver" id="volver" type="button" aria-label="Volver">←</button>
        <h1>Nueva solicitud de viaje</h1>
      </div>
      <div class="stepper">${renderStepper()}</div>
    </header>
    ${vistaPaso()}
    <div class="error" id="error" role="alert">${esc(wz.error)}</div>
    <div class="pie">
      ${wz.paso > 1 ? '<button class="btn btn-borde" id="anterior" type="button">Anterior</button>' : ''}
      <button class="btn btn-borde" id="cancelar" type="button">Cancelar</button>
      <button class="btn" id="siguiente" type="button">${ultimo ? 'Crear solicitud' : 'Siguiente'}</button>
    </div>`;

  const salir = () => { location.hash = '#/solicitudes'; };
  $('#volver').onclick = salir;
  $('#cancelar').onclick = salir;
  if ($('#anterior')) $('#anterior').onclick = () => { leerPaso(); wz.error = ''; wz.paso--; renderWizard(); };

  if (wz.paso === 1) enlazarBuscador();
  if (wz.paso === 2) {
    $('#agregar').onclick = () => { leerPaso(); wz.viajeros.push({ nombre: '', documento: '', tipo: 'Adulto' }); renderWizard(); };
    document.querySelectorAll('[data-quitar]').forEach(b => {
      b.onclick = () => { leerPaso(); wz.viajeros.splice(Number(b.dataset.quitar), 1); renderWizard(); };
    });
  }

  $('#siguiente').onclick = async () => {
    leerPaso();
    wz.error = validarPaso();
    if (wz.error) return renderWizard();
    if (!ultimo) { wz.paso++; return renderWizard(); }
    try {
      await enviarSolicitud();
    } catch (e) {
      wz.error = e.message;
      renderWizard();
    }
  };
}

function vistaNuevaSolicitud() {
  reiniciarWizard();
  renderWizard();
}
