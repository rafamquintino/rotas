-- Testes de regras de negócio e RLS. Cada bloco falha com exceção se a regra quebrar.
\set QUIET on

-- Usuários (o primeiro vira gestor pelo trigger)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'gestor@g.com', '{"nome":"Gestora Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'vend1@g.com',  '{"nome":"Vendedor Bruno","perfil":"vendedor","telefone":"35988880001"}'),
  ('00000000-0000-0000-0000-00000000000c', 'tec@g.com',    '{"nome":"Técnico Caio","perfil":"tecnico","cidades":"Poços de Caldas, Andradas","telefone":"35988880002"}'),
  ('00000000-0000-0000-0000-00000000000d', 'vend2@g.com',  '{"nome":"Vendedora Duda","perfil":"vendedor"}');

do $$ begin
  assert (select perfil from usuarios where email = 'gestor@g.com') = 'gestor', 'primeiro usuário deve ser gestor';
  assert (select perfil from usuarios where email = 'tec@g.com') = 'tecnico', 'perfil via metadata';
  assert (select cidades from usuarios where email = 'tec@g.com') = array['Poços de Caldas','Andradas'], 'cidades via metadata';
end $$;

update clientes set vendedor_id = '00000000-0000-0000-0000-00000000000b' where cidade = 'Poços de Caldas';
update clientes set vendedor_id = '00000000-0000-0000-0000-00000000000d' where cidade <> 'Poços de Caldas';

-- ===================== VENDEDOR =====================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);

do $$
declare n int; cid uuid; outro uuid;
begin
  select count(*) into n from clientes;
  assert n = 4, 'vendedor deve ver só os 4 clientes da carteira, viu ' || n;
  select count(*) into n from chopeiras;
  assert n = 28, 'vendedor vê todo o estoque';
  select count(*) into n from v_agendamentos where cidade <> 'Poços de Caldas';
  assert n = 0, 'vendedor não vê agenda de outra carteira';

  select id into cid from clientes limit 1;
  perform solicitar_assepsia(cid, hoje_br() + 2);

  -- não pode agendar para cliente de outra carteira (não enxerga, mas tenta pelo id)
  reset role;
  select id into outro from clientes where cidade = 'Andradas' limit 1;
  set role authenticated;
  begin
    perform solicitar_assepsia(outro, hoje_br() + 2);
    raise exception 'FALHA: vendedor agendou cliente de outra carteira';
  exception when insufficient_privilege then null; end;

  -- não pode movimentar chopeira
  begin
    perform enviar_para_cliente((select id from chopeiras where status = 'disponivel' limit 1), cid);
    raise exception 'FALHA: vendedor movimentou chopeira';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- update direto em chopeira não afeta nada (RLS)
  update chopeiras set status = 'baixada';
  get diagnostics n = row_count;
  assert n = 0, 'vendedor não altera chopeira';

  -- não pode registrar serviço
  begin
    insert into servicos (tipo, cliente_id, tecnico_id) values ('assepsia', cid, auth.uid());
    raise exception 'FALHA: vendedor registrou serviço';
  exception when insufficient_privilege then null; end;

  -- não pode passar cliente para outro vendedor
  begin
    update clientes set vendedor_id = '00000000-0000-0000-0000-00000000000d' where id = cid;
    raise exception 'FALHA: vendedor transferiu cliente';
  exception when insufficient_privilege then null; end;

  -- não pode virar gestor
  begin
    update usuarios set perfil = 'gestor' where id = auth.uid();
    raise exception 'FALHA: vendedor mudou o próprio perfil';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- histórico não pode ser forjado
  begin
    insert into historico_status (chopeira_id, status_novo) values ((select id from chopeiras limit 1), 'baixada');
    raise exception 'FALHA: histórico forjado';
  exception when insufficient_privilege then null; end;
end $$;

-- ===================== TÉCNICO =====================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);

