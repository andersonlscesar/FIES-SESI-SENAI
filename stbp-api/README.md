# STBP API

API do **Sistema de Transferência de Bens Patrimoniais** (FIES / SESI / SENAI).

Os técnicos de TI registram transferências de bens entre unidades: uma transferência (saída) tem vários itens e gera o *Termo de Transferência de Bens Patrimoniais* em PDF.

Esta API substitui o sistema anterior em Laravel + MySQL (`../fies-main`) e preserva todos os dados históricos.

As telas ficam em [`../stbp-web`](../stbp-web), e a implantação em produção (Docker Compose, backup, roteiro de virada) em [`../implantacao`](../implantacao/README.md).

## Stack

| | |
|---|---|
| Linguagem | Java 21 |
| Framework | Spring Boot 4.1 (Web MVC, Data JPA, Security, Validation) |
| Banco | PostgreSQL 18 com migrações Flyway |
| Build | Maven (use o wrapper `./mvnw`, não precisa instalar o Maven) |
| PDF | Thymeleaf (template) + OpenHTMLtoPDF (renderização) + PDFBox (montagem da paisagem) |
| Testes | JUnit 5 + Testcontainers |

## Andamento

| Etapa | Situação |
|---|---|
| 1. Modelo de dados + migração do legado | ✅ concluída |
| 2. Autenticação e usuários | ✅ concluída |
| 3. Transferências e itens | ✅ concluída |
| 3b. Cadastro de instituições (com logo) e unidades | ✅ concluída |
| 4. Termo em PDF (retrato e paisagem) | ✅ concluída |
| 5. Frontend React ([stbp-web](../stbp-web)) | ✅ concluída |
| 6. Implantação em Docker ([implantacao](../implantacao/README.md)) | ✅ concluída e validada em homologação |

Todas as funcionalidades do sistema antigo estão cobertas. O login é local (D-003), e os usuários entram com a mesma senha de antes.

## Como rodar localmente

Pré-requisitos: Java 21 e Docker.

```bash
# 1. Banco (Postgres na porta 5433, para não conflitar com um Postgres local)
docker compose up -d postgres

# 2. Dados: migrar o dump e as logos do sistema antigo (só na primeira vez)
./migracao/migrar.sh ../BKP_STBP/stbp20260615.sql ../fies-main/public
```

Para recomeçar do zero, apague o banco com `docker compose down -v` e rode a migração de novo.

Credenciais do banco local: `stbp` / `stbp`, database `stbp`, porta `5433`.

```bash
# 3. API em http://localhost:8080 (o perfil dev define um segredo JWT de desenvolvimento)
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Os usuários migrados entram com a **mesma senha do sistema antigo**.

**No VS Code**, abra a pasta `FIES` e use o painel **Executar e Depurar** (Ctrl+Shift+D) com a configuração **"STBP API (dev)"**, definida em [`../.vscode/launch.json`](../.vscode/launch.json). Ela ativa o perfil `dev`. Executar a classe `StbpApiApplication` sem esse perfil falha de propósito com `Defina STBP_JWT_SEGREDO`: a API não sobe sem um segredo de tokens, e o segredo de desenvolvimento só vale no perfil `dev`. A configuração **"STBP API (dev, banco descartável)"** sobe a API com um Postgres vazio temporário (Testcontainers), útil para testar sem mexer nos dados locais.

### Testes

```bash
./mvnw test
```

Os testes de integração sobem um Postgres descartável via Testcontainers (o Docker precisa estar rodando) e aplicam as migrações Flyway, então não dependem do banco local.

### Configuração

| Variável de ambiente | Padrão | Uso |
|---|---|---|
| `STBP_DB_URL` | `jdbc:postgresql://localhost:5433/stbp` | URL JDBC do Postgres |
| `STBP_DB_USUARIO` / `STBP_DB_SENHA` | `stbp` / `stbp` | Credenciais do banco |
| `STBP_JWT_SEGREDO` | (nenhum) | **Obrigatório em produção.** Segredo HMAC dos tokens, com no mínimo 32 caracteres. A aplicação não sobe sem ele, exceto no perfil `dev` |

