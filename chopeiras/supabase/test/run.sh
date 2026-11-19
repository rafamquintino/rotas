#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica as migrações e roda os testes de regra/RLS.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
TMP=$(mktemp -d)
RUN=""
if [ "$(id -u)" = "0" ]; then chown nobody "$TMP"; RUN="runuser -u nobody --"; fi
PORT=55432
$RUN "$BIN/initdb" -D "$TMP/data" -U postgres >/dev/null
$RUN "$BIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/log" start >/dev/null
trap '$RUN "$BIN/pg_ctl" -D "$TMP/data" stop >/dev/null; rm -rf "$TMP"' EXIT
PSQL="psql -h $TMP -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database t"
$PSQL -d t -f "$DIR/test/stub_supabase.sql"
for f in "$DIR"/migrations/*.sql; do $PSQL -d t -f "$f"; done
$PSQL -d t -f "$DIR/seed.sql"
$PSQL -d t -f "$DIR/test/tests.sql"
echo "OK: migrações, seed e testes passaram"
