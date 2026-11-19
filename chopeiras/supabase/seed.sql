-- Dados de demonstração (opcional). Rode depois das migrações.
-- Usuários NÃO são criados aqui: crie pelo painel do Supabase (o primeiro vira gestor)
-- e depois pela tela Cadastros › Usuários.

insert into modelos (nome, marca, vias, capacidade_lph) values
  ('Gorillaz Compacta 1V', 'Gorillaz', 1, 50),
  ('Gorillaz Pro 2V',      'Gorillaz', 2, 100),
  ('Gorillaz Pro 3V',      'Gorillaz', 3, 150),
  ('Gonçalves Eventos 1V', 'Gonçalves', 1, 60),
  ('Gonçalves Bar 2V',     'Gonçalves', 2, 120)
on conflict (nome) do nothing;

insert into clientes (nome, cidade, endereco, contato, telefone, tipo, freq_assepsia_dias, freq_manutencao_dias) values
  ('Bar do Zé',              'Poços de Caldas', 'Rua Assis Figueiredo, 1020', 'José',    '35999990001', 'bar', 15, 90),
  ('Empório Serra',          'Poços de Caldas', 'Av. João Pinheiro, 455',     'Marta',   '35999990002', 'mercado', 15, 90),
  ('Restaurante Fonte',      'Poços de Caldas', 'Rua Prefeito Chagas, 210',   'Paulo',   '35999990003', 'restaurante', 10, 90),
  ('Hotel Thermas',          'Poços de Caldas', 'Praça Pedro Sanches, 1',     'Recepção','35999990004', 'hotel', 15, 60),
  ('Boteco da Praça',        'Andradas',        'Praça 22 de Fevereiro, 30',  'Rita',    '35999990005', 'bar', 15, 90),
  ('Cantina Andradense',     'Andradas',        'Rua Cel. Oliveira, 88',      'Beto',    '35999990006', 'restaurante', 15, 90),
  ('Choperia Mantiqueira',   'Caldas',          'Rua Bom Jesus, 15',          'Lia',     '35999990007', 'bar', 7, 90),
  ('Mercado Bom Preço',      'São João da Boa Vista', 'Av. Dona Gertrudes, 900', 'Caio', '19999990008', 'mercado', 15, 120),
  ('Pub Vila Rica',          'São João da Boa Vista', 'Rua Getúlio Vargas, 77',  'Nina', '19999990009', 'bar', 15, 90),
  ('Pousada do Lago',        'Botelhos',        'Estrada do Lago, km 3',      'Sérgio',  '35999990010', 'hotel', 20, 90);

do $$
declare
  m_id uuid; j int; i int := 0; c record; ch_id uuid;
  combos text[][] := array[
    array['Gorillaz','220V','1'], array['Gorillaz','220V','2'], array['Gorillaz','110V','2'],
    array['Gorillaz','220V','3'], array['Gonçalves','220V','1'], array['Gonçalves','110V','1'],
    array['Gonçalves','220V','2']];
begin
  for k in 1..28 loop
    j := 1 + (k % array_length(combos, 1));
    select id into m_id from modelos
     where marca = combos[j][1]::marca_chopeira and vias = combos[j][3]::smallint limit 1;
    insert into chopeiras (numero_serie, modelo_id, marca, voltagem, vias)
    values ('SN' || to_char(2024000 + k, 'FM0000000'), m_id, combos[j][1]::marca_chopeira,
            combos[j][2]::voltagem_tipo, combos[j][3]::smallint);
  end loop;

  -- Instala 1 ou 2 chopeiras em cada cliente, com datas variadas para gerar alertas
  for c in select * from clientes order by nome loop
    i := i + 1;
    for ch_id in select id from chopeiras where status = 'disponivel' order by codigo limit (1 + i % 2) loop
      update chopeiras set status = 'em_cliente', cliente_id = c.id,
             data_entrada_cliente = hoje_br() - (20 + i * 9)
       where id = ch_id;
      insert into agendamentos (cliente_id, chopeira_id, tipo, data_prevista, automatico) values
        (c.id, ch_id, 'assepsia', hoje_br() + (i * 3 - 12), true),
        (c.id, ch_id, 'manutencao_preventiva', hoje_br() + (i * 11 - 40), true);
    end loop;
  end loop;

  update chopeiras set status = 'em_manutencao' where codigo in (select codigo from chopeiras where status = 'disponivel' order by codigo desc limit 2);
  update chopeiras set status = 'reservada'     where codigo = (select codigo from chopeiras where status = 'disponivel' order by codigo desc limit 1);
end $$;
