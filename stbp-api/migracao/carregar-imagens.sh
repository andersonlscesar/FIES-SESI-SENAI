#!/usr/bin/env bash
# Carrega as logos das instituições e as fotos das unidades a partir dos arquivos do sistema Laravel.
# Chamado pelo migrar.sh; também pode ser rodado sozinho sobre um banco já migrado (só atualiza as imagens):
#   ./migracao/carregar-imagens.sh [pasta public do Laravel]
# Requer o schema "legado" (criado pela migração), de onde vêm os caminhos das imagens.
set -euo pipefail

source "$(dirname "$0")/comum.sh"
LEGADO_PUBLIC="$(realpath "${1:-../fies-main/public}")"

echo ">> Carregando as logos das instituições ($LEGADO_PUBLIC/img/instituicao)"
psql_stbp -tA -F '|' -c "SELECT id_instituicao, imagem FROM legado.instituicoes WHERE imagem IS NOT NULL" |
while IFS='|' read -r id caminho; do
    arquivo="$LEGADO_PUBLIC/img/$caminho"
    case "$(file -b --mime-type "$arquivo" 2>/dev/null)" in
        image/png)  tipo=image/png ;;
        image/jpeg) tipo=image/jpeg ;;
        *) echo "   AVISO: logo da instituição $id não encontrada ou inválida: $arquivo"; continue ;;
    esac
    printf "UPDATE instituicao SET logo = decode('%s', 'base64'), logo_tipo = '%s' WHERE id = %d;\n" \
        "$(base64 -w0 "$arquivo")" "$tipo" "$id" | psql_stbp -q
    echo "   instituição $id: $(basename "$arquivo")"
done

echo ">> Carregando as fotos das unidades ($LEGADO_PUBLIC/img/unidades), redimensionadas para JPEG de até 1200 px"
# Pasta dentro do projeto (e não em /tmp), pois o Docker Desktop só monta pastas compartilhadas
FOTOS="$(mktemp -d -p "$PWD/migracao" .fotos.XXXXXX)"
trap 'rm -rf "$FOTOS"' EXIT
docker run --rm -v "$LEGADO_PUBLIC/img/unidades:/origem:ro" -v "$FOTOS:/destino" alpine:3 sh -c '
    apk add -q --no-cache imagemagick imagemagick-jpeg imagemagick-png >/dev/null 2>&1 \
        || apk add -q --no-cache imagemagick imagemagick-jpeg >/dev/null
    for f in /origem/*; do
        n=$(basename "$f")
        magick "$f" -auto-orient -resize "1200x1200>" -background white -flatten -strip -quality 82 \
            "/destino/${n%.*}.jpg" || echo "   AVISO: não foi possível converter $n"
    done'

psql_stbp -tA -F '|' -c "SELECT id_unidade, name, imagem, count(*) OVER (PARTITION BY imagem)
                         FROM legado.unidades WHERE imagem IS NOT NULL ORDER BY id_unidade" |
while IFS='|' read -r id nome caminho compartilhada; do
    foto="$FOTOS/$(basename "${caminho%.*}").jpg"
    if [[ ! -f "$foto" ]]; then
        echo "   AVISO: foto da unidade $id ($nome) não encontrada: $caminho"
        continue
    fi
    printf "UPDATE unidade SET imagem = decode('%s', 'base64'), imagem_tipo = 'image/jpeg' WHERE id = %d;\n" \
        "$(base64 -w0 "$foto")" "$id" | psql_stbp -q
    aviso=""
    [[ "$compartilhada" -gt 1 ]] && aviso="  ⚠ mesma foto de outra unidade no sistema antigo: confira na tela Unidades"
    echo "   unidade $id $nome: $(basename "$caminho") → $(( $(stat -c %s "$foto") / 1024 )) KB$aviso"
done
