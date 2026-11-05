function resumenPerfil(s) {
  const d=s.destino,p=s.preferencias;
  return `<dl class="resumen-perfil"><dt>Cliente</dt><dd>${esc(s.cliente?.nombre)}</dd>
    <dt>Ruta</dt><dd>${esc(d.origen)} → ${esc(d.destino)}</dd>
    <dt>Fechas</dt><dd>${fmtFecha(d.fechaSalida)} — ${fmtFecha(d.fechaRegreso)}</dd>
    <dt>Viajeros</dt><dd>${s.viajeros.map(v=>`${esc(v.nombre)} · ${esc(v.documento)} (${esc(v.tipo)})`).join('<br>')}</dd>
    <dt>Servicio</dt><dd>${esc(p.tipoServicio)}</dd><dt>Presupuesto del grupo</dt><dd>${fmtMoneda(p.presupuesto)}</dd>
    <dt>Intereses</dt><dd>${(p.intereses||[]).map(esc).join(', ')||'Sin preferencias'}</dd>
    <dt>Notas</dt><dd class="texto-multilinea">${esc(p.notas)||'Sin notas'}</dd></dl>`;
}
function editarPerfil(s) {
  reiniciarWizard();
  Object.assign(wz,{id:s.id,paso:2,cliente:{...s.cliente},viajeros:s.viajeros.map(v=>({...v})),destino:{...s.destino},preferencias:{...s.preferencias,intereses:[...(s.preferencias.intereses||[])]}});
  renderWizard();
}
async function iniciarReserva(s,c=null,seleccion=[]) {
  const oferta=await api('GET',`/api/disponibilidad?solicitudId=${s.id}${c?'&cotizacionId='+c.id:''}`);
  abrirDialogo('Disponibilidad y selección',`<p class="nota">${esc(oferta.aviso)}</p>
    <h4>${esc(oferta.nombre)}</h4><p>${esc(oferta.origen)} → ${esc(oferta.destino)} · ${fmtFecha(oferta.fechaSalida)} — ${fmtFecha(oferta.fechaRegreso)}</p>
    <p>${esc(oferta.detalle)}</p><p><strong>${oferta.disponibles} cupos libres de ${oferta.capacidad}</strong> · ${oferta.solicitados} viajeros</p>
    <p>${c?'Precio cotizado: '+fmtMoneda(c.total):'Total pendiente de cotización. El presupuesto del perfil no fija el precio.'}</p>
    ${oferta.tieneAsientos?`<h4>Un asiento por viajero</h4><div class="mapa-asientos" aria-label="Mapa de asientos">${oferta.asientos.map(a=>`<span class="asiento ${a.disponible?'libre':'ocupado'}">${esc(a.codigo)}${a.disponible?'':' ×'}</span>`).join('')}</div><p>Los asientos con × están ocupados.</p>
    ${s.viajeros.map((v,i)=>`<div class="campo"><label for="asiento-${i}">${esc(v.nombre)} · Asiento *</label><select id="asiento-${i}" name="asiento-${i}" required><option value="">Seleccionar asiento</option>${oferta.asientos.map(a=>`<option value="${a.codigo}" ${!a.disponible?'disabled':''} ${seleccion[i]===a.codigo?'selected':''}>${a.codigo}${a.disponible?'':' (ocupado)'}</option>`).join('')}</select></div>`).join('')}`:'<p>Este servicio no incluye transporte ni selección de asiento.</p>'}
    <details open class="politicas"><summary>${esc(oferta.politicas.titulo)}</summary><ol>${oferta.politicas.condiciones.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>
    ${oferta.puedeReservar?'<label class="aceptacion"><input name="politicas" type="checkbox" required> He leído y acepto estas políticas para registrar la reserva académica.</label>':'<p class="error" role="alert">No hay una oferta con cupos suficientes. Edita el perfil para cambiar destino, servicio o fechas.</p>'}`,
    oferta.puedeReservar?async form=>{
      const datos={solicitudId:s.id,cotizacionId:c?.id,asientos:oferta.tieneAsientos?s.viajeros.map((_,i)=>form.get('asiento-'+i)):[],politicasAceptadas:form.get('politicas')==='on'};
      const previa=await api('POST','/api/reservas/vista-previa',datos);
      mostrarVistaPreviaReserva(s,c,datos,previa);
    }:null,'Ver vista previa');
}
function mostrarVistaPreviaReserva(s,c,datos,previa) {
  abrirDialogo('Vista previa de la reserva',`${resumenPerfil(previa)}
    <dl><dt>Oferta</dt><dd>${esc(previa.oferta.nombre)}</dd><dt>Asientos</dt><dd>${previa.asientos.map(esc).join(', ')||'No aplica'}</dd>
    <dt>Servicios cotizados</dt><dd class="texto-multilinea">${esc(previa.descripcion)}</dd><dt>Total acordado</dt><dd>${previa.total?fmtMoneda(previa.total):'Pendiente de cotización'}</dd>
    <dt>Políticas aceptadas</dt><dd>${esc(previa.politicasVersion)}</dd></dl>
    <p>Comprueba los datos antes de guardar. Los cupos se verifican de nuevo al confirmar. Esta vista vence en 10 minutos.</p>
    <button class="btn btn-borde" type="button" id="editar-seleccion">← Editar selección</button>`,async()=>{
      const cuerpo={...datos,vistaPreviaToken:previa.vistaPreviaToken};
      const resultado=c?await api('POST',`/api/cotizaciones/${c.id}/estado`,{...cuerpo,estado:'Aceptada'}):await api('POST','/api/reservas',cuerpo);
      cerrarDialogo();toast(c?'Cotización aceptada y reserva confirmada':`Reserva ${resultado.codigo} confirmada`);
      if(location.hash==='#/reservas')await vistaReservas();else location.hash='#/reservas';
    },c?'Aceptar y confirmar reserva':'Confirmar y guardar reserva');
  $('#editar-seleccion').onclick=async()=>{try{await iniciarReserva(s,c,datos.asientos);}catch(e){$('#form-error').textContent=e.message;}};
}
