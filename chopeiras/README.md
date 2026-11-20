# Controle de Chopeiras – Cervejaria Gonçalves

App web mobile-first (PWA instalável) para controlar o estoque de chopeiras, onde cada uma está e a agenda de
assepsia e manutenção preventiva por cliente, com histórico completo. Usado por gestor comercial, vendedores e técnicos.

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage, RLS). Deploy na Vercel.

## Implantação (passo a passo)

1. **Supabase**: crie um projeto em supabase.com.
2. **Banco**: no SQL Editor, rode em ordem:
   - `supabase/migrations/20261119000001_schema.sql` (tabelas, regras, views e RLS)
   - `supabase/migrations/20261119000002_storage.sql` (bucket privado `fotos`)
   - opcional: `supabase/seed.sql` (10 clientes e 28 chopeiras de demonstração)

   Com a CLI: `supabase link` e depois `supabase db push`.
3. **Primeiro acesso**: em Authentication › Users › *Add user*, crie o seu usuário com e-mail e senha.
   **O primeiro usuário do sistema vira gestor automaticamente.** Os demais são criados pela tela
   *Mais › Cadastros › Usuários* ou importados por CSV.
4. **Vercel**: importe o repositório, defina *Root Directory* = `chopeiras` e as variáveis do `.env.example`:

   | Variável | Para quê |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | conexão do app |
   | `SUPABASE_SERVICE_ROLE_KEY` | criar usuários e gerar os avisos do cron (só servidor) |
   | `CRON_SECRET` | protege `/api/notificacoes` |
   | `N8N_WEBHOOK_URL` | opcional: para onde o cron envia os avisos |

5. Em Supabase › Authentication › URL Configuration, coloque a URL da Vercel em *Site URL*, e
   `https://SEU-APP.vercel.app/auth/callback` em *Redirect URLs* (para "Esqueci minha senha").

### Atualizar um banco já instalado

Quem já rodou o `instalar.sql` antes **não** roda ele de novo: rode, no SQL Editor e **na ordem**, só as
migrações novas de `supabase/migrations/` (cada arquivo numa execução separada). Exemplo da rodada de 20/11/2026:
1. `20261120000001_novos_status.sql`
2. `20261120000002_aluguel_patrimonio.sql`

Para remover os dados de demonstração criados pelo `seed.sql`: `supabase/apagar_exemplos.sql`.

Rodar local: `cp .env.example .env.local` (preencha), `npm install`, `npm run dev`.

## Ver sem criar conta (modo demonstração)

`bash demo/iniciar.sh` sobe tudo localmente (precisa de Node e PostgreSQL instalados): um Postgres com dados de
exemplo e um servidor que imita o Supabase (`demo/supabase-falso.mjs`, com RLS de verdade). Abra http://localhost:3000.

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Gestor | gestor@demo.com | demo1234 |
| Vendedor | vendedor@demo.com (ou vendedora@demo.com) | demo1234 |
| Técnico | tecnico@demo.com | demo1234 |

Para zerar os dados, apague `demo/.dados`. Só para demonstração: não use em produção.

## Perfis e segurança

As permissões ficam **no banco (RLS + triggers)**, não só na tela:

| | Gestor | Vendedor | Técnico |
| --- | --- | --- | --- |
| Estoque de chopeiras | vê e edita tudo, cadastra, dá baixa | vê | vê, muda status, envia/devolve, fotos |
| Clientes | todos | **só a própria carteira** (vê e edita) | vê todos |
| Agenda | tudo | da carteira; só pode agendar **assepsia** | vê todas |
| Serviços | registra e edita | vê os da carteira | registra (só em seu nome) |
| Usuários e relatórios | sim | não | não |

O técnico não consegue alterar a ficha técnica (marca, voltagem, vias, série…) e ninguém além do gestor muda perfil.
O histórico de status não pode ser escrito diretamente, só pelo trigger.

## Regras de negócio (no banco)

