begin;
set local role service_role;
do $test$
declare snap jsonb; d jsonb; mala jsonb; rev bigint; cid bigint; sid bigint; qid bigint; rid bigint; pid bigint; pruebas integer:=0;
begin
  snap:=public.althea_read_state();d:=snap->'data';rev:=(snap->>'revision')::bigint;
  cid:=(d->'seq'->>'clientes')::bigint+1;sid:=(d->'seq'->>'solicitudes')::bigint+1;
  qid:=(d->'seq'->>'cotizaciones')::bigint+1;rid:=(d->'seq'->>'reservas')::bigint+1;pid:=(d->'seq'->>'pagos')::bigint+1;
  d:=jsonb_set(d,'{seq,clientes}',to_jsonb(cid));
  d:=jsonb_set(d,'{seq,solicitudes}',to_jsonb(sid));
  d:=jsonb_set(d,'{seq,cotizaciones}',to_jsonb(qid));
  d:=jsonb_set(d,'{clientes}',(d->'clientes')||jsonb_build_array(jsonb_build_object('id',cid,'nombre','Prueba Supabase','correo','althea-sql-test@example.test','telefono','3000000000')));
  d:=jsonb_set(d,'{solicitudes}',(d->'solicitudes')||jsonb_build_array(jsonb_build_object(
    'id',sid,'clienteId',cid,'viajeros',jsonb_build_array(jsonb_build_object('nombre','Viajero de prueba','documento','TEST-SQL','tipo','Adulto')),
    'destino',jsonb_build_object('origen','Medellín','destino','Cartagena','fechaSalida','2027-03-01','fechaRegreso','2027-03-05'),
    'preferencias',jsonb_build_object('tipoServicio','Paquete','presupuesto',1500000,'notas','','intereses',jsonb_build_array('Playa')),
    'estado','Pendiente','creadaEn',now())));
  d:=jsonb_set(d,'{cotizaciones}',(d->'cotizaciones')||jsonb_build_array(jsonb_build_object(
    'id',qid,'codigo','COT-SQL-TEST','solicitudId',sid,'descripcion','Prueba transaccional','total',1000,'estado','Borrador','creadaEn',now())));
  rev:=public.althea_write_state(rev,d);pruebas:=pruebas+1;
  begin
    perform public.althea_write_state(rev-1,d);
    raise exception 'No se detectó el conflicto de versión';
  exception when sqlstate 'PT409' then pruebas:=pruebas+1;
  end;
  d:=jsonb_set(d,'{seq,reservas}',to_jsonb(rid));
  d:=jsonb_set(d,'{solicitudes}',(select jsonb_agg(case when (j->>'id')::bigint=sid then j||'{"estado":"Reservada"}'::jsonb else j end order by (j->>'id')::bigint) from jsonb_array_elements(d->'solicitudes') j));
  d:=jsonb_set(d,'{cotizaciones}',(select jsonb_agg(case when (j->>'id')::bigint=qid then j||jsonb_build_object('estado','Aceptada','reservaId',rid) else j end order by (j->>'id')::bigint) from jsonb_array_elements(d->'cotizaciones') j));
  d:=jsonb_set(d,'{reservas}',(d->'reservas')||jsonb_build_array(jsonb_build_object(
    'id',rid,'codigo','RES-SQL-TEST','solicitudId',sid,'clienteId',cid,'cotizacionId',qid,'total',1000,'fechaSalida','2027-03-01','fechaRegreso','2027-03-05','estado','Confirmada','creadaEn',now())));
  rev:=public.althea_write_state(rev,d);pruebas:=pruebas+1;
  d:=jsonb_set(d,'{seq,pagos}',to_jsonb(pid));
  d:=jsonb_set(d,'{pagos}',(d->'pagos')||jsonb_build_array(jsonb_build_object(
    'id',pid,'codigo','PAG-SQL-TEST','reservaId',rid,'monto',500,'metodo','Efectivo','referencia','SQL-TEST','estado','Registrado','creadaEn',now())));
  rev:=public.althea_write_state(rev,d);pruebas:=pruebas+1;
  mala:=jsonb_set(d,'{seq,pagos}',to_jsonb(pid+1));
  mala:=jsonb_set(mala,'{pagos}',(mala->'pagos')||jsonb_build_array(jsonb_build_object(
    'id',pid+1,'codigo','PAG-SQL-TEST-2','reservaId',rid,'monto',600,'metodo','Efectivo','referencia','SQL-TEST-2','estado','Registrado','creadaEn',now())));
  begin
    perform public.althea_write_state(rev,mala);
    raise exception 'No se detectó el sobrepago';
  exception when sqlstate 'PT409' then pruebas:=pruebas+1;
  end;
  if (public.althea_read_state()->>'revision')::bigint<>rev then raise exception 'La operación fallida alteró la revisión';end if;
  if (select count(*) from public.althea_pagos where reserva_id=rid)<>1 then raise exception 'El sobrepago dejó datos parciales';end if;
  d:=jsonb_set(d,'{pagos}',(select jsonb_agg(case when (j->>'id')::bigint=pid then j||jsonb_build_object('estado','Anulado','anuladoEn',now()) else j end order by (j->>'id')::bigint) from jsonb_array_elements(d->'pagos') j));
  d:=jsonb_set(d,'{reservas}',(select jsonb_agg(case when (j->>'id')::bigint=rid then j||'{"estado":"Cancelada"}'::jsonb else j end order by (j->>'id')::bigint) from jsonb_array_elements(d->'reservas') j));
  d:=jsonb_set(d,'{cotizaciones}',(select jsonb_agg(case when (j->>'id')::bigint=qid then j||'{"estado":"Cancelada"}'::jsonb else j end order by (j->>'id')::bigint) from jsonb_array_elements(d->'cotizaciones') j));
  d:=jsonb_set(d,'{solicitudes}',(select jsonb_agg(case when (j->>'id')::bigint=sid then j||'{"estado":"Pendiente"}'::jsonb else j end order by (j->>'id')::bigint) from jsonb_array_elements(d->'solicitudes') j));
  rev:=public.althea_write_state(rev,d);pruebas:=pruebas+1;
  if pruebas<>6 then raise exception 'Pruebas incompletas';end if;
end;
$test$;
set constraints all immediate;
select '6 comprobaciones SQL aprobadas; se revierten los datos de prueba' as resultado;
rollback;
