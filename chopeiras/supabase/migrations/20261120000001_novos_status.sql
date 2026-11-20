-- Mudanças de 20/11/2026 – parte 1 de 2 (rode antes da parte 2)
-- Novos status e tipos. Fica num arquivo separado porque o Postgres só deixa usar
-- um valor novo de enum depois que a transação que o criou termina.
alter type status_chopeira add value if not exists 'em_aluguel' after 'em_cliente';
alter type status_chopeira add value if not exists 'em_limpeza' after 'em_manutencao';
alter type tipo_servico   add value if not exists 'limpeza';
create type condicao_chopeira as enum ('otima', 'boa', 'regular', 'ruim');
create type status_aluguel as enum ('reservado', 'em_andamento', 'devolvido', 'cancelado');