- Uma chopeira só fica em **um** cliente por vez (constraint + RPC `enviar_para_cliente`). Ao enviar, o status vira
  `em_cliente` na hora e já são agendadas a 1ª assepsia e a 1ª preventiva pela frequência do cliente.
- Toda mudança de status/cliente grava em `historico_status` (quem, quando, de → para, motivo).
- "Disponível" = só `status = 'disponivel'`.
- Atrasado = data prevista < hoje (fuso America/Sao_Paulo). A vencer = próximos 7 dias.
- Concluir um serviço fecha o agendamento e **recalcula a próxima data** (data do serviço + frequência do cliente).
  Mudar a frequência do cliente reprograma os agendamentos automáticos pendentes.
- Recolher a chopeira (devolver/manutenção) cancela a agenda pendente dela.
- Chopeira ou cliente com histórico **não pode ser excluído** (trigger); use *Inativar*.
- Todas as tabelas têm `criado_por`, `criado_em`, `atualizado_em` (preenchidos por default/trigger).
- Capacidade (L/h) é cadastrada por modelo; mudar no modelo atualiza as chopeiras do modelo.

## Telas

- **Início**: totais, disponíveis por marca × voltagem × vias, alertas (assepsias atrasadas / a vencer em 7 dias, preventivas vencidas).
- **Estoque**: filtros por marca, voltagem, vias, status e cidade; busca por código ou série; ficha com fotos e
  linha do tempo (status + serviços); botões *Enviar para cliente*, *Devolver ao estoque*, *Enviar para manutenção*.
- **Clientes**: filtros por cidade, vendedor e situação; ficha com chopeiras instaladas, última/próxima assepsia e
  preventiva, histórico, **Abrir no Maps** e WhatsApp.
- **Agenda**: dia / semana / lista, agrupada por cidade (rota do técnico); atrasados entram no dia de hoje.
  Vendedor agenda em 3 toques (cliente → data → confirmar). Técnico toca *Realizar*, marca o checklist, tira fotos
  antes/depois e coleta aceite/assinatura.
- **Relatórios** (gestor): serviços por técnico, cidade e vendedor; clientes mais atrasados; taxa de ocupação; CSV.
- **Cadastros** (gestor): chopeiras, clientes, usuários, modelos e **importação CSV** (com planilha modelo).

## Offline (técnico)

- Serviço registrado sem sinal fica no IndexedDB do aparelho (com as fotos) e é enviado sozinho quando a conexão
  volta (o topo do app mostra "N serviço(s) aguardando envio"). O id é gerado no aparelho, então reenviar não duplica.
- Ao abrir a agenda do dia com internet, o app guarda as telas da rota (formulários e fichas) para abrir sem sinal.
- Fotos são reduzidas no aparelho (máx. 1280 px, JPEG) antes de subir: importante no 4G fraco.

## WhatsApp, n8n e Evolution API

- *Mais › Avisos por WhatsApp*: mensagens prontas (links `wa.me`) para técnicos e vendedores com as assepsias de
  amanhã e as atrasadas, com link do Maps de cada cliente. O técnico de cada cliente é o designado no agendamento,
  senão quem atende aquela cidade.
- `GET /api/notificacoes` (header `Authorization: Bearer $CRON_SECRET`) devolve o mesmo conteúdo em JSON.
  Com `?enviar=1`, por `POST` ou pelo cron da Vercel (`vercel.json`, todo dia às 18h de Brasília), faz POST
  do payload em `N8N_WEBHOOK_URL`. No n8n, para cada item de `notificacoes`, chame a Evolution API:
  `POST /message/sendText/{instancia}` com `{ "number": telefone, "text": mensagem }`.

## Testes

`npm run test:db` sobe um Postgres temporário, aplica migrações e seed com um stub do `auth` do Supabase e
verifica as regras e o RLS de cada perfil (`supabase/test/tests.sql`). Precisa do PostgreSQL instalado.
`npm run typecheck` e `npm run build` validam o app.
