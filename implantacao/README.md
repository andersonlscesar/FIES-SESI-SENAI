# Implantação do STBP

Este guia instala o sistema num **servidor Linux com Docker** e faz a virada a partir do sistema Laravel antigo.

## Arquitetura

```
        navegador
            │  http://servidor/
            ▼
  ┌──────────────────────┐
  │ web (nginx)          │  telas React; encaminha /api → api
  └─────────┬────────────┘
            │ /api
  ┌─────────▼────────────┐
  │ api (Spring Boot)    │  regras, login, PDF; aplica migrações Flyway ao subir
  └─────────┬────────────┘
  ┌─────────▼────────────┐
  │ postgres 18          │  volume Docker "<projeto>_pgdata"
  └──────────────────────┘
```

- **Uma porta só:** apenas o `web` publica porta no servidor (padrão `80`).
- **Mesma origem:** telas e API ficam no mesmo endereço, então não há configuração de CORS.
- **Isolamento:** a API e o banco ficam acessíveis apenas na rede interna do Docker.

## Pré-requisitos do servidor

- Linux com **Docker Engine 24+** e o plugin **docker compose**.
- Acesso à internet na primeira instalação, para baixar as imagens e as dependências do build.
- **Para a migração (só na virada):** o comando `file` (pacote `file` no Debian/Ubuntu), o dump MySQL do sistema antigo e a pasta `public/` do Laravel, de onde vêm as logos.
- As pastas `stbp-api/`, `stbp-web/` e `implantacao/` lado a lado, como neste repositório. Exemplo: `/opt/stbp/`.

## 1. Configuração

```bash
cd /opt/stbp/implantacao
cp .env.exemplo .env
# Gere as senhas e preencha o .env:
openssl rand -base64 24   # → STBP_DB_SENHA
openssl rand -base64 48   # → STBP_JWT_SEGREDO
chmod 600 .env
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `STBP_PROJETO` | | Nome do projeto Docker. Padrão `stbp`; mantenha assim em produção |
| `STBP_PORTA` | | Porta HTTP no servidor (padrão `80`) |
| `STBP_DB_NOME`, `STBP_DB_USUARIO` | | Banco e usuário do Postgres (padrão `stbp`) |
| `STBP_DB_SENHA` | ✅ | Senha do Postgres. É gravada na **primeira** subida do banco; depois disso, mudar o `.env` não altera a senha |
| `STBP_JWT_SEGREDO` | ✅ | Segredo dos tokens de login (mínimo 32 caracteres). Trocá-lo desconecta todos os usuários |
| `STBP_VERSAO` | | Tag das imagens geradas (ex.: `2026-10-06`) |

## 2. Virada do sistema antigo (primeira instalação)

Faça a virada fora do horário de uso. A janela é curta: a migração dos dados leva cerca de 1 minuto.

1. **Avise os usuários** e deixe o sistema antigo **somente leitura** ou fora do ar, para ninguém registrar transferências durante a migração.
2. **Gere um dump novo** do MySQL antigo (ex.: MySQL Workbench → *Data Export*, ou `mysqldump stbp > stbp.sql`) e copie para o servidor junto com a pasta `public/` do Laravel.
3. **Rode a migração.** Ela sobe o Postgres, cria o schema, copia e converte os dados e carrega as logos e as fotos das unidades, já redimensionadas:
   ```bash
   cd /opt/stbp/stbp-api
   STBP_COMPOSE=../implantacao/compose.yaml ./migracao/migrar.sh /caminho/stbp.sql /caminho/laravel/public
   ```
   Confira a tabela final: todas as linhas devem estar como `ok`. Itens descartados (de saídas excluídas definitivamente) são listados no log. Detalhes e problemas conhecidos estão em [../stbp-api/docs/migracao-de-dados.md](../stbp-api/docs/migracao-de-dados.md).
4. **Suba a aplicação:**
   ```bash
   cd /opt/stbp/implantacao
   docker compose up -d --build --wait
   docker compose ps          # os 3 serviços devem estar "healthy"
   ```
5. **Confira** em `http://servidor/`. Os usuários entram com o **mesmo login e senha do sistema antigo**. Verifique:
   - a quantidade de transferências na listagem;
   - uma transferência recente e o termo em PDF dela;
   - o login de um técnico.
