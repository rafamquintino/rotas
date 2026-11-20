# Lista de mudanças – Controle de Chopeiras

Pedidos de ajuste no sistema. Cada item vira um pull request quando for feito.

## Pendentes

(nenhuma)

## Feitas

### Rodada de 20/11/2026
1. **Patrimônio** no lugar de "Código": 4 números, opcional. Sem etiqueta, a chopeira aparece como
   "Sem patrimônio" com o nº de série. Gestor e técnico preenchem pela ficha (campo ou câmera).
2. **Leitura do código de barras** (Code 128) pela câmera: no Estoque (abre a ficha), no cadastro, e para
   conferir a chopeira ao alocar, alugar, limpar e registrar serviço. Leitor nativo no Android e biblioteca
   própria no iPhone; moldura, lanterna e digitação manual.
3. **Até 5 fotos** no cadastro e na ficha (com remoção), e campo de **condição** (ótima, boa, regular, ruim).
4. **Alocação × Aluguel**: botões "Alocar em cliente" e "Alugar". Aluguel sem cliente, com datas, observação
   e reserva antecipada (bloqueia datas em conflito). Na volta: "Em limpeza" até o técnico apontar "Pronta"
   (ou mandar para manutenção). Painel, estoque e relatórios separam alocação, aluguel, reservas e limpeza.
5. **Apagar os exemplos**: `supabase/apagar_exemplos.sql` remove só os dados criados pelo `seed.sql`.

- Velocidade: servidor em São Paulo e menos idas ao banco (PR #6).
