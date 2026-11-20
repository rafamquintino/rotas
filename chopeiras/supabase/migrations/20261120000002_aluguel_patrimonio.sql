-- Mudanças de 20/11/2026 – parte 2 de 2
-- Patrimônio, condição, até 5 fotos, aluguel para eventos (com reserva) e limpeza na volta do aluguel.

-- ---------------------------------------------------------------------
-- Chopeiras: patrimônio (4 números, opcional), condição e limite de 5 fotos
-- ---------------------------------------------------------------------
alter table chopeiras
  add column patrimonio text unique check (patrimonio ~ '^[0-9]{4}$'),
  add column condicao condicao_chopeira,
  add constraint chopeira_max_5_fotos check (cardinality(fotos) <= 5);

-- Como a chopeira aparece nas telas: o patrimônio, ou "S/ patrimônio" + nº de série
alter table chopeiras add column rotulo text generated always as (
  coalesce(patrimonio, 'S/ patrimônio' || coalesce(' · ' || numero_serie, ' · ' || codigo))
) stored;

-- ---------------------------------------------------------------------
-- Serviços: limpeza não tem cliente
-- ---------------------------------------------------------------------
alter table servicos alter column cliente_id drop not null;
alter table servicos add constraint servico_cliente_obrigatorio
  check (tipo = 'limpeza' or cliente_id is not null);

-- ---------------------------------------------------------------------
-- Aluguéis (eventos). Sem cliente: só datas e uma observação.
-- ---------------------------------------------------------------------
create table alugueis (
  id                   uuid primary key default gen_random_uuid(),
  chopeira_id          uuid not null references chopeiras(id),
  data_saida           date not null,
  data_volta_prevista  date not null,
  observacao           text,
  status               status_aluguel not null default 'reservado',
  devolvido_em         timestamptz,
  criado_por           uuid references auth.users(id) default auth.uid(),
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  constraint aluguel_datas check (data_volta_prevista >= data_saida)
);
create index on alugueis (chopeira_id, data_saida) where status in ('reservado', 'em_andamento');
create trigger alugueis_atualizado_em before update on alugueis for each row execute function tg_atualizado_em();

alter table alugueis enable row level security;
create policy alugueis_select on alugueis for select to authenticated using (meu_perfil() is not null);
-- Escrita só pelas funções abaixo (que conferem perfil e conflito de datas)
grant select on alugueis to authenticated;

-- Libera as reservas cuja data de saída chegou: a chopeira passa para "em_aluguel".
-- Chamada pelas telas (painel/estoque) e pelo cron diário; é idempotente.
create or replace function sincronizar_alugueis() returns integer
language plpgsql security definer set search_path = public as $$
declare a record; n integer := 0;
begin
  for a in select al.* from alugueis al join chopeiras ch on ch.id = al.chopeira_id
            where al.status = 'reservado' and al.data_saida <= hoje_br() and ch.status = 'disponivel'
            order by al.data_saida
            for update of al
  loop
    perform set_config('app.motivo', 'Saída para aluguel' || coalesce(' – ' || a.observacao, ''), true);
    update chopeiras set status = 'em_aluguel' where id = a.chopeira_id and status = 'disponivel';
    update alugueis set status = 'em_andamento' where id = a.id;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function alugar_chopeira(p_chopeira uuid, p_saida date, p_volta date, p_obs text default null)
returns alugueis
language plpgsql security definer set search_path = public as $$
declare ch chopeiras; a alugueis; conflito alugueis;
begin
  if meu_perfil() is null then raise exception 'Sem permissão'; end if;
  if p_saida is null or p_volta is null then raise exception 'Informe a data de saída e a de volta'; end if;
  if p_volta < p_saida then raise exception 'A data de volta é antes da data de saída'; end if;
  if p_saida < hoje_br() then raise exception 'A data de saída já passou'; end if;

  select * into ch from chopeiras where id = p_chopeira for update;
  if not found or not ch.ativo then raise exception 'Chopeira não encontrada'; end if;
  if ch.status in ('em_cliente', 'baixada') then
    raise exception 'A chopeira % está "%" e não pode ser alugada', ch.rotulo, ch.status;
  end if;

  -- Conflito com outro aluguel (um aluguel atrasado ocupa até hoje)
  select * into conflito from alugueis
   where chopeira_id = p_chopeira and status in ('reservado', 'em_andamento')
     and daterange(data_saida, greatest(data_volta_prevista, case when status = 'em_andamento' then hoje_br() end), '[]')
         && daterange(p_saida, p_volta, '[]')
   limit 1;
  if found then
    raise exception 'A chopeira % já está % de % a %', ch.rotulo,
      case conflito.status when 'reservado' then 'reservada' else 'alugada' end,
      to_char(conflito.data_saida, 'DD/MM'), to_char(conflito.data_volta_prevista, 'DD/MM');
  end if;

  if p_saida = hoje_br() and ch.status <> 'disponivel' then
    raise exception 'A chopeira % está "%" e não pode sair hoje', ch.rotulo, ch.status;
  end if;

  insert into alugueis (chopeira_id, data_saida, data_volta_prevista, observacao)
  values (p_chopeira, p_saida, p_volta, nullif(trim(p_obs), ''))
  returning * into a;

  perform sincronizar_alugueis();
  select * into a from alugueis where id = a.id;
  return a;
