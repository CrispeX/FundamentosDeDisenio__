-- Althea: tablas propias de la aplicación. No modifica otras tablas del proyecto.
create table public.althea_control (
  id boolean primary key default true check (id),
  revision bigint not null default 0 check (revision >= 0),
  secuencias jsonb not null default '{"clientes":0,"solicitudes":0,"reservas":0,"cotizaciones":0,"pagos":0}'::jsonb
);
insert into public.althea_control(id) values (true);

create table public.althea_clientes (
  id bigint primary key check (id > 0),
  nombre text not null check (length(btrim(nombre)) > 0),
  correo text not null check (correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  telefono text not null check (length(btrim(telefono)) > 0)
);
create unique index althea_clientes_correo_unique on public.althea_clientes(lower(correo));

create table public.althea_solicitudes (
  id bigint primary key check (id > 0),
  cliente_id bigint not null references public.althea_clientes(id),
  origen text not null check (length(btrim(origen)) > 0),
  destino text not null check (length(btrim(destino)) > 0),
  fecha_salida date not null,
  fecha_regreso date not null check (fecha_regreso >= fecha_salida),
  tipo_servicio text not null check (tipo_servicio in ('Paquete','Vuelo','Hotel')),
  presupuesto numeric(16,2) check (presupuesto > 0),
  intereses text[] not null default '{}',
  notas text not null default '',
  estado text not null check (estado in ('Pendiente','Reservada')),
  creada_en timestamptz not null default now(),
  unique(id, cliente_id)
);
create index althea_solicitudes_cliente_idx on public.althea_solicitudes(cliente_id);

create table public.althea_viajeros (
  solicitud_id bigint not null references public.althea_solicitudes(id) on delete cascade,
  posicion integer not null check (posicion >= 0),
  nombre text not null check (length(btrim(nombre)) > 0),
  documento text not null check (length(btrim(documento)) > 0),
  tipo text not null check (tipo in ('Adulto','Niño')),
  primary key(solicitud_id,posicion)
);

create table public.althea_cotizaciones (
  id bigint primary key check (id > 0),
  codigo text not null unique,
  solicitud_id bigint not null references public.althea_solicitudes(id),
  descripcion text not null check (length(btrim(descripcion)) > 0),
  total numeric(16,2) not null check (total > 0),
  estado text not null check (estado in ('Borrador','Aceptada','Rechazada','Cancelada')),
  reserva_id bigint,
  creada_en timestamptz not null default now()
);
create index althea_cotizaciones_solicitud_idx on public.althea_cotizaciones(solicitud_id);
create unique index althea_cotizaciones_vigente_unique on public.althea_cotizaciones(solicitud_id)
  where estado in ('Borrador','Aceptada');

create table public.althea_reservas (
  id bigint primary key check (id > 0),
  codigo text not null unique,
  solicitud_id bigint not null,
  cliente_id bigint not null references public.althea_clientes(id),
  fecha_salida date not null,
  fecha_regreso date not null check (fecha_regreso >= fecha_salida),
  estado text not null check (estado in ('Confirmada','Cancelada')),
  cotizacion_id bigint unique references public.althea_cotizaciones(id) deferrable initially deferred,
  total numeric(16,2) check (total > 0),
  creada_en timestamptz not null default now(),
  foreign key(solicitud_id,cliente_id) references public.althea_solicitudes(id,cliente_id)
);
create index althea_reservas_cliente_idx on public.althea_reservas(cliente_id);
create index althea_reservas_solicitud_cliente_idx on public.althea_reservas(solicitud_id,cliente_id);
create index althea_reservas_fecha_idx on public.althea_reservas(fecha_salida);
create unique index althea_reservas_activa_unique on public.althea_reservas(solicitud_id) where estado <> 'Cancelada';
alter table public.althea_cotizaciones add constraint althea_cotizaciones_reserva_fk
  foreign key(reserva_id) references public.althea_reservas(id) deferrable initially deferred;
create index althea_cotizaciones_reserva_idx on public.althea_cotizaciones(reserva_id);

create table public.althea_pagos (
  id bigint primary key check (id > 0),
  codigo text not null unique,
  reserva_id bigint not null references public.althea_reservas(id),
  monto numeric(16,2) not null check (monto > 0),
  metodo text not null check (metodo in ('Efectivo','Transferencia','Tarjeta')),
  referencia text not null check (length(btrim(referencia)) > 0),
  estado text not null check (estado in ('Registrado','Anulado')),
  creada_en timestamptz not null default now(),
  anulado_en timestamptz
);
create index althea_pagos_reserva_idx on public.althea_pagos(reserva_id);
create unique index althea_pagos_referencia_unique on public.althea_pagos(lower(referencia)) where estado='Registrado';

create table public.althea_destinos (
  id text primary key,
  nombre text not null unique,
  pais text not null,
  intereses text[] not null,
  nivel integer not null check (nivel between 1 and 3),
  familiar boolean not null,
  dias_minimos integer not null check (dias_minimos > 0),
  region text not null,
  actividades text[] not null
);

create function public.althea_read_state() returns jsonb
language sql stable security invoker set search_path = ''
as $function$
select jsonb_build_object('revision',m.revision,'data',jsonb_build_object(
  'seq',m.secuencias,
  'clientes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'nombre',c.nombre,'correo',c.correo,'telefono',c.telefono) order by c.id) from public.althea_clientes c),'[]'::jsonb),
  'solicitudes',coalesce((select jsonb_agg(jsonb_build_object(
    'id',s.id,'clienteId',s.cliente_id,'destino',jsonb_build_object('origen',s.origen,'destino',s.destino,'fechaSalida',s.fecha_salida,'fechaRegreso',s.fecha_regreso),
    'preferencias',jsonb_build_object('tipoServicio',s.tipo_servicio,'presupuesto',s.presupuesto,'intereses',s.intereses,'notas',s.notas),
    'viajeros',coalesce((select jsonb_agg(jsonb_build_object('nombre',v.nombre,'documento',v.documento,'tipo',v.tipo) order by v.posicion) from public.althea_viajeros v where v.solicitud_id=s.id),'[]'::jsonb),
    'estado',s.estado,'creadaEn',s.creada_en) order by s.id) from public.althea_solicitudes s),'[]'::jsonb),
  'reservas',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',r.id,'codigo',r.codigo,'solicitudId',r.solicitud_id,'clienteId',r.cliente_id,'fechaSalida',r.fecha_salida,'fechaRegreso',r.fecha_regreso,'estado',r.estado,'cotizacionId',r.cotizacion_id,'total',r.total,'creadaEn',r.creada_en)) order by r.id) from public.althea_reservas r),'[]'::jsonb),
  'cotizaciones',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',c.id,'codigo',c.codigo,'solicitudId',c.solicitud_id,'descripcion',c.descripcion,'total',c.total,'estado',c.estado,'reservaId',c.reserva_id,'creadaEn',c.creada_en)) order by c.id) from public.althea_cotizaciones c),'[]'::jsonb),
  'pagos',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',p.id,'codigo',p.codigo,'reservaId',p.reserva_id,'monto',p.monto,'metodo',p.metodo,'referencia',p.referencia,'estado',p.estado,'creadaEn',p.creada_en,'anuladoEn',p.anulado_en)) order by p.id) from public.althea_pagos p),'[]'::jsonb),
  'destinos',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'nombre',d.nombre,'pais',d.pais,'intereses',d.intereses,'nivel',d.nivel,'familiar',d.familiar,'diasMinimos',d.dias_minimos,'region',d.region,'actividades',d.actividades) order by d.id) from public.althea_destinos d),'[]'::jsonb)
)) from public.althea_control m where m.id=true;
$function$;