- **Health check:** `GET /actuator/health` (público) é usado pelo Docker e pode servir ao monitoramento. Nenhum outro endpoint do Actuator é exposto.
- **Proxy reverso:** a API lê o IP real do cabeçalho `X-Forwarded-For` (`server.forward-headers-strategy=native`), confiando apenas em proxies de redes privadas, como o nginx do frontend. Esse IP é usado no limite de tentativas de login.

### Imagem Docker

```bash
docker build -t stbp-api .
```

O [Dockerfile](Dockerfile) compila sem rodar os testes (eles exigem Docker; rode `./mvnw test` antes). A imagem final roda só com o JRE 21, com usuário sem privilégios, fuso `America/Sao_Paulo` e health check. Em produção, use o compose de [`../implantacao`](../implantacao/README.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/api.md](docs/api.md) | Endpoints, formatos de requisição e resposta, erros e autenticação |
| [docs/modelo-de-dados.md](docs/modelo-de-dados.md) | Tabelas, colunas, enums e correspondência com o banco antigo |
| [docs/migracao-de-dados.md](docs/migracao-de-dados.md) | Como migrar os dados do MySQL, transformações e conferência |
| [docs/perfis-e-permissoes.md](docs/perfis-e-permissoes.md) | O que cada perfil pode fazer |
| [docs/decisoes.md](docs/decisoes.md) | Registro das decisões técnicas e do porquê |

## Estrutura

```
stbp-api/
├── compose.yaml                 # Postgres de desenvolvimento (porta 5433)
├── Dockerfile                   # imagem de produção da API
├── migracao/                    # Migração única dos dados do sistema Laravel
│   ├── migrar.sh                # orquestra tudo (dev ou produção)
│   ├── carregar-imagens.sh      # logos e fotos das unidades (também roda sozinho)
│   ├── comum.sh                 # configuração compartilhada pelos scripts
│   ├── compose.migracao.yaml    # MySQL temporário com o dump
│   └── 02-transformar.sql       # schema "legado" -> modelo novo
├── docs/
└── src/main/
    ├── java/br/org/fies/stbp/
    │   ├── auth/          # login, perfil do usuário logado, troca da própria senha
    │   ├── cadastro/      # instituições (logo), unidades (foto) e motivos; imagens no banco
    │   ├── comum/         # exceções, tratamento de erros (Problem Details), paginação, normalização de texto
    │   ├── seguranca/     # JWT, Spring Security, hierarquia de perfis, limite de tentativas
    │   ├── transferencia/ # transferências, itens, filtros e lixeira
    │   └── usuario/       # entidade Usuario e gestão de usuários (ADMIN)
    └── resources/
        ├── application.properties
        ├── application-dev.properties
        ├── db/migration/  # migrações Flyway (schema oficial)
        └── pdf/
            ├── termo.xhtml   # template do Termo de Transferência (Thymeleaf, modo XML)
            └── fontes/       # Carlito (equivalente livre da Calibri) + licença OFL
```

Para alterar o layout do termo, edite `pdf/termo.xhtml`. O CSS segue o padrão de mídia paginada (`@page`, `running()`) suportado pelo OpenHTMLtoPDF. Os testes em `TermoIntegracaoTest` conferem o conteúdo do PDF gerado.

O código é organizado **por funcionalidade**: cada pacote reúne o controller, o serviço, a entidade e os DTOs do seu assunto.

## Convenções

- **Toda alteração de schema** entra como uma nova migração Flyway (`V2__...sql`, `V3__...sql`). Nunca edite uma migração já aplicada em produção.
- **Toda alteração** de schema, endpoint, regra ou script atualiza a documentação em `docs/` na mesma entrega.
- Código e documentação em português, seguindo o vocabulário do negócio (transferência, item, unidade, patrimônio).