end $$;

create or replace function cancelar_aluguel(p_aluguel uuid) returns alugueis
language plpgsql security definer set search_path = public as $$
declare a alugueis;
begin
  if meu_perfil() is null then raise exception 'Sem permissão'; end if;
  select * into a from alugueis where id = p_aluguel for update;
  if not found then raise exception 'Aluguel não encontrado'; end if;
  if a.status <> 'reservado' then raise exception 'Só reservas que ainda não saíram podem ser canceladas. Use "Devolver".'; end if;
  update alugueis set status = 'cancelado' where id = p_aluguel returning * into a;
  return a;
end $$;

-- ---------------------------------------------------------------------
-- Movimentações (substituem as versões anteriores)
-- ---------------------------------------------------------------------
create or replace function enviar_para_cliente(p_chopeira uuid, p_cliente uuid, p_data date default null, p_obs text default null)
returns chopeiras
language plpgsql security invoker set search_path = public as $$
declare
  ch chopeiras;
  c  clientes;
  r  alugueis;
  v_data date := coalesce(p_data, hoje_br());
begin
  if not eh_gestor_ou_tecnico() then
    raise exception 'Sem permissão para movimentar chopeiras';
  end if;
  select * into ch from chopeiras where id = p_chopeira for update;
  if not found or not ch.ativo then raise exception 'Chopeira não encontrada'; end if;
  if ch.status not in ('disponivel', 'reservada') then
    raise exception 'A chopeira % está "%" e não pode ser alocada', ch.rotulo, ch.status;
  end if;
  select * into r from alugueis where chopeira_id = p_chopeira and status = 'reservado' order by data_saida limit 1;
  if found then
    raise exception 'A chopeira % está reservada para um evento em %. Cancele a reserva ou escolha outra chopeira.',
      ch.rotulo, to_char(r.data_saida, 'DD/MM');
  end if;
  select * into c from clientes where id = p_cliente and ativo;
  if not found then raise exception 'Cliente não encontrado ou inativo'; end if;

  perform set_config('app.motivo', coalesce(p_obs, 'Alocada em ' || c.nome), true);
  update chopeiras set status = 'em_cliente', cliente_id = p_cliente, data_entrada_cliente = v_data
   where id = p_chopeira returning * into ch;

  insert into agendamentos (cliente_id, chopeira_id, tipo, data_prevista, automatico)
  values (p_cliente, p_chopeira, 'assepsia', v_data + c.freq_assepsia_dias, true),
         (p_cliente, p_chopeira, 'manutencao_preventiva', v_data + c.freq_manutencao_dias, true);
  return ch;
end $$;

-- Volta do aluguel vai para "em_limpeza"; volta de cliente/manutenção vai para "disponivel"
create or replace function devolver_ao_estoque(p_chopeira uuid, p_obs text default null)
returns chopeiras
language plpgsql security definer set search_path = public as $$
declare ch chopeiras;
begin
  select * into ch from chopeiras where id = p_chopeira for update;
  if not found then raise exception 'Chopeira não encontrada'; end if;
  -- Devolução de aluguel: qualquer perfil. Demais movimentações: gestor e técnico.
  if ch.status = 'em_aluguel' then
    if meu_perfil() is null then raise exception 'Sem permissão'; end if;
    update alugueis set status = 'devolvido', devolvido_em = now()
     where chopeira_id = p_chopeira and status = 'em_andamento';
    perform set_config('app.motivo', coalesce(p_obs, 'Voltou do aluguel'), true);
    update chopeiras set status = 'em_limpeza' where id = p_chopeira returning * into ch;
    return ch;
  end if;

  if not eh_gestor_ou_tecnico() then raise exception 'Sem permissão para movimentar chopeiras'; end if;
  if ch.status = 'baixada' then raise exception 'Chopeira baixada não volta ao estoque'; end if;
  if ch.status = 'em_limpeza' then raise exception 'Use "Pronta" depois de limpar a chopeira'; end if;
  if ch.cliente_id is not null then
    update agendamentos set status = 'cancelado', observacoes = coalesce(observacoes || ' · ', '') || 'Chopeira recolhida'
     where chopeira_id = p_chopeira and status = 'agendado';
  end if;
  perform set_config('app.motivo', coalesce(p_obs, 'Devolvida ao estoque'), true);
  update chopeiras set status = 'disponivel' where id = p_chopeira returning * into ch;
  perform sincronizar_alugueis();
  return ch;
