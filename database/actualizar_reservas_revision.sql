-- Ejecutar solo en Post / Practicas_postgres (ciwkgqdpogteheeyigxb).
-- Conserva los datos existentes; no cambia tablas ajenas a Althea.
begin;
alter table public.althea_reservas add column if not exists oferta jsonb;
alter table public.althea_reservas add column if not exists asientos jsonb not null default '[]'::jsonb;
alter table public.althea_reservas add column if not exists politicas jsonb;
create or replace function public.althea_read_state() returns jsonb
language sql stable security invoker set search_path = ''
as $function$
select jsonb_build_object('revision',m.revision,'data',jsonb_build_object(
  'reservasRevision',2,
  'seq',m.secuencias,
  'clientes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'nombre',c.nombre,'correo',c.correo,'telefono',c.telefono) order by c.id) from public.althea_clientes c),'[]'::jsonb),
  'solicitudes',coalesce((select jsonb_agg(jsonb_build_object(
    'id',s.id,'clienteId',s.cliente_id,'destino',jsonb_build_object('origen',s.origen,'destino',s.destino,'fechaSalida',s.fecha_salida,'fechaRegreso',s.fecha_regreso),
    'preferencias',jsonb_build_object('tipoServicio',s.tipo_servicio,'presupuesto',s.presupuesto,'intereses',s.intereses,'notas',s.notas),
    'viajeros',coalesce((select jsonb_agg(jsonb_build_object('nombre',v.nombre,'documento',v.documento,'tipo',v.tipo) order by v.posicion) from public.althea_viajeros v where v.solicitud_id=s.id),'[]'::jsonb),
    'estado',s.estado,'creadaEn',s.creada_en) order by s.id) from public.althea_solicitudes s),'[]'::jsonb),
  'reservas',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',r.id,'codigo',r.codigo,'solicitudId',r.solicitud_id,'clienteId',r.cliente_id,'fechaSalida',r.fecha_salida,'fechaRegreso',r.fecha_regreso,'estado',r.estado,'cotizacionId',r.cotizacion_id,'total',r.total,'oferta',r.oferta,'asientos',r.asientos,'politicas',r.politicas,'creadaEn',r.creada_en)) order by r.id) from public.althea_reservas r),'[]'::jsonb),
  'cotizaciones',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',c.id,'codigo',c.codigo,'solicitudId',c.solicitud_id,'descripcion',c.descripcion,'total',c.total,'estado',c.estado,'reservaId',c.reserva_id,'creadaEn',c.creada_en)) order by c.id) from public.althea_cotizaciones c),'[]'::jsonb),
  'pagos',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',p.id,'codigo',p.codigo,'reservaId',p.reserva_id,'monto',p.monto,'metodo',p.metodo,'referencia',p.referencia,'estado',p.estado,'creadaEn',p.creada_en,'anuladoEn',p.anulado_en)) order by p.id) from public.althea_pagos p),'[]'::jsonb),
  'destinos',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'nombre',d.nombre,'pais',d.pais,'intereses',d.intereses,'nivel',d.nivel,'familiar',d.familiar,'diasMinimos',d.dias_minimos,'region',d.region,'actividades',d.actividades) order by d.id) from public.althea_destinos d),'[]'::jsonb)
)) from public.althea_control m where m.id=true;
$function$;

create or replace function public.althea_write_state(expected_revision bigint, payload jsonb) returns bigint
language plpgsql security invoker set search_path = ''
as $function$
declare
  actual bigint; tabla text; item jsonb; padre jsonb; i integer; max_id bigint; omitidos boolean;
