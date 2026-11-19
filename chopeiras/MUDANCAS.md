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

### 5. Dois tipos de saída da chopeira: **Comodato** e **Aluguel (evento)**
Ao "Enviar para cliente", escolher o tipo:

- **Comodato** (definitivo): a chopeira fica no cliente sem data para voltar. É o que o sistema já faz hoje:
  agenda assepsia e preventiva recorrentes pela frequência do cliente. O contrato de comodato **não** entra no sistema;
  só marcar que é comodato.
- **Aluguel / evento** (temporário): ex.: o cliente pega na sexta para um evento e devolve na segunda.
  - Informar **data de saída** e **data de retirada**.
  - A retirada vira um compromisso na agenda (ex.: "Retirar CH-0878 – Bar X – segunda"), aparece nos alertas
    se passar da data e entra nos avisos de WhatsApp do dia anterior.
  - Não gera assepsia/preventiva recorrente (é curto). Ver abaixo se a assepsia é feita na volta.
  - A chopeira aparece como **"Em aluguel"**, separada de "Em cliente (comodato)", nos cards e no estoque.
- Relatórios: separar ocupação por comodato e por aluguel; quantos aluguéis no período.
- A definir:
  - Reserva antecipada: alugar hoje para um evento daqui a 15 dias, bloqueando a chopeira nessas datas
    (o sistema avisa se ela já estiver reservada/alugada no período)?
  - Quem faz a entrega e a retirada (técnico, vendedor ou outra pessoa)?
  - Na volta do aluguel, a assepsia é obrigatória antes de liberar a chopeira para o estoque?
  - Cliente de aluguel é cadastrado igual ao de comodato, ou pode ser um "cliente avulso" (pessoa física, evento)?
  - Valor do aluguel / caução entra no sistema ou fica de fora (como o contrato)?

### 4. Apagar os dados de exemplo
- Remover as 28 chopeiras e os 10 clientes de exemplo (CH-0001…) quando entrarem os dados reais.

## Feitas
- Velocidade: servidor em São Paulo e menos idas ao banco (PR #6).