end $$;

create or replace function alterar_status_chopeira(p_chopeira uuid, p_status status_chopeira, p_obs text default null)
returns chopeiras
language plpgsql security invoker set search_path = public as $$
declare ch chopeiras;
begin
  if not eh_gestor_ou_tecnico() then raise exception 'Sem permissão para alterar status'; end if;
  if p_status = 'em_cliente' then raise exception 'Use "Alocar em cliente"'; end if;
  if p_status = 'em_aluguel' then raise exception 'Use "Alugar"'; end if;
  if p_status = 'baixada' and not eh_gestor() then raise exception 'Apenas o gestor pode dar baixa'; end if;
  select * into ch from chopeiras where id = p_chopeira for update;
  if not found then raise exception 'Chopeira não encontrada'; end if;
  if ch.status = 'em_aluguel' then raise exception 'Registre a devolução do aluguel primeiro'; end if;

  if ch.cliente_id is not null then
    update agendamentos set status = 'cancelado', observacoes = coalesce(observacoes || ' · ', '') || 'Chopeira recolhida'
     where chopeira_id = p_chopeira and status = 'agendado';
  end if;
  if p_status = 'baixada' then
    update alugueis set status = 'cancelado' where chopeira_id = p_chopeira and status = 'reservado';
  end if;
  perform set_config('app.motivo', coalesce(p_obs, ''), true);
  update chopeiras set status = p_status where id = p_chopeira returning * into ch;
  if p_status = 'disponivel' then perform sincronizar_alugueis(); end if;
  return ch;
end $$;

-- Técnico aponta a limpeza: "Pronta" (volta a ficar disponível) ou com defeito (vai para manutenção)
create or replace function concluir_limpeza(p_chopeira uuid, p_checklist jsonb, p_obs text default null, p_pronta boolean default true)
returns chopeiras
language plpgsql security invoker set search_path = public as $$
declare ch chopeiras;
begin
  if not eh_gestor_ou_tecnico() then raise exception 'Apenas técnico ou gestor apontam a limpeza'; end if;
  select * into ch from chopeiras where id = p_chopeira for update;
  if not found then raise exception 'Chopeira não encontrada'; end if;
  if ch.status <> 'em_limpeza' then raise exception 'A chopeira % não está em limpeza', ch.rotulo; end if;

  insert into servicos (tipo, chopeira_id, cliente_id, checklist, observacoes)
  values ('limpeza', p_chopeira, null, coalesce(p_checklist, '[]'), nullif(trim(p_obs), ''));

  perform set_config('app.motivo',
    case when p_pronta then 'Limpeza concluída – pronta' else 'Defeito na limpeza' end || coalesce(' – ' || nullif(trim(p_obs), ''), ''), true);
  update chopeiras set status = case when p_pronta then 'disponivel' else 'em_manutencao' end::status_chopeira
   where id = p_chopeira returning * into ch;
  if p_pronta then perform sincronizar_alugueis(); end if;
  return ch;
end $$;

-- Limpeza não gera agenda; o resto continua igual
create or replace function tg_servico_concluido() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c clientes;
  v_freq integer;
  v_data date := (new.realizado_em at time zone 'America/Sao_Paulo')::date;
  v_prox uuid;
begin
  if new.tipo = 'limpeza' or new.cliente_id is null then return new; end if;
  select * into c from clientes where id = new.cliente_id;

  if new.agendamento_id is not null then
    update agendamentos set status = 'realizado' where id = new.agendamento_id and status = 'agendado';
  else
    update agendamentos set status = 'realizado'
     where id = (select id from agendamentos
                  where cliente_id = new.cliente_id and tipo = new.tipo and status = 'agendado'
                    and (chopeira_id is not distinct from new.chopeira_id or chopeira_id is null)
                  order by (chopeira_id is null), data_prevista limit 1);
  end if;

  if new.tipo = 'manutencao_corretiva' then return new; end if;
  v_freq := case new.tipo when 'assepsia' then c.freq_assepsia_dias else c.freq_manutencao_dias end;

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

