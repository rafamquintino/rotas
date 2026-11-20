-- APAGA OS DADOS DE EXEMPLO (criados pelo seed.sql). Rode uma vez no SQL Editor do Supabase.
-- Só remove:
--   • chopeiras com nº de série SN2024001…SN2024028 e SEM patrimônio (se você colou etiqueta numa delas, ela fica);
--   • os 10 clientes de exemplo (conferidos por nome E telefone);
--   • modelos de exemplo que não estiverem em uso;
--   • agendamentos, serviços, aluguéis e histórico ligados a eles.
begin;

create temp table ex_chopeiras on commit drop as
  select id from chopeiras where numero_serie ~ '^SN2024[0-9]{3}$' and patrimonio is null;

create temp table ex_clientes on commit drop as
  select id from clientes where (nome, telefone) in (
    ('Bar do Zé', '35999990001'), ('Empório Serra', '35999990002'), ('Restaurante Fonte', '35999990003'),
    ('Hotel Thermas', '35999990004'), ('Boteco da Praça', '35999990005'), ('Cantina Andradense', '35999990006'),
    ('Choperia Mantiqueira', '35999990007'), ('Mercado Bom Preço', '19999990008'), ('Pub Vila Rica', '19999990009'),
    ('Pousada do Lago', '35999990010'));

-- Chopeira real que estiver alocada num cliente de exemplo volta para o estoque
update chopeiras set status = 'disponivel'
 where cliente_id in (select id from ex_clientes) and id not in (select id from ex_chopeiras);

alter table chopeiras disable trigger chopeiras_bloqueia_exclusao;
alter table clientes  disable trigger clientes_bloqueia_exclusao;

delete from servicos     where chopeira_id in (select id from ex_chopeiras) or cliente_id in (select id from ex_clientes);
delete from agendamentos where chopeira_id in (select id from ex_chopeiras) or cliente_id in (select id from ex_clientes);
delete from alugueis     where chopeira_id in (select id from ex_chopeiras);
delete from historico_status
 where chopeira_id in (select id from ex_chopeiras)
    or cliente_novo in (select id from ex_clientes) or cliente_anterior in (select id from ex_clientes);
delete from chopeiras where id in (select id from ex_chopeiras);
delete from clientes  where id in (select id from ex_clientes);
delete from modelos
 where nome in ('Gorillaz Compacta 1V', 'Gorillaz Pro 2V', 'Gorillaz Pro 3V', 'Gonçalves Eventos 1V', 'Gonçalves Bar 2V')
   and not exists (select 1 from chopeiras c where c.modelo_id = modelos.id);

alter table chopeiras enable trigger chopeiras_bloqueia_exclusao;
alter table clientes  enable trigger clientes_bloqueia_exclusao;

select (select count(*) from chopeiras) as chopeiras_restantes, (select count(*) from clientes) as clientes_restantes;
commit;
