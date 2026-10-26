let recomendacionTemporizador, recomendacionControlador;
function detenerRecomendaciones() {
  clearTimeout(recomendacionTemporizador);
  if (recomendacionControlador) recomendacionControlador.abort();
  recomendacionControlador = null;
}
function datosParaRecomendar() {
  return {
    destino:{...wz.destino},
    viajeros:wz.viajeros.map(v=>({tipo:v.tipo})),
    preferencias:{tipoServicio:wz.preferencias.tipoServicio,presupuesto:wz.preferencias.presupuesto,intereses:wz.preferencias.intereses || [],notas:wz.preferencias.notas}
  };
}
function pintarRecomendaciones() {
  const panel=$('#recomendaciones');
  if (!panel || !wz || wz.paso !== 4) return;
  const r=wz.recomendaciones;
  $('#destino-elegido').textContent=wz.destino.destino ? 'Destino elegido: ' + wz.destino.destino : 'Aún no elegiste destino. Puedes escoger una sugerencia o volver al paso Destino.';
  $('#actualizar-recomendaciones').disabled=Boolean(r.cargando);
  $('#recomendaciones-estado').textContent = r.cargando ? 'Buscando opciones para tu viaje…' : r.error || (r.datos ? (r.datos.modo === 'ia' ? 'Recomendaciones con IA' : 'Sugerencias del catálogo') : 'Las sugerencias aparecerán aquí.');
  panel.setAttribute('aria-busy',String(Boolean(r.cargando)));
  panel.innerHTML = r.cargando ? '' : (r.datos?.recomendaciones || []).map(s=>{
    const elegida=wz.destino.destino === s.destino;
    return `<article class="recomendacion ${elegida ? 'seleccionada' : ''}">
      <span class="recomendacion-pais">${esc(s.pais)}</span><h3>${esc(s.destino)}</h3>
      <p>${esc(s.motivo)}</p><ul>${s.actividades.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>
      <p class="recomendacion-consejo">${esc(s.consejo)}</p>
      <button type="button" class="btn btn-chico ${elegida ? 'btn-borde' : 'btn-primario'}" data-elegir-destino="${esc(s.id)}" ${elegida ? 'disabled' : ''}>${elegida ? 'Destino elegido' : 'Elegir este destino'}</button></article>`;
  }).join('');
  $('#recomendaciones-aviso').textContent = r.cargando ? '' : r.datos?.aviso || '';
  panel.querySelectorAll('[data-elegir-destino]').forEach(b=>b.onclick=()=>{
    leerPaso();
    const s=r.datos.recomendaciones.find(s=>s.id===b.dataset.elegirDestino);
    if(!s)return;
    wz.destino.destino=s.destino;
    wz.error=''; $('#error').textContent='';
    pintarRecomendaciones(); toast('Destino actualizado: ' + s.destino);
  });
}
function programarRecomendaciones(inmediato=false) {
  detenerRecomendaciones();
  leerPaso();
  const presupuesto=wz.preferencias.presupuesto;
  if(presupuesto !== '' && (!Number.isFinite(Number(presupuesto)) || Number(presupuesto)<=0 || Number(presupuesto)>1e12)) {
    wz.recomendaciones={cargando:false,datos:null,error:'Ingresa un presupuesto válido para ver sugerencias.'};
    pintarRecomendaciones(); return;
  }
  const datos=datosParaRecomendar(), clave=JSON.stringify(datos), estado=wz;
  if(estado.recomendaciones.clave===clave && estado.recomendaciones.datos && !estado.recomendaciones.cargando) { pintarRecomendaciones(); return; }
  estado.recomendaciones={cargando:true,datos:null,error:'',clave};
  pintarRecomendaciones();
  recomendacionTemporizador=setTimeout(()=>consultarRecomendaciones(estado,datos,clave),inmediato ? 0 : 850);
}
async function consultarRecomendaciones(estado,datos,clave) {
  const controlador=new AbortController(); recomendacionControlador=controlador;
  const temporizador=setTimeout(()=>controlador.abort(),22000);
  const vigente=()=>wz===estado && wz.paso===4 && wz.recomendaciones.clave===clave && $('#recomendaciones');
  try {
    const res=await fetch('/api/recomendaciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(datos),signal:controlador.signal});
    const respuesta=await res.json();
    if(!res.ok)throw new Error(respuesta.error || 'No pudimos obtener sugerencias.');
    if(vigente()) { estado.recomendaciones={cargando:false,datos:respuesta,error:'',clave}; pintarRecomendaciones(); }
  } catch(err) {
    if(vigente() && recomendacionControlador===controlador) {
      estado.recomendaciones={cargando:false,datos:null,error:err.name==='AbortError' ? 'La consulta tardó demasiado. Puedes volver a intentar o continuar con tu destino.' : err.message};
      pintarRecomendaciones();
    }
  } finally {
    clearTimeout(temporizador);
    if(recomendacionControlador===controlador)recomendacionControlador=null;
  }
}
function enlazarRecomendaciones() {
  $('#actualizar-recomendaciones').onclick=()=>programarRecomendaciones(true);
  $('#cambiar-destino').onclick=()=>{leerPaso();wz.paso=3;renderWizard();};
  ['#p-presupuesto','#p-tipo','#p-notas'].forEach(s=>$(s).addEventListener(s==='#p-tipo' ? 'change' : 'input',()=>programarRecomendaciones()));
  document.querySelectorAll('[name="p-intereses"]').forEach(c=>c.onchange=()=>programarRecomendaciones());
  programarRecomendaciones(true);
}
