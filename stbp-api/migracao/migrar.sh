#!/usr/bin/env bash
# Migra os dados do sistema Laravel (dump MySQL + imagens em public/img) para o Postgres da API.
#
# Uso:  ./migracao/migrar.sh [dump.sql] [pasta public do Laravel]
#   Desenvolvimento: usa ./compose.yaml (Postgres local na porta 5433, credenciais stbp/stbp).
#   Produção:        STBP_COMPOSE=../implantacao/compose.yaml ./migracao/migrar.sh dump.sql public/
#                    (credenciais lidas do .env ao lado do compose; ver docs/migracao-de-dados.md)
set -euo pipefail

DUMP="$(realpath "${1:-$(dirname "$0")/../../BKP_STBP/stbp20260615.sql}")"
LEGADO_PUBLIC="$(realpath "${2:-$(dirname "$0")/../../fies-main/public}")"
source "$(dirname "$0")/comum.sh"
export LEGADO_DUMP="$DUMP"

echo ">> Subindo Postgres e MySQL com o dump ($LEGADO_DUMP)"
dc up -d --wait postgres mysql-legado

echo ">> Criando o schema novo (Flyway)"
docker run --rm --network "$REDE" -v "$PWD/src/main/resources/db/migration:/flyway/sql:ro" flyway/flyway:11 \
    -url="jdbc:postgresql://postgres:5432/$DB_NOME" -user="$DB_USUARIO" -password="$DB_SENHA" migrate

echo ">> Copiando o banco MySQL para o schema 'legado' (pgloader)"
# Dentro do projeto (e não em /tmp), pois o Docker Desktop só monta pastas compartilhadas
CARGA="$(mktemp -p "$PWD/migracao" .carga.XXXXXX.load)"
trap 'rm -f "$CARGA"' EXIT
cat > "$CARGA" <<EOF
LOAD DATABASE
    FROM mysql://root:legado@mysql-legado/stbp
    INTO postgresql://$DB_USUARIO@postgres/$DB_NOME
WITH include drop, create tables, no foreign keys, reset no sequences
SET PostgreSQL PARAMETERS timezone = 'UTC'
ALTER SCHEMA 'stbp' RENAME TO 'legado';
EOF
# A senha vai por PGPASSWORD: o pgloader não decodifica caracteres especiais na URL
docker run --rm --network "$REDE" -e PGPASSWORD="$DB_SENHA" -v "$CARGA:/carga.load:ro" dimitri/pgloader:latest \
    pgloader --on-error-stop /carga.load

echo ">> Convertendo para o modelo novo"
psql_stbp < migracao/02-transformar.sql

"$PWD/migracao/carregar-imagens.sh" "$LEGADO_PUBLIC"

echo ">> Removendo o MySQL temporário"
dc rm -sf mysql-legado

echo ">> Concluído. O schema 'legado' foi mantido para conferência (DROP SCHEMA legado CASCADE quando não for mais necessário)."
