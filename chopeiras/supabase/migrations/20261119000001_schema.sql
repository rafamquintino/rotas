-- =====================================================================
-- Controle de Chopeiras – Cervejaria Gonçalves
-- Esquema, regras de negócio e Row Level Security
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type perfil_usuario   as enum ('gestor', 'vendedor', 'tecnico');
create type marca_chopeira   as enum ('Gorillaz', 'Gonçalves');
create type voltagem_tipo    as enum ('110V', '220V');
create type status_chopeira  as enum ('disponivel', 'em_cliente', 'em_manutencao', 'reservada', 'baixada');
create type tipo_servico     as enum ('assepsia', 'manutencao_preventiva', 'manutencao_corretiva');
create type status_agendamento as enum ('agendado', 'realizado', 'atrasado', 'cancelado');

-- "Hoje" no fuso da cervejaria (o servidor do Supabase roda em UTC)
create or replace function hoje_br() returns date
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- ---------------------------------------------------------------------
-- Usuários (perfil ligado ao auth.users)
-- ---------------------------------------------------------------------
create table usuarios (
  id              uuid primary key references auth.users(id) on delete restrict,
  nome            text not null,
  email           text,
  perfil          perfil_usuario not null default 'vendedor',
  cidades         text[] not null default '{}',
  telefone        text,
  ativo           boolean not null default true,
  criado_por      uuid references auth.users(id) default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- Funções auxiliares para RLS (security definer evita recursão nas policies)
create or replace function meu_perfil() returns perfil_usuario
language sql stable security definer set search_path = public as $$
  select perfil from usuarios where id = auth.uid() and ativo
$$;

create or replace function eh_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_perfil() = 'gestor', false)
$$;

create or replace function eh_tecnico() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_perfil() = 'tecnico', false)
$$;

create or replace function eh_gestor_ou_tecnico() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_perfil() in ('gestor', 'tecnico'), false)
$$;

-- ---------------------------------------------------------------------
-- Modelos (capacidade em L/h editável por modelo)
-- ---------------------------------------------------------------------
create table modelos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null unique,
  marca           marca_chopeira not null,
  vias            smallint not null check (vias between 1 and 3),
  capacidade_lph  numeric(8,2) not null check (capacidade_lph > 0),
  ativo           boolean not null default true,
  criado_por      uuid references auth.users(id) default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table clientes (
  id                        uuid primary key default gen_random_uuid(),
  nome                      text not null,
  cidade                    text not null,
  endereco                  text,
  contato                   text,
  telefone                  text,
  vendedor_id               uuid references usuarios(id),
  tipo                      text not null default 'bar',
  freq_assepsia_dias        integer not null default 15 check (freq_assepsia_dias > 0),
  freq_manutencao_dias      integer not null default 90 check (freq_manutencao_dias > 0),
  observacoes               text,
  ativo                     boolean not null default true,
  criado_por                uuid references auth.users(id) default auth.uid(),
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now()
);
create index on clientes (vendedor_id);
create index on clientes (cidade);

-- ---------------------------------------------------------------------
-- Chopeiras
-- ---------------------------------------------------------------------
create sequence chopeira_codigo_seq;

create table chopeiras (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique
                      default 'CH-' || lpad(nextval('chopeira_codigo_seq')::text, 4, '0'),
  numero_serie        text unique,
  modelo_id           uuid references modelos(id),
  marca               marca_chopeira not null,
  voltagem            voltagem_tipo not null,
  vias                smallint not null check (vias between 1 and 3),
  capacidade_lph      numeric(8,2) check (capacidade_lph > 0),
  status              status_chopeira not null default 'disponivel',
  cliente_id          uuid references clientes(id),
  data_entrada_cliente date,
  observacoes         text,
  fotos               text[] not null default '{}',
  ativo               boolean not null default true,
  criado_por          uuid references auth.users(id) default auth.uid(),
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  -- Uma chopeira só pode estar em um cliente por vez, e só quando em_cliente
  constraint chopeira_cliente_coerente check (
    (status = 'em_cliente' and cliente_id is not null and data_entrada_cliente is not null)
    or (status <> 'em_cliente' and cliente_id is null)
  )
);
create index on chopeiras (status);
create index on chopeiras (cliente_id);