do $$
declare n int; ch chopeiras; c_id uuid; disp_antes int; disp_depois int; prox date; s_id uuid := gen_random_uuid();
begin
  select count(*) into n from clientes;
  assert n = 10, 'técnico vê todos os clientes';

  select count(*) into disp_antes from chopeiras where status = 'disponivel';
  select id into c_id from clientes where nome = 'Bar do Zé';
  select * into ch from chopeiras where status = 'disponivel' order by codigo limit 1;
  perform enviar_para_cliente(ch.id, c_id);
  select count(*) into disp_depois from chopeiras where status = 'disponivel';
  assert disp_depois = disp_antes - 1, 'estoque disponível diminui na hora';

  -- não pode enviar a mesma chopeira para outro cliente
  begin
    perform enviar_para_cliente(ch.id, (select id from clientes where nome = 'Empório Serra'));
    raise exception 'FALHA: chopeira em dois clientes';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  select count(*) into n from historico_status where chopeira_id = ch.id;
  assert n = 2, 'cadastro + envio no histórico, achou ' || n;
  assert (select criado_por from historico_status where chopeira_id = ch.id order by id desc limit 1) = auth.uid(), 'histórico guarda quem';

  -- agenda inicial gerada
  select count(*) into n from agendamentos where chopeira_id = ch.id and status = 'agendado';
  assert n = 2, 'assepsia + preventiva agendadas';

  -- concluir assepsia recalcula a próxima pela frequência do cliente (15 dias)
  insert into servicos (id, tipo, chopeira_id, cliente_id, checklist)
  values (s_id, 'assepsia', ch.id, c_id, '[{"item":"Limpeza das linhas","ok":true}]');
  select data_prevista into prox from agendamentos
   where chopeira_id = ch.id and tipo = 'assepsia' and status = 'agendado';
  assert prox = hoje_br() + 15, 'próxima assepsia = hoje + 15, foi ' || prox;
  assert (select count(*) from agendamentos where chopeira_id = ch.id and tipo = 'assepsia' and status = 'realizado') = 1,
    'agendamento anterior marcado como realizado';

  -- sync offline repetido não duplica (idempotência por id)
  insert into servicos (id, tipo, chopeira_id, cliente_id) values (s_id, 'assepsia', ch.id, c_id)
  on conflict (id) do nothing;
  assert (select count(*) from servicos where id = s_id) = 1, 'idempotente';

  -- técnico não altera ficha técnica
  begin
    update chopeiras set voltagem = case when voltagem = '110V' then '220V'::voltagem_tipo else '110V' end where id = ch.id;
    raise exception 'FALHA: técnico alterou voltagem';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- técnico não dá baixa
  begin
    perform alterar_status_chopeira(ch.id, 'baixada');
    raise exception 'FALHA: técnico deu baixa';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- manutenção e volta
  perform alterar_status_chopeira(ch.id, 'em_manutencao', 'Vazamento');
  assert (select cliente_id from chopeiras where id = ch.id) is null, 'sai do cliente ao ir p/ manutenção';
  assert (select count(*) from agendamentos where chopeira_id = ch.id and status = 'agendado') = 0, 'agenda cancelada';
  perform devolver_ao_estoque(ch.id);
  assert (select status from chopeiras where id = ch.id) = 'disponivel', 'voltou';
  assert (select count(*) from historico_status where chopeira_id = ch.id) = 4, 'toda mudança no histórico';

  -- técnico não registra serviço em nome de outro
  begin
    insert into servicos (tipo, cliente_id, tecnico_id) values ('assepsia', c_id, '00000000-0000-0000-0000-00000000000a');
    raise exception 'FALHA: serviço em nome de outro técnico';
  exception when insufficient_privilege then null; end;
end $$;

-- ===================== GESTOR =====================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$
declare n int; ch_id uuid; c_id uuid;
begin
  -- exclusão bloqueada com histórico
  select chopeira_id into ch_id from servicos limit 1;
  begin
    delete from chopeiras where id = ch_id;
    raise exception 'FALHA: excluiu chopeira com histórico';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
  select cliente_id into c_id from servicos limit 1;
  begin
    delete from clientes where id = c_id;
    raise exception 'FALHA: excluiu cliente com histórico';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  -- chopeira sem histórico pode ser excluída
  insert into chopeiras (marca, voltagem, vias) values ('Gorillaz', '110V', 1) returning id into ch_id;
  delete from chopeiras where id = ch_id;
  get diagnostics n = row_count;
  assert n = 1, 'chopeira nova sem histórico pode ser excluída';

  -- capacidade editável por modelo propaga
  update modelos set capacidade_lph = 999 where nome = 'Gorillaz Pro 2V';
  assert (select bool_and(capacidade_lph = 999) from chopeiras where modelo_id = (select id from modelos where nome = 'Gorillaz Pro 2V')), 'capacidade propagada';

  -- código gerado automaticamente
  assert (select bool_and(codigo ~ '^CH-\d{4}$') from chopeiras), 'código CH-0001';

  -- views
  select count(*) into n from v_clientes where situacao = 'atrasado';
  assert n > 0, 'seed gera atrasados';
  select sum(disponiveis) into n from v_estoque_combinacoes;
  assert n = (select count(*) from chopeiras where status = 'disponivel'), 'combinações batem com disponíveis';

  -- usuário vê criado_em/atualizado_em
  update clientes set telefone = '0' where id = c_id;
  assert (select atualizado_em > criado_em from clientes where id = c_id), 'atualizado_em';

  -- gestor muda perfil
  update usuarios set perfil = 'tecnico' where email = 'vend2@g.com';
  update usuarios set perfil = 'vendedor' where email = 'vend2@g.com';
end $$;

reset role;
\echo 'Todos os testes de banco passaram'
