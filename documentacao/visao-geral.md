# Visão geral

O **STBP (Sistema de Transferência de Bens Patrimoniais)** registra a movimentação de bens e materiais entre as unidades da FIES, do SESI e do SENAI e emite os documentos impressos que acompanham essa movimentação. Ele substitui o sistema anterior, feito em Laravel com MySQL, e preserva todo o histórico.

## O que o sistema faz

| Módulo | Para que serve | Documento emitido |
|---|---|---|
| **Transferências** | Registrar a transferência de bens patrimoniais entre unidades, com motivo (entre filiais, baixa/descarte, manutenção, empréstimo temporário), responsáveis e a lista de itens com patrimônio | *Termo de Transferência de Bens Patrimoniais* em PDF: uma via por folha (retrato) ou duas vias lado a lado (paisagem) |
| **Saídas de materiais** | Registrar saídas mais simples, **sem patrimônio**, para outra unidade ou para um **destino externo** (assistência técnica, local de evento). Inclui tipo de saída, áreas de saída e entrada e o portador | *Controle de Saída de Materiais da Unidade* (formulário FM-072-UOP-04) em PDF, idêntico ao formulário em papel |
| **Painel de análise** | Indicadores, evolução mensal e rankings (unidades, rotas, bens ou materiais, emissores), com comparação ao período anterior. Uma visão para transferências e outra para saídas | — |
| **Cadastros** | Instituições (com logo, impressa nos documentos) e unidades (com foto, usada como capa nas listagens) | — |
| **Usuários** | Contas com quatro perfis de acesso, bloqueio, lixeira e redefinição de senha | — |

Recursos que valem para transferências e saídas:
- **Busca e filtros** na listagem. Os filtros ficam no endereço da página, então dá para compartilhar o link.
- **Lixeira** com restauração. A exclusão definitiva só acontece a partir da lixeira e leva os itens junto.
- **Gerador de itens:** cria muitos itens de uma vez. Nas transferências, gera patrimônios em sequência (ex.: 100 computadores de 36102 a 36201). Nas saídas, gera itens iguais.
- **Edição em lote:** altera vários itens selecionados de uma vez, como aplicar a mesma observação ou área.
- **Filtro rápido** dentro da lista de itens.

## Perfis de acesso

Os perfis são cumulativos: cada um pode tudo o que o anterior pode.

| Perfil | Pode |
|---|---|
| **LEITOR** | Consultar, filtrar, ver o painel e emitir os PDFs |
| **TECNICO** | Registrar transferências e saídas e alterar **as próprias** |
| **ADMIN** | Alterar todos os registros, manter instituições, unidades e usuários. Não cria, promove nem altera SUPERADMIN |
| **SUPERADMIN** | Tudo |

As regras completas estão no capítulo *Perfis e permissões*.

## Regras gerais

- **Login local:** usuário ou e-mail e senha. Os usuários migrados entram com a mesma senha do sistema antigo. O primeiro acesso, e todo acesso depois de uma redefinição feita por um administrador, exige trocar a senha.
- **Bloquear em vez de excluir:** instituições, unidades e usuários que já têm transferências ou saídas **não são excluídos**, só bloqueados. Assim, o histórico e os documentos continuam íntegros.
- **Efeito imediato:** bloqueio, exclusão e mudança de perfil valem na hora, mesmo para quem já está logado.
- **Normalização:** os nomes seguem as convenções do sistema antigo. Instituições e unidades ficam em maiúsculas, e responsáveis e portadores com iniciais maiúsculas.
- **Toda regra vale na API:** a API aplica as mesmas regras das telas. Esconder um botão é só conveniência.

## Arquitetura

```
        navegador
            │  http://servidor/
            ▼
  ┌──────────────────────┐
  │ web (nginx)          │  telas React; encaminha /api → api
  └─────────┬────────────┘
            │ /api  (JSON, token JWT)
  ┌─────────▼────────────┐
  │ api (Spring Boot)    │  regras, login, PDFs, painel; aplica as migrações ao subir
  └─────────┬────────────┘
  ┌─────────▼────────────┐
  │ PostgreSQL 18        │  dados, logos e fotos
  └──────────────────────┘
```

Os três serviços rodam em Docker Compose num servidor Linux. Só o `web` publica uma porta. A API e o banco ficam na rede interna do Docker.

| Parte | Tecnologias | Pasta |
|---|---|---|
| **API** | Java 21, Spring Boot 4.1 (Web MVC, Data JPA, Security, Validation), Flyway, JWT, Thymeleaf + OpenHTMLtoPDF + PDFBox para os PDFs | `stbp-api/` |
| **Telas** | TypeScript, React 19, Vite, Mantine 9, TanStack Query, React Router, temas claro e escuro | `stbp-web/` |
| **Banco** | PostgreSQL 18, com 8 tabelas e o schema versionado em migrações Flyway (V1 a V6) | `stbp-api/src/main/resources/db/migration/` |
| **Implantação** | Docker Compose, nginx, script de backup e roteiro de virada | `implantacao/` |
| **Migração** | Scripts que leem o dump MySQL do sistema antigo e as logos do Laravel | `stbp-api/migracao/` |

## Números

| | |
|---|---|
| Endpoints da API | 55, mais o `GET /actuator/health` |
| Tabelas | 8: 6 do termo de transferência e 2 do controle de saída |
| Perfis de acesso | 4 |
| Testes automatizados | 66 de integração na API (banco real descartável, via Testcontainers), 26 unitários nas telas e 11 fluxos de ponta a ponta no navegador (Playwright) |

## Como este documento está organizado

| Capítulo | Conteúdo |
|---|---|
| **Perfis e permissões** | O que cada perfil pode fazer |
| **Telas** | As telas, as rotas e as decisões do frontend |
| **Referência rápida dos endpoints** | Todos os endpoints numa tabela, conferida contra o código-fonte |
| **Referência da API** | Formatos de requisição e resposta, filtros, erros e autenticação |
| **Modelo de dados** | Tabelas, colunas e correspondência com o banco antigo |
| **API: desenvolvimento** | Como rodar, testar, configurar e empacotar a API |
| **Design system** | Cores, tipografia, componentes e regras dos gráficos |
| **Implantação** | Instalação no servidor, virada, atualização, backup e HTTPS |
| **Migração de dados** | Como os dados do sistema antigo foram migrados e conferidos |
| **Registro de decisões** | Cada decisão técnica ou de negócio, com o motivo |

Este PDF é gerado a partir dos arquivos de documentação do repositório (`README.md` e `docs/` de cada parte). Para atualizá-lo depois de mudar a documentação, rode `npm run docs:pdf` na pasta `stbp-web`.