6. **Agende o backup** (seção 4) e **desligue o sistema antigo**. Guarde o dump usado na virada.

**Se algo der errado na virada:** o sistema antigo não é alterado pela migração. Basta reativá-lo e investigar. Para refazer a migração do zero, apague o banco novo com `docker compose down -v` (na pasta `implantacao`) e repita a partir do passo 3.

## 3. Atualizar para uma nova versão

```bash
cd /opt/stbp
git pull                      # ou copie as novas versões das pastas
cd implantacao
./backup.sh                   # sempre antes de atualizar
docker compose up -d --build --wait
```

A API aplica sozinha as novas migrações de banco (Flyway) ao subir.

## 4. Backup e restauração

O script [backup.sh](backup.sh) gera um `pg_dump` (formato *custom*) em `implantacao/backups/` e apaga os arquivos com mais de 30 dias. As variáveis opcionais `STBP_BACKUP_DIR` e `STBP_BACKUP_RETENCAO_DIAS` mudam a pasta e a retenção.

```bash
# Agendar todo dia às 2h (crontab -e do usuário que roda o Docker):
0 2 * * * /opt/stbp/implantacao/backup.sh >> /var/log/stbp-backup.log 2>&1
```

> **Copie os backups para fora do servidor**: outro servidor, storage de rede ou nuvem. Um backup no mesmo disco não protege contra a perda do disco.

**Restaurar** um backup, o que **substitui** os dados atuais:

```bash
cd /opt/stbp/implantacao
set -a; source .env; set +a
docker compose stop api web
docker compose exec -T postgres pg_restore -U "$STBP_DB_USUARIO" -d "${STBP_DB_NOME:-stbp}" \
    --clean --if-exists --no-owner < backups/stbp-AAAAMMDD-HHMM.dump
docker compose start api web
```

## 5. HTTPS

O `web` responde em HTTP. Para HTTPS, há duas opções:

- **Se a FIES já tem um proxy reverso** ou balanceador com certificado: aponte-o para `http://servidor:STBP_PORTA`. Esse é o caminho mais simples.
- **Se não tem:** publique um proxy com certificado na frente do `web` (ex.: Caddy ou Traefik, que obtêm certificados automaticamente) e mude `STBP_PORTA` para uma porta interna.

## 6. Operação

| Tarefa | Comando (na pasta `implantacao`) |
|---|---|
| Situação dos serviços | `docker compose ps` |
| Logs da API (últimas linhas, acompanhando) | `docker compose logs -f --tail=200 api` |
| Reiniciar a aplicação | `docker compose restart api web` |
| Saúde da API | `docker compose exec api curl -s localhost:8080/actuator/health` |
| Console SQL | `docker compose exec postgres psql -U stbp stbp` |
| Parar tudo (os dados ficam no volume) | `docker compose down` |

> ⚠️ `docker compose down -v` **apaga o banco**. Use só para refazer uma migração.

**Senha esquecida:** um ADMIN ou SUPERADMIN redefine a senha pela tela **Usuários → Redefinir senha**. Se o único SUPERADMIN perder o acesso, gere um hash BCrypt e atualize direto no banco:

```bash
docker run --rm php:8.3-cli php -r 'echo password_hash("SenhaTemporaria123", PASSWORD_BCRYPT), "\n";'
docker compose exec postgres psql -U stbp stbp -c \
  "UPDATE usuario SET senha_hash = '<hash>', trocar_senha = true WHERE login = '<login>';"
```

## Validação deste pacote

Em 06/10/2026, este pacote foi testado de ponta a ponta numa pilha de homologação (`STBP_PROJETO=stbp-homolog`), com o dump real de 15/06/2026 e senhas geradas aleatoriamente:

| Etapa | Resultado |
|---|---|
| Migração | 703 transferências, 5.293 itens, 22 usuários e 2 logos, todos `ok` (as fotos das unidades foram incluídas depois, conforme a D-031) |
| Subida | 3 serviços `healthy` |
| Testes de interface (Playwright) | login, listagem, busca, detalhe, criação, edição, lixeira, exclusão e telas de administração passaram |
| Backup | gerado e restaurado num banco de teste com os mesmos totais |
