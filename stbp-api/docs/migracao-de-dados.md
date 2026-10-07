# Migração dos dados do sistema antigo

A migração é feita **uma única vez**, no momento da virada. Ela lê o dump MySQL e as logos do sistema Laravel e carrega tudo no Postgres da API, já no modelo novo (ver [modelo-de-dados.md](modelo-de-dados.md)).

## Como executar

Pré-requisitos: Docker e o comando `file`.

```bash
# Desenvolvimento: Postgres local do compose.yaml (porta 5433, stbp/stbp)
./migracao/migrar.sh caminho/para/dump.sql caminho/para/laravel/public
# sem argumentos, usa ../BKP_STBP/stbp20260615.sql e ../fies-main/public

# Produção ou homologação: usa o compose e o .env de ../implantacao
STBP_COMPOSE=../implantacao/compose.yaml ./migracao/migrar.sh dump.sql laravel/public
```

| Variável | Padrão | Uso |
|---|---|---|
| `STBP_COMPOSE` | `compose.yaml` (dev) | Compose que contém o serviço `postgres` de destino. O `.env` ao lado dele é lido automaticamente |
| `STBP_PROJETO` | `stbp` | Nome do projeto Docker (define a rede `<projeto>_default`). Normalmente vem do `.env` |
| `STBP_DB_NOME`, `STBP_DB_USUARIO`, `STBP_DB_SENHA` | `stbp` | Credenciais do Postgres de destino. Normalmente vêm do `.env`. A senha pode ter caracteres especiais |

A pasta `public` do Laravel é usada só para ler as imagens:
- **Logos das instituições:** `public/img/instituicao/*`.
- **Fotos das unidades:** `public/img/unidades/*`.

Se uma imagem não for encontrada, o script avisa e segue; ela pode ser enviada depois pelas telas **Instituições** e **Unidades**.

**Recarregar só as imagens** num banco já migrado, sem apagar dados (requer o schema `legado`):

```bash
./migracao/carregar-imagens.sh caminho/para/laravel/public
STBP_COMPOSE=../implantacao/compose.yaml ./migracao/carregar-imagens.sh laravel/public   # produção
```

O banco de destino precisa estar **vazio**: o script se recusa a rodar se já houver usuários. Para refazer a migração do zero em ambiente local:

```bash
LEGADO_DUMP=/dev/null docker compose -f compose.yaml -f migracao/compose.migracao.yaml down -v
./migracao/migrar.sh
```

Na produção, o equivalente é `docker compose down -v` na pasta `implantacao`, o que **apaga o banco**.

## O que o script faz

1. **Sobe os bancos.** Sobe o Postgres de destino e um MySQL 8 temporário que carrega o dump ([compose.migracao.yaml](../migracao/compose.migracao.yaml)).
2. **Cria o schema novo** com o Flyway (as mesmas migrações usadas pela aplicação).
3. **Copia o MySQL sem alterações** para o schema `legado` do Postgres, usando o pgloader. O arquivo de carga é gerado pelo script com as credenciais do destino; a senha vai pela variável `PGPASSWORD`, porque o pgloader não aceita caracteres especiais na URL.
4. **Converte do `legado` para as tabelas novas** ([02-transformar.sql](../migracao/02-transformar.sql)), numa única transação. Se qualquer passo falhar, nada é gravado.
5. **Carrega as imagens** com o [carregar-imagens.sh](../migracao/carregar-imagens.sh).
   - **Logos:** gravadas como estão, apenas PNG ou JPEG.
   - **Fotos das unidades:** redimensionadas com ImageMagick, num container `alpine` temporário (precisa de internet para instalar o ImageMagick), para JPEG de até 1200 px. A foto de 18 MB do sistema antigo vira cerca de 220 KB.
   - **Fotos compartilhadas:** o script avisa quando a mesma foto é usada por mais de uma unidade. No dump de 15/06/2026, o CEFEM usava a foto do CETICC e o JBR a do CETAF-EST. Corrija na tela **Unidades**.
6. **Remove o MySQL temporário.**

Os passos 4 e 5 ficam em arquivos separados (`02-transformar.sql`, `carregar-imagens.sh`); o [comum.sh](../migracao/comum.sh) reúne a configuração compartilhada pelos scripts.

O schema `legado` é mantido para conferência. Quando não for mais necessário:

```sql
DROP SCHEMA legado CASCADE;
```

## Regras aplicadas

- **IDs preservados** em todas as tabelas, e as sequências continuam a partir do maior ID.
- **Integridade:** o MySQL usava MyISAM, que não garante chaves estrangeiras.
  - Itens cuja saída não existe mais (saídas excluídas definitivamente) são **descartados e listados** no log.
  - Qualquer outro órfão (saída sem usuário, sem unidade, sem instituição ou com motivo desconhecido) **aborta** a migração com a lista dos IDs.
- **Datas:** `data_saida` era gravada como `AAAA-MM-DD 03:00:00 UTC` (meia-noite de Brasília). É convertida para `date` no fuso `America/Sao_Paulo`.
- **Senhas:** os hashes BCrypt são copiados sem alteração, então os usuários continuam com a mesma senha.
- As demais transformações estão na tabela de correspondência em [modelo-de-dados.md](modelo-de-dados.md#correspondência-com-o-banco-antigo).

## Conferência

Ao final, o script imprime as quantidades do legado ao lado das novas e a distribuição de perfis.

### Execução de referência: dump de 15/06/2026

| Tabela | Legado | Novo |
|---|---|---|
| usuários | 22 | 22 |
| instituições | 2 | 2 |
| unidades | 16 | 16 |
| transferências | 703 (2 na lixeira) | 703 |
| itens | 5.297 | 5.293 |

Itens descartados (pertenciam a saídas excluídas definitivamente):

| Item | Saída | Descrição |
|---|---|---|
| 132 | 23 | Nobreaks 800va (dado de teste) |
| 3528 | 445 | Projeto Epson PowerLite W49 |
| 3529 | 446 | Projetor Epson PowerLite W49 |
| 4374 | 551 | DVR Intelbras MHDX5116 |

Perfis resultantes: 2 SUPERADMIN, 4 ADMIN, 15 TECNICO (7 bloqueados), 1 LEITOR (bloqueado).

O LEITOR (`alysson.santana`) estava excluído no sistema antigo, mas tem 5 transferências. Pela regra D-035, usuário com transferências não pode ser excluído, então ele chega como **bloqueado**. O efeito é o mesmo: continua sem acesso.

1.327 itens ficaram sem patrimônio (eram `s/p`, `S/P` ou `S/p`).

## Problemas conhecidos

| Sintoma | Causa / solução |
|---|---|
| `O banco de destino já possui dados` | A migração já rodou. Use um banco vazio (`docker compose down -v`). |
| `Registros órfãos no banco legado: ...` | Corrija os registros listados no MySQL (ou no dump) e rode de novo. |
| Erro de checksum do Flyway após alterar `V1` | Normal em desenvolvimento antes da produção: recrie o banco com `docker compose down -v`. |
