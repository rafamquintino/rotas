-- Usuários e histórico para o modo demonstração (senha de todos: demo1234)
alter table auth.users add column if not exists senha text;
create unique index if not exists users_email_uq on auth.users (lower(email));

insert into auth.users (id, email, raw_user_meta_data, senha) values
  ('00000000-0000-0000-0000-0000000000a1', 'gestor@demo.com',   '{"nome":"Ana Gonçalves","telefone":"35999990101"}', 'demo1234'),
  ('00000000-0000-0000-0000-0000000000b1', 'vendedor@demo.com', '{"nome":"Bruno Vendas","perfil":"vendedor","telefone":"35999990102","cidades":"Poços de Caldas"}', 'demo1234'),
  ('00000000-0000-0000-0000-0000000000b2', 'vendedora@demo.com','{"nome":"Duda Comercial","perfil":"vendedor","telefone":"35999990103","cidades":"Andradas, Caldas, São João da Boa Vista, Botelhos"}', 'demo1234'),
  ('00000000-0000-0000-0000-0000000000c1', 'tecnico@demo.com',  '{"nome":"Caio Técnico","perfil":"tecnico","telefone":"35999990104","cidades":"Poços de Caldas, Andradas, Caldas, Botelhos, São João da Boa Vista"}', 'demo1234');

update clientes set vendedor_id = '00000000-0000-0000-0000-0000000000b1' where cidade = 'Poços de Caldas';
update clientes set vendedor_id = '00000000-0000-0000-0000-0000000000b2' where cidade <> 'Poços de Caldas';

-- Histórico: serviços realizados no passado (inseridos direto, sem disparar o recálculo da agenda)
alter table servicos disable trigger servicos_concluido;
insert into servicos (tipo, chopeira_id, cliente_id, tecnico_id, realizado_em, checklist, observacoes, criado_por)
select t.tipo::tipo_servico, ch.id, ch.cliente_id, '00000000-0000-0000-0000-0000000000c1',
       now() - make_interval(days => t.dias), '[{"item":"Linhas e serpentina higienizadas","ok":true},{"item":"Teste de extração e espuma","ok":true}]',
       t.obs, '00000000-0000-0000-0000-0000000000c1'
  from chopeiras ch
 cross join (values ('assepsia', 16, 'Tudo ok'), ('assepsia', 31, null), ('manutencao_preventiva', 60, 'Troca da borracha da torneira')) t(tipo, dias, obs)
 where ch.status = 'em_cliente' and ch.data_entrada_cliente < (now() - make_interval(days => t.dias))::date;
alter table servicos enable trigger servicos_concluido;
