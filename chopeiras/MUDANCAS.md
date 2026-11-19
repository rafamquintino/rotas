# Lista de mudanças – Controle de Chopeiras

Pedidos de ajuste no sistema. Cada item vira um pull request quando for feito.

## Pendentes

### 1. "Código" passa a se chamar **Patrimônio**
- Trocar o nome em todas as telas, filtros, busca, relatórios, CSV e importação.
- Formato: **4 números** (ex.: `0123`), igual à etiqueta da chopeira. Sai o prefixo `CH-`.
- **Não obrigatório**: nem todas as chopeiras têm etiqueta ainda (as etiquetas estão sendo colocadas).
- A definir: como identificar na tela as chopeiras que ainda não têm patrimônio.

### 2. Leitura do código de barras do patrimônio pela câmera do celular
- Botão "Ler patrimônio" que abre a câmera e reconhece a etiqueta.
- Onde usar: busca do Estoque (abre a ficha da chopeira), envio para cliente e registro de serviço (confirma que é a chopeira certa).
- Etiqueta conferida (foto de 19/11/2026): **Code 128**, e as barras contêm o mesmo número impresso (ex.: `0878`).
- Funcionar no Android (Chrome) e no iPhone (Safari). O iPhone não tem leitor de código de barras nativo no navegador,
  então o app precisa de um leitor próprio (biblioteca leve, carregada só quando o botão é tocado).
- A foto de teste estava pouco nítida e só foi lida depois de recortada: na tela de leitura, mostrar uma moldura para
  enquadrar a etiqueta, ligar a lanterna e oferecer a opção de digitar o número.

### 3. Até 5 fotos no cadastro da chopeira
- Poder anexar até 5 fotos já no cadastro (hoje as fotos só entram depois, pela ficha).
- Objetivo: reconhecer a chopeira pelas fotos e registrar o estado dela.
- A definir: se, além das fotos, entra um campo de **condição** (ex.: ótima, boa, regular, ruim).

### 4. Dois tipos de saída da chopeira: **Alocação** e **Aluguel (evento)**
O sistema controla três coisas: **assepsia**, **alocação** (fixa no cliente, para revenda) e **aluguel**
(evento, casamento, festa, normalmente fim de semana). Objetivo principal: os **vendedores saberem quais e
quantas chopeiras estão disponíveis**. Na ficha da chopeira, dois botões: **"Alocar em cliente"** (o atual
"Enviar para cliente") e **"Alugar"**:

- **Alocação** (fixa, em comodato): fica no cliente sem data para voltar. O contrato de comodato **não** entra no
  sistema. É aqui que existe a **assepsia** recorrente (e a preventiva), pela frequência do cliente, porque é quando
  a chopeira está em uso no cliente.
- **Aluguel / evento** (temporário, botão próprio "Alugar"): ex.: sai na sexta, volta na segunda.
  - Informar **data de saída** e **data prevista de volta**.
  - **Sem assepsia** e sem preventiva recorrente.
  - **Sem cliente**: o aluguel não pede cadastro de cliente. Só marca que a chopeira está alugada, com as datas
    (e um campo de observação opcional, ex.: "Casamento sábado").
  - **Reserva antecipada**: pode reservar hoje para um evento futuro. A chopeira fica bloqueada nessas datas e o
    sistema avisa se ela já estiver alugada/reservada no período.
  - **Sem valor de aluguel, caução ou contrato** no sistema.
  - **Sem logística no sistema**: não há agenda de entrega/retirada nem perfil novo. Só um alerta discreto se a
    data prevista de volta passou e a chopeira ainda consta como alugada.
- **Volta do aluguel → "Em limpeza" → técnico aponta "Pronta"**
  - Quando a chopeira volta, registra-se a devolução (botão "Devolver" que já existe) e ela entra em
    **"Em limpeza"**: **não conta como disponível** para os vendedores. Depois de "Pronta", fica disponível de novo
    tanto para **alocação** quanto para **aluguel**.
  - O técnico vê a lista **"Chopeiras para limpar"** e, depois de limpar, aponta **"Pronta"** (fica no histórico
    quem limpou e quando). Aí ela volta a contar como disponível.
  - Se achar defeito, manda para **Em manutenção** em vez de "Pronta".
  - Alerta no painel para chopeira parada em limpeza há muitos dias.
- Painel e estoque mostram separado: **Disponíveis**, **Em cliente (alocação)**, **Em aluguel**,
  **Reservadas para evento**, **Em limpeza** e **Em manutenção**.
- Relatórios: ocupação por alocação e por aluguel; quantidade de aluguéis no período.

### 5. Apagar os dados de exemplo
- Remover as 28 chopeiras e os 10 clientes de exemplo (CH-0001…) quando entrarem os dados reais.

## Feitas
- Velocidade: servidor em São Paulo e menos idas ao banco (PR #6).
