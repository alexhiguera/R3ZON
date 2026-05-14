-- =============================================================================
-- R3ZON Business OS — Seed de 10 clientes B2B de prueba
-- =============================================================================
-- Inserta 10 empresas ficticias en el primer perfiles_negocio existente.
-- Idempotente: si ya hay un cliente con el mismo CIF para ese negocio, no
-- duplica.
-- =============================================================================

do $$
declare
  v_negocio uuid;
  v_cliente uuid;
  v_clientes_data jsonb := '[
    {
      "nombre":"Acme Soluciones S.L.",      "cif":"B12345678",
      "sector":"Tecnología",                 "sitio_web":"https://acme.com",
      "email":"hola@acme.com",               "telefono":"+34 911 222 333",
      "direccion":"Gran Vía 1",              "ciudad":"Madrid",
      "codigo_postal":"28013",               "num_empleados":45,
      "facturacion_anual":1850000,           "estado":"activa",
      "etiquetas":["fidelizado","saas"],
      "contactos":[
        {"nombre":"Lucía","apellidos":"García","puesto":"CEO","departamento":"Dirección","es_decisor":true,"email":"lucia@acme.com"},
        {"nombre":"Marc","apellidos":"Roig","puesto":"CTO","departamento":"Tecnología","reports_to_idx":0}
      ]
    },
    {
      "nombre":"Cafés Aurora S.A.",          "cif":"A87654321",
      "sector":"Hostelería",                 "sitio_web":"https://cafesaurora.es",
      "email":"info@cafesaurora.es",         "telefono":"+34 932 111 444",
      "direccion":"Passeig de Gràcia 88",    "ciudad":"Barcelona",
      "codigo_postal":"08008",               "num_empleados":120,
      "facturacion_anual":4300000,           "estado":"activa",
      "etiquetas":["retail","horeca"],
      "contactos":[
        {"nombre":"Pere","apellidos":"Vidal","puesto":"Director General","es_decisor":true}
      ]
    },
    {
      "nombre":"Construcciones Mediterráneo S.L.", "cif":"B33445566",
      "sector":"Construcción",                     "sitio_web":"https://med-build.es",
      "email":"contacto@med-build.es",             "telefono":"+34 963 555 222",
      "direccion":"Av. del Puerto 30",             "ciudad":"Valencia",
      "codigo_postal":"46021",                     "num_empleados":80,
      "facturacion_anual":6700000,                 "estado":"prospecto",
      "etiquetas":["licitacion-2026"]
    },
    {
      "nombre":"Logística Norte S.A.",       "cif":"A55667788",
      "sector":"Transporte y logística",     "sitio_web":"https://lognorte.com",
      "email":"comercial@lognorte.com",      "telefono":"+34 944 333 666",
      "direccion":"Polígono Erletxes 4",     "ciudad":"Bilbao",
      "codigo_postal":"48160",               "num_empleados":210,
      "facturacion_anual":12500000,          "estado":"activa",
      "etiquetas":["enterprise"],
      "contactos":[
        {"nombre":"Aitor","apellidos":"Etxebarria","puesto":"Director de Operaciones","es_decisor":true},
        {"nombre":"Nerea","apellidos":"Sáez","puesto":"Jefa de Compras","reports_to_idx":0}
      ]
    },
    {
      "nombre":"Estudio Lumen Arquitectos",  "cif":"B11223344",
      "sector":"Arquitectura y diseño",       "sitio_web":"https://estudiolumen.com",
      "email":"hola@estudiolumen.com",        "telefono":"+34 952 877 100",
      "direccion":"C/ Larios 12",             "ciudad":"Málaga",
      "codigo_postal":"29005",                "num_empleados":18,
      "facturacion_anual":920000,             "estado":"activa",
      "etiquetas":["creativos","premium"]
    },
    {
      "nombre":"Cosmética Verde S.L.",       "cif":"B99887766",
      "sector":"Cosmética natural",           "sitio_web":"https://cosmeticaverde.eco",
      "email":"contact@cosmeticaverde.eco",   "telefono":"+34 968 444 555",
      "direccion":"Carretera del Mar 22",     "ciudad":"Murcia",
      "codigo_postal":"30007",                "num_empleados":34,
      "facturacion_anual":2100000,            "estado":"prospecto",
      "etiquetas":["sostenible","eco"]
    },
    {
      "nombre":"DataMind Analytics",          "cif":"B22334455",
      "sector":"Consultoría tecnológica",     "sitio_web":"https://datamind.io",
      "email":"team@datamind.io",             "telefono":"+34 917 999 000",
      "direccion":"C/ Serrano 41",            "ciudad":"Madrid",
      "codigo_postal":"28001",                "num_empleados":55,
      "facturacion_anual":3400000,            "estado":"activa",
      "etiquetas":["AI","datos"],
      "contactos":[
        {"nombre":"Sara","apellidos":"Domingo","puesto":"Founder & CEO","es_decisor":true,"email":"sara@datamind.io"}
      ]
    },
    {
      "nombre":"Bodegas Solera 1929",         "cif":"A66778899",
      "sector":"Vino y bebidas",              "sitio_web":"https://solera1929.es",
      "email":"export@solera1929.es",         "telefono":"+34 956 222 111",
      "direccion":"Avda. del Puerto 5",       "ciudad":"Jerez de la Frontera",
      "codigo_postal":"11402",                "num_empleados":95,
      "facturacion_anual":5400000,            "estado":"activa",
      "etiquetas":["export","tradicional"]
    },
    {
      "nombre":"Clínica Dental Smile",        "cif":"B44556677",
      "sector":"Salud",                        "sitio_web":"https://clinicasmile.es",
      "email":"hola@clinicasmile.es",          "telefono":"+34 981 100 200",
      "direccion":"Rúa Real 14",               "ciudad":"A Coruña",
      "codigo_postal":"15003",                 "num_empleados":12,
      "facturacion_anual":680000,              "estado":"prospecto",
      "etiquetas":["pyme","salud"]
    },
    {
      "nombre":"EcoTrans Logistics",           "cif":"B77889900",
      "sector":"Transporte sostenible",         "sitio_web":"https://ecotrans.eu",
      "email":"info@ecotrans.eu",               "telefono":"+34 976 545 545",
      "direccion":"Polígono Plaza, Calle E",    "ciudad":"Zaragoza",
      "codigo_postal":"50197",                  "num_empleados":140,
      "facturacion_anual":8900000,              "estado":"inactiva",
      "etiquetas":["pausa-comercial"]
    }
  ]'::jsonb;
  v_cli jsonb;
  v_con jsonb;
  v_contacto_ids uuid[];
  v_idx int;
  v_reports_to_idx int;
  v_new_contacto_id uuid;