-- Exclusão: aluguel também conta como histórico
create or replace function tg_bloqueia_exclusao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'chopeiras' then
    if exists (select 1 from historico_status where chopeira_id = old.id and motivo is distinct from 'Cadastro')
       or exists (select 1 from servicos where chopeira_id = old.id)
       or exists (select 1 from agendamentos where chopeira_id = old.id)
       or exists (select 1 from alugueis where chopeira_id = old.id) then
      raise exception 'Chopeira % tem histórico e não pode ser excluída. Use a inativação.', old.rotulo;
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

-- ---------------------------------------------------------------------
-- Views (recriadas com patrimônio, rótulo, aluguel e limpeza)
-- ---------------------------------------------------------------------
drop view if exists v_chopeiras, v_estoque_combinacoes, v_agendamentos, v_servicos;

create view v_chopeiras with (security_invoker = true) as
select ch.*, m.nome as modelo_nome, c.nome as cliente_nome, c.cidade as cliente_cidade,
       al.data_saida as aluguel_saida, al.data_volta_prevista as aluguel_volta, al.observacao as aluguel_obs,
       rs.data_saida as reserva_saida, rs.data_volta_prevista as reserva_volta, rs.observacao as reserva_obs,
       (select max(h.criado_em) from historico_status h where h.chopeira_id = ch.id and h.status_novo = ch.status) as status_desde
  from chopeiras ch
  left join modelos m on m.id = ch.modelo_id
  left join clientes c on c.id = ch.cliente_id
  left join lateral (select * from alugueis a where a.chopeira_id = ch.id and a.status = 'em_andamento' limit 1) al on true
  left join lateral (select * from alugueis a where a.chopeira_id = ch.id and a.status = 'reservado'
                      order by a.data_saida limit 1) rs on true;

create view v_estoque_combinacoes with (security_invoker = true) as
select marca, voltagem, vias,
       count(*) filter (where status = 'disponivel') as disponiveis,
       count(*) filter (where status = 'em_cliente') as em_cliente,
       count(*) filter (where status = 'em_aluguel') as em_aluguel,
       count(*) filter (where status = 'em_limpeza') as em_limpeza,
       count(*) filter (where status = 'em_manutencao') as em_manutencao,
       count(*) filter (where status = 'reservada') as reservadas,
       count(*) filter (where status <> 'baixada') as total
  from chopeiras where ativo
 group by marca, voltagem, vias;

create view v_alugueis with (security_invoker = true) as
select a.*, ch.rotulo, ch.patrimonio, ch.marca, ch.voltagem, ch.vias,
       case when a.status = 'em_andamento' and a.data_volta_prevista < hoje_br() then true else false end as atrasado,
       u.nome as criado_por_nome
  from alugueis a
  join chopeiras ch on ch.id = a.chopeira_id
  left join usuarios u on u.id = a.criado_por;

create view v_agendamentos with (security_invoker = true) as
select a.*,
       case when a.status = 'agendado' and a.data_prevista < hoje_br() then 'atrasado'::status_agendamento
            else a.status end                                 as status_efetivo,
       (a.data_prevista - hoje_br())                          as dias_para_vencer,
       c.nome as cliente_nome, c.cidade, c.endereco, c.telefone as cliente_telefone, c.contato,
       c.vendedor_id, v.nome as vendedor_nome, v.telefone as vendedor_telefone,
       ch.rotulo as chopeira_codigo,
       t.nome as tecnico_nome, t.telefone as tecnico_telefone
  from agendamentos a
  join clientes c on c.id = a.cliente_id
  left join usuarios v on v.id = c.vendedor_id
  left join chopeiras ch on ch.id = a.chopeira_id
  left join usuarios t on t.id = a.tecnico_id;

create view v_servicos with (security_invoker = true) as
select s.*, c.nome as cliente_nome, c.cidade, c.vendedor_id, v.nome as vendedor_nome,
       t.nome as tecnico_nome, ch.rotulo as chopeira_codigo
  from servicos s
  left join clientes c on c.id = s.cliente_id
  left join usuarios v on v.id = c.vendedor_id
  left join usuarios t on t.id = s.tecnico_id
  left join chopeiras ch on ch.id = s.chopeira_id;

grant select on v_chopeiras, v_estoque_combinacoes, v_alugueis, v_agendamentos, v_servicos to authenticated;
grant execute on function sincronizar_alugueis(), alugar_chopeira(uuid, date, date, text), cancelar_aluguel(uuid),
  concluir_limpeza(uuid, jsonb, text, boolean) to authenticated;
