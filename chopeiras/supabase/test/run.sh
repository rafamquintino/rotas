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
for f in "$DIR"/migrations/*.sql; do $PSQL -1 -d t -f "$f"; done
$PSQL -d t -f "$DIR/seed.sql"
$PSQL -d t -f "$DIR/test/tests.sql"
$PSQL -d t -f "$DIR/test/tests_aluguel.sql"
# Limpeza dos exemplos: uma chopeira real (com patrimônio) e um cliente real precisam sobreviver
$PSQL -d t -c "insert into clientes (nome, cidade, telefone) values ('Cliente Real', 'Poços de Caldas', '35911112222')"
$PSQL -d t -c "insert into chopeiras (numero_serie, marca, voltagem, vias, patrimonio) values ('REAL-1', 'Gorillaz', '220V', 2, '0999')"
$PSQL -d t -c "update chopeiras set patrimonio = '0001' where numero_serie = 'SN2024001'"
$PSQL -d t -c "update clientes set telefone = '35999990001' where nome = 'Bar do Zé'"  # um teste anterior trocou o telefone
$PSQL -d t -f "$DIR/apagar_exemplos.sql" >/dev/null
RESTO=$($PSQL -d t -Atc "select string_agg(coalesce(patrimonio, numero_serie), ',' order by numero_serie) from chopeiras")
CLI=$($PSQL -d t -Atc "select string_agg(nome, ',') from clientes")
[ "$CLI" = "Cliente Real" ] || { echo "FALHA limpeza clientes: $CLI"; exit 1; }
echo "$RESTO" | grep -q "0999" && echo "$RESTO" | grep -q "0001" && ! echo "$RESTO" | grep -q "SN2024002" || { echo "FALHA limpeza chopeiras: $RESTO"; exit 1; }
echo "Limpeza dos exemplos ok (restaram: $RESTO)"
# Instalação do zero pelo instalar.sql, numa única transação (como o SQL Editor do Supabase)
$PSQL -c "create database t2"
$PSQL -d t2 -f "$DIR/test/stub_supabase.sql"
$PSQL -1 -d t2 -f "$DIR/instalar.sql"
$PSQL -d t2 -f "$DIR/seed.sql"
$PSQL -d t2 -f "$DIR/test/tests.sql" >/dev/null
$PSQL -d t2 -f "$DIR/test/tests_aluguel.sql" >/dev/null
echo "instalar.sql ok (instalação do zero)"
echo "OK: migrações, seed e testes passaram"
