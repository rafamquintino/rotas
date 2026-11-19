# Lista de mudanças – Controle de Chopeiras

Pedidos de ajuste no sistema. Cada item vira um pull request quando for feito.

## Pendentes

### 1. "Código" passa a se chamar **Patrimônio**
- Trocar o nome em todas as telas, filtros, busca, relatórios, CSV e importação.
- Formato: **4 números** (ex.: `0123`), igual à etiqueta da chopeira. Sai o prefixo `CH-`.
- A definir:
  - O patrimônio sempre vem da etiqueta (preenchimento obrigatório) ou o sistema gera o próximo quando a chopeira não tem etiqueta?
  - O que fazer com as chopeiras já cadastradas no formato `CH-0001`.

### 2. Leitura do código de barras do patrimônio pela câmera do celular
- Botão "Ler patrimônio" que abre a câmera e reconhece a etiqueta.
- Onde usar: busca do Estoque (abre a ficha da chopeira), envio para cliente e registro de serviço (confirma que é a chopeira certa).
- A definir: tipo do código de barras (precisa de uma foto da etiqueta) e se o código de barras contém o mesmo número de 4 dígitos.

## Feitas
- Velocidade: servidor em São Paulo e menos idas ao banco (PR #6).