-- ---------------------------------------------------------------------
-- Histórico de status (toda mudança gera registro)
-- ---------------------------------------------------------------------
create table historico_status (
  id              bigint generated always as identity primary key,
  chopeira_id     uuid not null references chopeiras(id),
  status_anterior status_chopeira,
  status_novo     status_chopeira not null,
  cliente_anterior uuid references clientes(id),
  cliente_novo    uuid references clientes(id),
  motivo          text,
  criado_por      uuid references auth.users(id) default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index on historico_status (chopeira_id, criado_em desc);

-- ---------------------------------------------------------------------
-- Agendamentos
-- ---------------------------------------------------------------------
create table agendamentos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references clientes(id),
  chopeira_id     uuid references chopeiras(id),  -- nulo = todas as chopeiras do cliente
  tipo            tipo_servico not null,
  data_prevista   date not null,
  status          status_agendamento not null default 'agendado',
  tecnico_id      uuid references usuarios(id),
  solicitado_por  uuid references auth.users(id) default auth.uid(),
  automatico      boolean not null default false,
  observacoes     text,
  criado_por      uuid references auth.users(id) default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index on agendamentos (data_prevista) where status = 'agendado';
create index on agendamentos (cliente_id);

-- ---------------------------------------------------------------------
-- Serviços (histórico de execução)
-- ---------------------------------------------------------------------
create table servicos (
  id              uuid primary key default gen_random_uuid(), -- gerado no app (idempotência offline)
  tipo            tipo_servico not null,
  chopeira_id     uuid references chopeiras(id),
  cliente_id      uuid not null references clientes(id),
  agendamento_id  uuid references agendamentos(id),
  tecnico_id      uuid not null references usuarios(id) default auth.uid(),
  realizado_em    timestamptz not null default now(),
  checklist       jsonb not null default '[]',
  observacoes     text,
  fotos_antes     text[] not null default '{}',
  fotos_depois    text[] not null default '{}',
  assinatura_url  text,
  aceite_nome     text,
  criado_por      uuid references auth.users(id) default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index on servicos (cliente_id, realizado_em desc);
create index on servicos (chopeira_id, realizado_em desc);

-- =====================================================================
-- Triggers genéricos
-- =====================================================================
create or replace function tg_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  new.criado_por := old.criado_por;   -- criado_por e criado_em são imutáveis
  new.criado_em := old.criado_em;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['usuarios','modelos','clientes','chopeiras','historico_status','agendamentos','servicos']
  loop
    execute format('create trigger %I_atualizado_em before update on %I for each row execute function tg_atualizado_em()', t, t);
  end loop;
end $$;

-- Cria o perfil automaticamente quando um usuário é criado no Auth.
-- O primeiro usuário do sistema vira gestor (bootstrap).
create or replace function tg_novo_usuario_auth() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_perfil perfil_usuario;
begin
  if not exists (select 1 from usuarios) then
    v_perfil := 'gestor';
  else
    v_perfil := coalesce(nullif(new.raw_user_meta_data->>'perfil', '')::perfil_usuario, 'vendedor');
  end if;
  insert into usuarios (id, nome, email, perfil, telefone, cidades, criado_por)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    v_perfil,
    new.raw_user_meta_data->>'telefone',
    coalesce(
      (select array_agg(trim(c)) from unnest(string_to_array(new.raw_user_meta_data->>'cidades', ',')) c where trim(c) <> ''),
      '{}'
    ),
    coalesce(auth.uid(), nullif(new.raw_user_meta_data->>'criado_por', '')::uuid)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function tg_novo_usuario_auth();

-- Usuário não pode mudar o próprio perfil nem se reativar (só gestor)
create or replace function tg_protege_usuario() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not eh_gestor() and (new.perfil is distinct from old.perfil
                          or new.ativo is distinct from old.ativo
                          or new.cidades is distinct from old.cidades) then
    raise exception 'Apenas o gestor pode alterar perfil, cidades ou status do usuário';
  end if;
  return new;
end $$;
create trigger usuarios_protege before update on usuarios
for each row execute function tg_protege_usuario();

-- ---------------------------------------------------------------------
-- Chopeiras: capacidade padrão do modelo, histórico de status, proteção
-- ---------------------------------------------------------------------
create or replace function tg_chopeira_defaults() returns trigger
language plpgsql as $$
declare m modelos;
begin
  if new.modelo_id is not null and (tg_op = 'INSERT' or new.modelo_id is distinct from old.modelo_id) then
    select * into m from modelos where id = new.modelo_id;
    if new.capacidade_lph is null or (tg_op = 'UPDATE' and new.capacidade_lph = old.capacidade_lph) then
      new.capacidade_lph := m.capacidade_lph;
    end if;
  end if;
  if new.status <> 'em_cliente' then
    new.cliente_id := null;
    new.data_entrada_cliente := null;
  end if;
  return new;
end $$;
create trigger chopeiras_defaults before insert or update on chopeiras
for each row execute function tg_chopeira_defaults();

-- Técnico só pode mudar status/cliente/observações/fotos (não ficha técnica)
create or replace function tg_chopeira_protege() returns trigger
language plpgsql as $$
begin
  if eh_tecnico() and (
       new.codigo is distinct from old.codigo or new.numero_serie is distinct from old.numero_serie
    or new.marca is distinct from old.marca or new.voltagem is distinct from old.voltagem
    or new.vias is distinct from old.vias or new.modelo_id is distinct from old.modelo_id
    or new.capacidade_lph is distinct from old.capacidade_lph or new.ativo is distinct from old.ativo) then
    raise exception 'Técnico só pode alterar status, observações e fotos da chopeira';
  end if;
  return new;
end $$;
create trigger chopeiras_protege before update on chopeiras
for each row execute function tg_chopeira_protege();

create or replace function tg_chopeira_historico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into historico_status (chopeira_id, status_anterior, status_novo, cliente_novo, motivo, criado_por)
    values (new.id, null, new.status, new.cliente_id, 'Cadastro', auth.uid());
  elsif new.status is distinct from old.status or new.cliente_id is distinct from old.cliente_id then
    insert into historico_status (chopeira_id, status_anterior, status_novo, cliente_anterior, cliente_novo, motivo, criado_por)
    values (new.id, old.status, new.status, old.cliente_id, new.cliente_id,
            nullif(current_setting('app.motivo', true), ''), auth.uid());
  end if;
  return new;
end $$;
create trigger chopeiras_historico after insert or update on chopeiras
for each row execute function tg_chopeira_historico();

-- Mudança de capacidade no modelo propaga para as chopeiras do modelo
create or replace function tg_modelo_propaga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.capacidade_lph is distinct from old.capacidade_lph then
    update chopeiras set capacidade_lph = new.capacidade_lph where modelo_id = new.id;
  end if;
  return new;
end $$;
create trigger modelos_propaga after update on modelos
for each row execute function tg_modelo_propaga();

-- Bloqueia exclusão física de quem tem histórico (use ativo = false)
create or replace function tg_bloqueia_exclusao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'chopeiras' then
    if exists (select 1 from historico_status where chopeira_id = old.id and motivo is distinct from 'Cadastro')
       or exists (select 1 from servicos where chopeira_id = old.id)
       or exists (select 1 from agendamentos where chopeira_id = old.id) then
      raise exception 'Chopeira % tem histórico e não pode ser excluída. Use a inativação.', old.codigo;
    end if;
    delete from historico_status where chopeira_id = old.id;
  elsif tg_table_name = 'clientes' then
    if exists (select 1 from servicos where cliente_id = old.id)
       or exists (select 1 from agendamentos where cliente_id = old.id)
       or exists (select 1 from historico_status where cliente_novo = old.id or cliente_anterior = old.id) then
      raise exception 'Cliente "%" tem histórico e não pode ser excluído. Use a inativação.', old.nome;
    end if;
  end if;
  return old;
end $$;
create trigger chopeiras_bloqueia_exclusao before delete on chopeiras
for each row execute function tg_bloqueia_exclusao();
create trigger clientes_bloqueia_exclusao before delete on clientes
for each row execute function tg_bloqueia_exclusao();

-- Cliente com chopeira instalada não pode ser inativado
create or replace function tg_cliente_inativa() returns trigger
language plpgsql as $$
begin
  if old.ativo and not new.ativo and exists (select 1 from chopeiras where cliente_id = new.id) then
    raise exception 'Recolha as chopeiras do cliente antes de inativá-lo';
  end if;
  return new;
end $$;
create trigger clientes_inativa before update on clientes
for each row execute function tg_cliente_inativa();

-- ---------------------------------------------------------------------
-- Serviço concluído: fecha o agendamento e agenda o próximo
-- ---------------------------------------------------------------------
create or replace function tg_servico_concluido() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c clientes;
  v_freq integer;
  v_data date := (new.realizado_em at time zone 'America/Sao_Paulo')::date;
  v_prox uuid;
begin
  select * into c from clientes where id = new.cliente_id;

  -- Fecha o agendamento informado, ou o mais antigo pendente do mesmo tipo
  if new.agendamento_id is not null then
    update agendamentos set status = 'realizado' where id = new.agendamento_id and status = 'agendado';
  else
    update agendamentos set status = 'realizado'
     where id = (select id from agendamentos
                  where cliente_id = new.cliente_id and tipo = new.tipo and status = 'agendado'
                    and (chopeira_id is not distinct from new.chopeira_id or chopeira_id is null)
                  order by (chopeira_id is null), data_prevista limit 1);
  end if;

  -- Corretiva não gera recorrência
  if new.tipo = 'manutencao_corretiva' then return new; end if;

  v_freq := case new.tipo when 'assepsia' then c.freq_assepsia_dias else c.freq_manutencao_dias end;

  -- Recalcula: a recorrência automática pendente passa para (data do serviço + frequência)
  select id into v_prox from agendamentos
   where cliente_id = new.cliente_id and tipo = new.tipo and status = 'agendado' and automatico
     and chopeira_id is not distinct from new.chopeira_id
   order by data_prevista limit 1;

  if v_prox is not null then
    update agendamentos set data_prevista = v_data + v_freq, tecnico_id = coalesce(tecnico_id, new.tecnico_id)
     where id = v_prox;
    update agendamentos set status = 'cancelado', observacoes = coalesce(observacoes || ' · ', '') || 'Substituído pelo recálculo'
     where cliente_id = new.cliente_id and tipo = new.tipo and status = 'agendado' and automatico
       and chopeira_id is not distinct from new.chopeira_id and id <> v_prox;
  else
    insert into agendamentos (cliente_id, chopeira_id, tipo, data_prevista, tecnico_id, automatico, solicitado_por, criado_por)
    values (new.cliente_id, new.chopeira_id, new.tipo, v_data + v_freq, new.tecnico_id, true, auth.uid(), auth.uid());
  end if;
  return new;
end $$;
create trigger servicos_concluido after insert on servicos
for each row execute function tg_servico_concluido();

-- Mudança de frequência no cliente reprograma agendamentos automáticos pendentes
create or replace function tg_cliente_frequencia() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.freq_assepsia_dias is distinct from old.freq_assepsia_dias then
    update agendamentos a set data_prevista = a.data_prevista + (new.freq_assepsia_dias - old.freq_assepsia_dias)
     where a.cliente_id = new.id and a.tipo = 'assepsia' and a.status = 'agendado' and a.automatico;
  end if;
  if new.freq_manutencao_dias is distinct from old.freq_manutencao_dias then
    update agendamentos a set data_prevista = a.data_prevista + (new.freq_manutencao_dias - old.freq_manutencao_dias)
     where a.cliente_id = new.id and a.tipo = 'manutencao_preventiva' and a.status = 'agendado' and a.automatico;
  end if;
  return new;
end $$;
create trigger clientes_frequencia after update on clientes
for each row execute function tg_cliente_frequencia();

-- =====================================================================
-- Operações de movimentação (RPC) – transacionais e com checagem de perfil
-- =====================================================================
create or replace function enviar_para_cliente(p_chopeira uuid, p_cliente uuid, p_data date default null, p_obs text default null)
returns chopeiras
language plpgsql security invoker set search_path = public as $$
declare
  ch chopeiras;
  c  clientes;
  v_data date := coalesce(p_data, hoje_br());
begin
  if not eh_gestor_ou_tecnico() then
    raise exception 'Sem permissão para movimentar chopeiras';
  end if;
  select * into ch from chopeiras where id = p_chopeira for update;
  if not found or not ch.ativo then raise exception 'Chopeira não encontrada'; end if;
  if ch.status not in ('disponivel', 'reservada') then
    raise exception 'A chopeira % está "%" e não pode ser enviada', ch.codigo, ch.status;
  end if;
  select * into c from clientes where id = p_cliente and ativo;
  if not found then raise exception 'Cliente não encontrado ou inativo'; end if;

  perform set_config('app.motivo', coalesce(p_obs, 'Enviada para ' || c.nome), true);
  update chopeiras set status = 'em_cliente', cliente_id = p_cliente, data_entrada_cliente = v_data
   where id = p_chopeira returning * into ch;

  -- Agenda inicial: primeira assepsia e primeira preventiva
  insert into agendamentos (cliente_id, chopeira_id, tipo, data_prevista, automatico)
  values (p_cliente, p_chopeira, 'assepsia', v_data + c.freq_assepsia_dias, true),
         (p_cliente, p_chopeira, 'manutencao_preventiva', v_data + c.freq_manutencao_dias, true);
  return ch;
end $$;

create or replace function devolver_ao_estoque(p_chopeira uuid, p_obs text default null)
returns chopeiras
language plpgsql security invoker set search_path = public as $$
declare ch chopeiras;
begin
  if not eh_gestor_ou_tecnico() then raise exception 'Sem permissão para movimentar chopeiras'; end if;
  select * into ch from chopeiras where id = p_chopeira for update;
  if not found then raise exception 'Chopeira não encontrada'; end if;
  if ch.status = 'baixada' then raise exception 'Chopeira baixada não volta ao estoque'; end if;

  if ch.cliente_id is not null then
    update agendamentos set status = 'cancelado', observacoes = coalesce(observacoes || ' · ', '') || 'Chopeira recolhida'
     where chopeira_id = p_chopeira and status = 'agendado';
  end if;
  perform set_config('app.motivo', coalesce(p_obs, 'Devolvida ao estoque'), true);
  update chopeiras set status = 'disponivel' where id = p_chopeira returning * into ch;
  return ch;
end $$;

create or replace function alterar_status_chopeira(p_chopeira uuid, p_status status_chopeira, p_obs text default null)
returns chopeiras
language plpgsql security invoker set search_path = public as $$
declare ch chopeiras;
begin
  if not eh_gestor_ou_tecnico() then raise exception 'Sem permissão para alterar status'; end if;
  if p_status = 'em_cliente' then raise exception 'Use "Enviar para cliente"'; end if;
  if p_status = 'baixada' and not eh_gestor() then raise exception 'Apenas o gestor pode dar baixa'; end if;
  select * into ch from chopeiras where id = p_chopeira for update;
  if not found then raise exception 'Chopeira não encontrada'; end if;

  if ch.cliente_id is not null then
    update agendamentos set status = 'cancelado', observacoes = coalesce(observacoes || ' · ', '') || 'Chopeira recolhida'
     where chopeira_id = p_chopeira and status = 'agendado';
  end if;
  perform set_config('app.motivo', coalesce(p_obs, ''), true);
  update chopeiras set status = p_status where id = p_chopeira returning * into ch;
  return ch;
end $$;

-- Vendedor agenda assepsia em 3 toques: cliente → data → confirmar
create or replace function solicitar_assepsia(p_cliente uuid, p_data date, p_chopeira uuid default null, p_obs text default null)
returns agendamentos
language plpgsql security invoker set search_path = public as $$
declare a agendamentos;
begin
  insert into agendamentos (cliente_id, chopeira_id, tipo, data_prevista, observacoes)
  values (p_cliente, p_chopeira, 'assepsia', p_data, p_obs)
  returning * into a;
  return a;
end $$;

-- =====================================================================
-- Views (security_invoker: respeitam o RLS de quem consulta)
-- =====================================================================
create view v_agendamentos with (security_invoker = true) as
select a.*,
       case when a.status = 'agendado' and a.data_prevista < hoje_br() then 'atrasado'::status_agendamento
            else a.status end                                 as status_efetivo,
       (a.data_prevista - hoje_br())                          as dias_para_vencer,
       c.nome as cliente_nome, c.cidade, c.endereco, c.telefone as cliente_telefone, c.contato,
       c.vendedor_id, v.nome as vendedor_nome, v.telefone as vendedor_telefone,
       ch.codigo as chopeira_codigo,
       t.nome as tecnico_nome, t.telefone as tecnico_telefone
  from agendamentos a
  join clientes c on c.id = a.cliente_id
  left join usuarios v on v.id = c.vendedor_id
  left join chopeiras ch on ch.id = a.chopeira_id
  left join usuarios t on t.id = a.tecnico_id;

create view v_clientes with (security_invoker = true) as
select c.*,
       v.nome as vendedor_nome,
       (select count(*) from chopeiras ch where ch.cliente_id = c.id) as qtd_chopeiras,
       (select max(realizado_em) from servicos s where s.cliente_id = c.id and s.tipo = 'assepsia') as ultima_assepsia,
       (select max(realizado_em) from servicos s where s.cliente_id = c.id and s.tipo = 'manutencao_preventiva') as ultima_preventiva,
       (select min(data_prevista) from agendamentos a where a.cliente_id = c.id and a.status = 'agendado' and a.tipo = 'assepsia') as proxima_assepsia,
       (select min(data_prevista) from agendamentos a where a.cliente_id = c.id and a.status = 'agendado' and a.tipo = 'manutencao_preventiva') as proxima_preventiva,
       case
         when exists (select 1 from agendamentos a where a.cliente_id = c.id and a.status = 'agendado'
                       and a.tipo in ('assepsia','manutencao_preventiva') and a.data_prevista < hoje_br()) then 'atrasado'
         when exists (select 1 from agendamentos a where a.cliente_id = c.id and a.status = 'agendado'
                       and a.tipo in ('assepsia','manutencao_preventiva') and a.data_prevista <= hoje_br() + 7) then 'a_vencer'
         else 'em_dia'
       end as situacao,
       coalesce((select max(hoje_br() - a.data_prevista) from agendamentos a
                  where a.cliente_id = c.id and a.status = 'agendado' and a.data_prevista < hoje_br()), 0) as dias_atraso
  from clientes c
  left join usuarios v on v.id = c.vendedor_id;

create view v_chopeiras with (security_invoker = true) as
select ch.*, m.nome as modelo_nome, c.nome as cliente_nome, c.cidade as cliente_cidade
  from chopeiras ch
  left join modelos m on m.id = ch.modelo_id
  left join clientes c on c.id = ch.cliente_id;

-- Estoque disponível por combinação marca × voltagem × vias
create view v_estoque_combinacoes with (security_invoker = true) as
select marca, voltagem, vias,
       count(*) filter (where status = 'disponivel') as disponiveis,
       count(*) filter (where status = 'em_cliente') as em_cliente,
       count(*) filter (where status = 'em_manutencao') as em_manutencao,
       count(*) filter (where status = 'reservada') as reservadas,
       count(*) filter (where status <> 'baixada') as total
  from chopeiras where ativo
 group by marca, voltagem, vias;

create view v_servicos with (security_invoker = true) as
select s.*, c.nome as cliente_nome, c.cidade, c.vendedor_id, v.nome as vendedor_nome,
       t.nome as tecnico_nome, ch.codigo as chopeira_codigo
  from servicos s
  join clientes c on c.id = s.cliente_id
  left join usuarios v on v.id = c.vendedor_id
  left join usuarios t on t.id = s.tecnico_id
  left join chopeiras ch on ch.id = s.chopeira_id;

create view v_historico_status with (security_invoker = true) as
select h.*, u.nome as usuario_nome, ca.nome as cliente_anterior_nome, cn.nome as cliente_novo_nome
  from historico_status h
  left join usuarios u on u.id = h.criado_por
  left join clientes ca on ca.id = h.cliente_anterior
  left join clientes cn on cn.id = h.cliente_novo;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table usuarios         enable row level security;
alter table modelos          enable row level security;
alter table clientes         enable row level security;
alter table chopeiras        enable row level security;
alter table historico_status enable row level security;
alter table agendamentos     enable row level security;
alter table servicos         enable row level security;

-- Função auxiliar: o cliente é da carteira do vendedor logado?
create or replace function cliente_da_minha_carteira(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from clientes where id = p_cliente and vendedor_id = auth.uid())
$$;

-- usuarios: todos autenticados veem a equipe; só o gestor cria/edita; cada um edita nome/telefone
create policy usuarios_select on usuarios for select to authenticated using (meu_perfil() is not null);
create policy usuarios_insert on usuarios for insert to authenticated with check (eh_gestor());
create policy usuarios_update on usuarios for update to authenticated
  using (eh_gestor() or id = auth.uid()) with check (eh_gestor() or id = auth.uid());

-- modelos: todos leem; gestor escreve
create policy modelos_select on modelos for select to authenticated using (meu_perfil() is not null);
create policy modelos_write  on modelos for all    to authenticated using (eh_gestor()) with check (eh_gestor());

-- clientes: gestor e técnico veem todos; vendedor só a carteira
create policy clientes_select on clientes for select to authenticated
  using (eh_gestor_ou_tecnico() or vendedor_id = auth.uid());
create policy clientes_insert on clientes for insert to authenticated
  with check (eh_gestor() or (meu_perfil() = 'vendedor' and vendedor_id = auth.uid()));
create policy clientes_update on clientes for update to authenticated
  using (eh_gestor() or (meu_perfil() = 'vendedor' and vendedor_id = auth.uid()))
  with check (eh_gestor() or (meu_perfil() = 'vendedor' and vendedor_id = auth.uid()));
create policy clientes_delete on clientes for delete to authenticated using (eh_gestor());

-- chopeiras: todos veem o estoque; gestor cadastra; gestor e técnico alteram
create policy chopeiras_select on chopeiras for select to authenticated using (meu_perfil() is not null);
create policy chopeiras_insert on chopeiras for insert to authenticated with check (eh_gestor());
create policy chopeiras_update on chopeiras for update to authenticated
  using (eh_gestor_ou_tecnico()) with check (eh_gestor_ou_tecnico());
create policy chopeiras_delete on chopeiras for delete to authenticated using (eh_gestor());

-- histórico: leitura para todos; escrita só pelo trigger (security definer)
create policy historico_select on historico_status for select to authenticated using (meu_perfil() is not null);

-- agendamentos
create policy agendamentos_select on agendamentos for select to authenticated
  using (eh_gestor_ou_tecnico() or cliente_da_minha_carteira(cliente_id));
create policy agendamentos_insert on agendamentos for insert to authenticated
  with check (
    eh_gestor_ou_tecnico()
    or (meu_perfil() = 'vendedor' and tipo = 'assepsia' and cliente_da_minha_carteira(cliente_id))
  );
create policy agendamentos_update on agendamentos for update to authenticated
  using (eh_gestor_ou_tecnico() or (meu_perfil() = 'vendedor' and cliente_da_minha_carteira(cliente_id) and status = 'agendado'))
  with check (eh_gestor_ou_tecnico() or (meu_perfil() = 'vendedor' and cliente_da_minha_carteira(cliente_id) and status in ('agendado','cancelado')));
create policy agendamentos_delete on agendamentos for delete to authenticated using (eh_gestor());

-- servicos: técnico e gestor registram; vendedor vê dos seus clientes
create policy servicos_select on servicos for select to authenticated
  using (eh_gestor_ou_tecnico() or cliente_da_minha_carteira(cliente_id));
create policy servicos_insert on servicos for insert to authenticated
  with check (eh_gestor() or (eh_tecnico() and tecnico_id = auth.uid()));
create policy servicos_update on servicos for update to authenticated
  using (eh_gestor() or (eh_tecnico() and tecnico_id = auth.uid()))
  with check (eh_gestor() or (eh_tecnico() and tecnico_id = auth.uid()));

-- Permissões básicas (o Supabase já concede ao role authenticated; explícito por clareza)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke insert, update, delete on historico_status from authenticated;
