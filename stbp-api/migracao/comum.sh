# Configuração comum aos scripts de migração (incluído com "source"; não executar diretamente).
#   STBP_COMPOSE: compose com o serviço "postgres" de destino (padrão: compose.yaml de desenvolvimento).
#   O .env ao lado do compose é lido automaticamente (STBP_PROJETO, STBP_DB_*).

cd "$(dirname "${BASH_SOURCE[0]}")/.."
COMPOSE_PRINCIPAL="$(realpath "${STBP_COMPOSE:-compose.yaml}")"

ENV_FILE="$(dirname "$COMPOSE_PRINCIPAL")/.env"
if [[ -f "$ENV_FILE" ]]; then set -a; source "$ENV_FILE"; set +a; fi
DB_NOME="${STBP_DB_NOME:-stbp}"
DB_USUARIO="${STBP_DB_USUARIO:-stbp}"
DB_SENHA="${STBP_DB_SENHA:-stbp}"
PROJETO="${STBP_PROJETO:-stbp}"
REDE="${PROJETO}_default"
export LEGADO_DUMP="${LEGADO_DUMP:-/dev/null}"

dc() { docker compose -p "$PROJETO" -f "$COMPOSE_PRINCIPAL" -f "$PWD/migracao/compose.migracao.yaml" "$@"; }
psql_stbp() { dc exec -T postgres psql -U "$DB_USUARIO" -d "$DB_NOME" -v ON_ERROR_STOP=1 "$@"; }