begin
  select id into v_negocio
    from public.perfiles_negocio
    order by created_at asc
    limit 1;

  if v_negocio is null then
    raise notice 'Sin perfiles_negocio: registra un usuario antes de seedear clientes.';
    return;
  end if;

  for v_cli in select * from jsonb_array_elements(v_clientes_data) loop
    -- Idempotencia por CIF.
    select id into v_cliente
      from public.clientes
     where negocio_id = v_negocio
       and cif = v_cli->>'cif'
     limit 1;

    if v_cliente is null then
      insert into public.clientes (
        negocio_id, nombre, cif, sector, sitio_web, email, telefono,
        direccion, ciudad, codigo_postal, pais,
        num_empleados, facturacion_anual, estado, etiquetas
      ) values (
        v_negocio,
        v_cli->>'nombre',
        v_cli->>'cif',
        v_cli->>'sector',
        v_cli->>'sitio_web',
        v_cli->>'email',
        v_cli->>'telefono',
        v_cli->>'direccion',
        v_cli->>'ciudad',
        v_cli->>'codigo_postal',
        'España',
        nullif(v_cli->>'num_empleados','')::int,
        nullif(v_cli->>'facturacion_anual','')::numeric,
        v_cli->>'estado',
        coalesce(
          array(select jsonb_array_elements_text(v_cli->'etiquetas')),
          '{}'::text[]
        )
      ) returning id into v_cliente;
    end if;

    -- Contactos (con jerarquía: reports_to_idx referencia al índice del array).
    v_contacto_ids := '{}';
    v_idx := 0;
    if v_cli ? 'contactos' then
      for v_con in select * from jsonb_array_elements(v_cli->'contactos') loop
        v_reports_to_idx := nullif(v_con->>'reports_to_idx','')::int;

        insert into public.contactos_cliente (
          negocio_id, cliente_id, reports_to,
          nombre, apellidos, email, telefono,
          puesto, departamento, es_decisor
        ) values (
          v_negocio, v_cliente,
          case when v_reports_to_idx is not null
               then v_contacto_ids[v_reports_to_idx + 1]
               else null end,
          v_con->>'nombre',
          v_con->>'apellidos',
          v_con->>'email',
          v_con->>'telefono',
          v_con->>'puesto',
          v_con->>'departamento',
          coalesce((v_con->>'es_decisor')::boolean, false)
        )
        on conflict do nothing
        returning id into v_new_contacto_id;

        if v_new_contacto_id is not null then
          v_contacto_ids := v_contacto_ids || v_new_contacto_id;
        end if;
        v_idx := v_idx + 1;
      end loop;
    end if;
  end loop;

  raise notice '✅ Seed completado: 10 clientes B2B en negocio %', v_negocio;
end $$;
