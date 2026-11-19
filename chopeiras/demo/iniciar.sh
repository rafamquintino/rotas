#!/usr/bin/env bash
# Sobe o app em MODO DEMONSTRAÇÃO, sem Supabase: Postgres local + servidor que imita o Supabase.
# Uso: bash demo/iniciar.sh   → abre em http://localhost:3000  (logins na tela / README)
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
DADOS="${DEMO_DADOS:-$RAIZ/demo/.dados}"
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
PGPORTA=55433
RUN=""; [ "$(id -u)" = "0" ] && RUN="runuser -u nobody --"
mkdir -p "$DADOS"; [ "$(id -u)" = "0" ] && chown nobody "$DADOS"

if [ ! -d "$DADOS/pg" ]; then
  $RUN "$BIN/initdb" -D "$DADOS/pg" -U postgres -A trust >/dev/null
  NOVO=1
fi
$RUN "$BIN/pg_ctl" -D "$DADOS/pg" -o "-p $PGPORTA -k $DADOS -c listen_addresses=localhost -c timezone=UTC" -l "$DADOS/pg.log" status >/dev/null 2>&1 \
  || $RUN "$BIN/pg_ctl" -D "$DADOS/pg" -o "-p $PGPORTA -k $DADOS -c listen_addresses=localhost -c timezone=UTC" -l "$DADOS/pg.log" -w start >/dev/null
PSQL="psql -h localhost -p $PGPORTA -U postgres -v ON_ERROR_STOP=1 -q"
if [ "${NOVO:-}" = "1" ]; then
  $PSQL -c "create database demo"
  $PSQL -d demo -f "$RAIZ/supabase/test/stub_supabase.sql"
  for f in "$RAIZ"/supabase/migrations/*.sql; do $PSQL -d demo -f "$f"; done
  $PSQL -d demo -f "$RAIZ/supabase/seed.sql"
  $PSQL -d demo -f "$RAIZ/demo/dados-demo.sql"
  echo "Banco de demonstração criado."
fi

export NEXT_PUBLIC_SUPABASE_URL=mesma-origem
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(node "$RAIZ/demo/jwt.mjs" anon)"
export SUPABASE_SERVICE_ROLE_KEY="$(node "$RAIZ/demo/jwt.mjs" servico)"
export SUPABASE_URL_INTERNA=http://127.0.0.1:${PORTA:-3000}
export CRON_SECRET=demo
export DATABASE_URL="postgres://postgres@localhost:$PGPORTA/demo"
export NEXT_TELEMETRY_DISABLED=1
cd "$RAIZ"
[ -f .next/DEMO ] || { npx next build; touch .next/DEMO; }
npx next start -p 3001 &
exec node demo/supabase-falso.mjs
