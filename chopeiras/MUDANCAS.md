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
- A definir: tipo do código de barras (precisa de uma foto da etiqueta) e se o código de barras contém o mesmo número de 4 dígitos.

### 3. Até 5 fotos no cadastro da chopeira
- Poder anexar até 5 fotos já no cadastro (hoje as fotos só entram depois, pela ficha).
- Objetivo: reconhecer a chopeira pelas fotos e registrar o estado dela.
- A definir: se, além das fotos, entra um campo de **condição** (ex.: ótima, boa, regular, ruim).

### 4. Apagar os dados de exemplo
- Remover as 28 chopeiras e os 10 clientes de exemplo (CH-0001…) quando entrarem os dados reais.

## Feitas
- Velocidade: servidor em São Paulo e menos idas ao banco (PR #6).
