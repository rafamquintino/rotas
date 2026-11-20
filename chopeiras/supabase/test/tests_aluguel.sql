-- Testes: patrimônio, aluguel com reserva, conflito de datas, limpeza na volta
\set QUIET on
set role authenticated;

-- ===================== VENDEDOR aluga (sem cliente) =====================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
declare ch uuid; a alugueis; disp_antes int; n int;
begin
  select id into ch from chopeiras where status = 'disponivel' order by codigo limit 1;
  select count(*) into disp_antes from chopeiras where status = 'disponivel';

  -- aluguel para hoje: sai na hora
  a := alugar_chopeira(ch, hoje_br(), hoje_br() + 3, 'Casamento sábado');
  assert a.status = 'em_andamento', 'aluguel de hoje começa na hora: ' || a.status;
  assert (select status from chopeiras where id = ch) = 'em_aluguel', 'chopeira em aluguel';
  assert (select count(*) from chopeiras where status = 'disponivel') = disp_antes - 1, 'disponível diminui';
  assert (select count(*) from agendamentos where chopeira_id = ch and status = 'agendado') = 0, 'aluguel não gera assepsia';

  -- conflito de datas
  begin
    perform alugar_chopeira(ch, hoje_br() + 2, hoje_br() + 5);
    raise exception 'FALHA: aceitou aluguel com datas em conflito';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;

  -- reserva futura sem conflito
  a := alugar_chopeira(ch, hoje_br() + 10, hoje_br() + 12, 'Festa');
  assert a.status = 'reservado', 'reserva futura';

  -- vendedor não pode mexer direto na tabela
  begin
    insert into alugueis (chopeira_id, data_saida, data_volta_prevista) values (ch, hoje_br() + 30, hoje_br() + 31);
    raise exception 'FALHA: insert direto em alugueis';
  exception when insufficient_privilege then null; end;

  -- volta do aluguel → em limpeza (vendedor pode registrar a devolução do aluguel)
  perform devolver_ao_estoque(ch);
  assert (select status from chopeiras where id = ch) = 'em_limpeza', 'volta vai para limpeza';
  assert (select count(*) from chopeiras where status = 'disponivel') = disp_antes - 1, 'em limpeza não conta como disponível';

  -- vendedor não aponta limpeza
  begin
    perform concluir_limpeza(ch, '[]');
    raise exception 'FALHA: vendedor apontou limpeza';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;
end $$;

-- ===================== TÉCNICO limpa =====================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
declare ch uuid; outra uuid; c_id uuid;
begin
  select id into ch from chopeiras where status = 'em_limpeza' limit 1;
  perform concluir_limpeza(ch, '[{"item":"Linhas higienizadas","ok":true}]', 'ok', true);
  assert (select status from chopeiras where id = ch) = 'disponivel', 'pronta volta a disponível';
  assert (select count(*) from servicos where chopeira_id = ch and tipo = 'limpeza' and cliente_id is null) = 1, 'limpeza registrada';
  assert (select motivo from historico_status where chopeira_id = ch order by id desc limit 1) like 'Limpeza concluída%', 'histórico da limpeza';

  -- chopeira com reserva futura não pode ser alocada em cliente
  select id into c_id from clientes where nome = 'Bar do Zé';
  begin
    perform enviar_para_cliente(ch, c_id);
    raise exception 'FALHA: alocou chopeira reservada para evento';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;

  -- chopeira em cliente (alocação) não pode ser alugada
  select id into outra from chopeiras where status = 'em_cliente' limit 1;
  begin
    perform alugar_chopeira(outra, hoje_br() + 1, hoje_br() + 2);
    raise exception 'FALHA: alugou chopeira alocada';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;

  -- patrimônio: 4 números, único, opcional; técnico pode preencher
  update chopeiras set patrimonio = '0878' where id = ch;
  assert (select rotulo from chopeiras where id = ch) = '0878', 'rótulo usa o patrimônio';
  assert (select rotulo from chopeiras where id = outra) like 'S/ patrimônio%', 'sem patrimônio';
  begin
    update chopeiras set patrimonio = '12a' where id = outra;
    raise exception 'FALHA: patrimônio inválido aceito';
  exception when check_violation then null; end;
  begin
    update chopeiras set patrimonio = '0878' where id = outra;
    raise exception 'FALHA: patrimônio repetido';
  exception when unique_violation then null; end;

  -- até 5 fotos
  begin
    update chopeiras set fotos = array['a','b','c','d','e','f'] where id = ch;
    raise exception 'FALHA: 6 fotos';
  exception when check_violation then null; end;
end $$;

-- ===================== Reserva chega na data =====================
reset role;
update alugueis set data_saida = hoje_br(), data_volta_prevista = hoje_br() + 1 where status = 'reservado';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
declare n int;
begin
  n := sincronizar_alugueis();
  assert n = 1, 'reserva do dia sai sozinha: ' || n;
  assert (select count(*) from v_alugueis where status = 'em_andamento') = 1, 'em andamento';
  assert (select count(*) from v_chopeiras where status = 'em_aluguel' and aluguel_volta is not null) = 1, 'view mostra a volta';
end $$;

reset role;
\echo 'Testes de aluguel e limpeza passaram'