begin
  select revision into actual from public.althea_control where id=true for update;
  if actual is distinct from expected_revision then
    raise sqlstate 'PT409' using message='ALTHEA_REVISION_CONFLICT';
  end if;
  foreach tabla in array array['clientes','solicitudes','reservas','cotizaciones','pagos'] loop
    if jsonb_typeof(payload->tabla) is distinct from 'array' or jsonb_typeof(payload->'seq') is distinct from 'object' then
      raise sqlstate 'PT400' using message='Estado de datos incompleto';
    end if;
    execute format('select coalesce(max(id),0) from public.%I','althea_'||tabla) into max_id;
    -- Solo permite adiciones y actualizaciones; evita borrar registros por un estado parcial.
    if exists (
      select 1 from jsonb_array_elements(payload->tabla) t
      where (t->>'id')::bigint <= 0 or (t->>'id')::numeric > 9007199254740991
    ) then raise sqlstate 'PT400' using message='Identificador inválido'; end if;
    execute format(
      'select exists(select 1 from public.%I t where not exists(select 1 from jsonb_array_elements($1) j where (j->>''id'')::bigint=t.id))',
      'althea_'||tabla
    ) into omitidos using payload->tabla;
    if omitidos then raise sqlstate 'PT400' using message='No se permite omitir registros existentes'; end if;
    select greatest(max_id,coalesce(max((j->>'id')::bigint),0)) into max_id from jsonb_array_elements(payload->tabla) j;
    if coalesce((payload->'seq'->>tabla)::bigint,-1) < max_id then
      raise sqlstate 'PT400' using message='Secuencia de identificadores inválida';
    end if;
  end loop;

  for item in select j from jsonb_array_elements(payload->'clientes') j order by (j->>'id')::bigint loop
    insert into public.althea_clientes values ((item->>'id')::bigint,btrim(item->>'nombre'),btrim(item->>'correo'),btrim(item->>'telefono'))
    on conflict(id) do update set nombre=excluded.nombre,correo=excluded.correo,telefono=excluded.telefono;
  end loop;

  for item in select j from jsonb_array_elements(payload->'solicitudes') j order by (j->>'id')::bigint loop
    if jsonb_typeof(item->'viajeros') is distinct from 'array' or jsonb_array_length(item->'viajeros')=0 then
      raise sqlstate 'PT400' using message='Agrega al menos un viajero';
    end if;
    insert into public.althea_solicitudes(id,cliente_id,origen,destino,fecha_salida,fecha_regreso,tipo_servicio,presupuesto,intereses,notas,estado,creada_en)
    values((item->>'id')::bigint,(item->>'clienteId')::bigint,item->'destino'->>'origen',item->'destino'->>'destino',
      (item->'destino'->>'fechaSalida')::date,(item->'destino'->>'fechaRegreso')::date,item->'preferencias'->>'tipoServicio',
      (item->'preferencias'->>'presupuesto')::numeric,
      array(select jsonb_array_elements_text(coalesce(item->'preferencias'->'intereses','[]'::jsonb))),
      coalesce(item->'preferencias'->>'notas',''),item->>'estado',(item->>'creadaEn')::timestamptz)
    on conflict(id) do update set cliente_id=excluded.cliente_id,origen=excluded.origen,destino=excluded.destino,
      fecha_salida=excluded.fecha_salida,fecha_regreso=excluded.fecha_regreso,tipo_servicio=excluded.tipo_servicio,
      presupuesto=excluded.presupuesto,intereses=excluded.intereses,notas=excluded.notas,estado=excluded.estado;
    i:=0;
    for padre in select j from jsonb_array_elements(item->'viajeros') j loop
      insert into public.althea_viajeros values ((item->>'id')::bigint,i,padre->>'nombre',padre->>'documento',padre->>'tipo')
      on conflict(solicitud_id,posicion) do update set nombre=excluded.nombre,documento=excluded.documento,tipo=excluded.tipo;
      i:=i+1;
    end loop;
    delete from public.althea_viajeros where solicitud_id=(item->>'id')::bigint and posicion>=i;
  end loop;

  for item in select j from jsonb_array_elements(payload->'cotizaciones') j order by (j->>'id')::bigint loop
    insert into public.althea_cotizaciones values ((item->>'id')::bigint,item->>'codigo',(item->>'solicitudId')::bigint,
      item->>'descripcion',(item->>'total')::numeric,item->>'estado',(item->>'reservaId')::bigint,(item->>'creadaEn')::timestamptz)
    on conflict(id) do update set descripcion=excluded.descripcion,total=excluded.total,estado=excluded.estado,reserva_id=excluded.reserva_id;
  end loop;
  for item in select j from jsonb_array_elements(payload->'reservas') j order by (j->>'id')::bigint loop
    insert into public.althea_reservas(id,codigo,solicitud_id,cliente_id,fecha_salida,fecha_regreso,estado,cotizacion_id,total,oferta,asientos,politicas,creada_en) values ((item->>'id')::bigint,item->>'codigo',(item->>'solicitudId')::bigint,(item->>'clienteId')::bigint,
      (item->>'fechaSalida')::date,(item->>'fechaRegreso')::date,item->>'estado',(item->>'cotizacionId')::bigint,(item->>'total')::numeric,item->'oferta',coalesce(item->'asientos','[]'::jsonb),item->'politicas',(item->>'creadaEn')::timestamptz)
    on conflict(id) do update set fecha_salida=excluded.fecha_salida,fecha_regreso=excluded.fecha_regreso,estado=excluded.estado,cotizacion_id=excluded.cotizacion_id,total=excluded.total,oferta=excluded.oferta,asientos=excluded.asientos,politicas=excluded.politicas;
  end loop;
  for item in select j from jsonb_array_elements(payload->'pagos') j order by (j->>'id')::bigint loop
    insert into public.althea_pagos values ((item->>'id')::bigint,item->>'codigo',(item->>'reservaId')::bigint,(item->>'monto')::numeric,
      item->>'metodo',item->>'referencia',item->>'estado',(item->>'creadaEn')::timestamptz,(item->>'anuladoEn')::timestamptz)
    on conflict(id) do update set estado=excluded.estado,anulado_en=excluded.anulado_en;
  end loop;
  -- Verificación financiera al final de la misma transacción.
  if exists (
    select 1 from public.althea_reservas r join public.althea_pagos p on p.reserva_id=r.id and p.estado='Registrado'
    group by r.id having r.estado='Cancelada' or r.total is null or sum(p.monto)>r.total
  ) then raise sqlstate 'PT409' using message='Los pagos no son compatibles con el total o estado de la reserva'; end if;
  if exists (
    select 1 from public.althea_reservas r join public.althea_cotizaciones c on c.id=r.cotizacion_id
    where r.total is distinct from c.total or c.solicitud_id<>r.solicitud_id
  ) then raise sqlstate 'PT409' using message='La cotización no coincide con la reserva'; end if;

  update public.althea_control set revision=revision+1,secuencias=payload->'seq' where id=true returning revision into actual;
  return actual;
end;
$function$;


revoke all on function public.althea_read_state() from public,anon,authenticated;
revoke all on function public.althea_write_state(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.althea_read_state() to service_role;
grant execute on function public.althea_write_state(bigint,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