create function public.althea_write_state(expected_revision bigint, payload jsonb) returns bigint
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
    insert into public.althea_reservas values ((item->>'id')::bigint,item->>'codigo',(item->>'solicitudId')::bigint,(item->>'clienteId')::bigint,
      (item->>'fechaSalida')::date,(item->>'fechaRegreso')::date,item->>'estado',(item->>'cotizacionId')::bigint,(item->>'total')::numeric,(item->>'creadaEn')::timestamptz)
    on conflict(id) do update set fecha_salida=excluded.fecha_salida,fecha_regreso=excluded.fecha_regreso,estado=excluded.estado,cotizacion_id=excluded.cotizacion_id,total=excluded.total;
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

-- Acceso exclusivo desde el servidor de la aplicación, con clave privada.
do $security$
declare t text;
begin
  foreach t in array array['althea_control','althea_clientes','althea_solicitudes','althea_viajeros','althea_cotizaciones','althea_reservas','althea_pagos','althea_destinos'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to service_role',t);
    execute format('create policy althea_servidor on public.%I for all to service_role using (true) with check (true)',t);
  end loop;
end;
$security$;
revoke all on function public.althea_read_state() from public,anon,authenticated;
revoke all on function public.althea_write_state(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.althea_read_state() to service_role;
grant execute on function public.althea_write_state(bigint,jsonb) to service_role;
notify pgrst, 'reload schema';
