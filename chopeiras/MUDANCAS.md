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

### 5. Dois tipos de saída da chopeira: **Alocação** e **Aluguel (evento)**
O sistema controla três coisas: **assepsia**, **alocação** (fixa no cliente, para revenda) e **aluguel**
(evento, casamento, festa, normalmente fim de semana). Ao "Enviar para cliente", escolher o tipo:

- **Alocação** (fixa, em comodato): a chopeira fica no cliente sem data para voltar. O contrato de comodato
  **não** entra no sistema; só marcar como alocação. É aqui que existe a **assepsia** recorrente (e a preventiva),
  pela frequência do cliente, porque é quando a chopeira está em uso no cliente.
- **Aluguel / evento** (temporário): ex.: sai na sexta, volta na segunda.
  - Informar **data de entrega** e **data de retirada**.
  - **Sem assepsia** e sem preventiva recorrente.
  - **Reserva antecipada**: pode alugar hoje para um evento futuro. A chopeira fica bloqueada nessas datas e o
    sistema avisa se ela já estiver alugada/reservada no período (contando também o tempo de indisponibilidade
    depois da volta, abaixo).
  - **Entrega e retirada são sempre feitas pela Logística**: viram compromissos na agenda da logística, aparecem
    nos alertas se atrasarem e entram nos avisos de WhatsApp do dia anterior.
  - **Cliente simples** para eventos: cadastro rápido só com nome, telefone, cidade e endereço do evento
    (sem vendedor obrigatório e sem frequências).
  - **Sem valor de aluguel, caução ou contrato** no sistema.
  - **Indisponível depois da volta**: quando a chopeira volta do aluguel, fica **indisponível por um tempo**
    (ex.: limpeza e conferência) e só depois volta a contar como disponível. Mostrar "Indisponível até dd/mm"
    no estoque e liberar sozinha na data. A definir: quantos dias (padrão) e se pode ser ajustado em cada volta.
- Novo perfil de usuário **Logística**: vê a agenda de entregas e retiradas (por dia e por cidade, com Maps),
  marca "Entregue" e "Retirada" (isso muda o status da chopeira) e vê o estoque. Não mexe em clientes nem em assepsia.
- Painel e estoque separam **Em cliente (alocação)**, **Em aluguel**, **Reservada para evento** e
  **Indisponível (retorno)**.
- Relatórios: ocupação por alocação e por aluguel; quantidade de aluguéis no período.

### 4. Apagar os dados de exemplo
- Remover as 28 chopeiras e os 10 clientes de exemplo (CH-0001…) quando entrarem os dados reais.

## Feitas
- Velocidade: servidor em São Paulo e menos idas ao banco (PR #6).
