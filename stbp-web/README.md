# STBP Web

Telas do **Sistema de Transferência de Bens Patrimoniais**. Consome a API do projeto [`../stbp-api`](../stbp-api) (referência: [docs/api.md](../stbp-api/docs/api.md)).

## Stack

| | |
|---|---|
| Linguagem | TypeScript (modo `strict`) |
| Framework | React 19 + Vite |
| Componentes | Mantine 9 (formulários, tabelas, datas, modais, notificações), com tema próprio ([docs/design.md](docs/design.md)) |
| Visual | IBM Plex Sans/Mono (servidas localmente), temas claro e escuro |
| Dados | TanStack Query (cache e sincronização com a API) |
| Rotas | React Router |
| Testes de ponta a ponta | Playwright |
| Produção | nginx (imagem Docker, ver [Dockerfile](Dockerfile) e [nginx.conf](nginx.conf)) |

## Desenvolvimento

Pré-requisitos: Node 24 e a API rodando em `http://localhost:8080` (ver o README da API).

```bash
npm install
npm run dev        # http://localhost:5173; /api é encaminhado para a API (vite.config.ts)
# Outra API (ex.: testes numa porta separada): STBP_API_URL=http://localhost:8081 npm run dev -- --port 5174
npm run build      # checagem de tipos + build de produção em dist/
npm run lint
npm test           # testes unitários (Vitest), ex.: regra de sequência de patrimônio
```

**Ao entrar, aparece "Não foi possível falar com a API"** (antes, um erro 500 genérico): a API não está rodando. Suba-a com `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` na pasta `stbp-api` e espere a linha `Started StbpApiApplication`. O Vite só repassa `/api` para a porta 8080.

## Design

A direção visual é institucional e sóbria: o azul do SENAI-SE (`#2058ab`), cantos discretos, números em fonte monoespaçada, e temas **claro e escuro**. Por padrão o tema segue o sistema operacional; o botão sol/lua no cabeçalho alterna. Tokens, cores, tipografia e padrões de tela estão em **[docs/design.md](docs/design.md)**, que deve ser consultado antes de criar uma tela nova.

## Telas e perfis

O menu e as rotas seguem o perfil do usuário. A API aplica as mesmas regras, então esconder um botão é só conveniência e não substitui a checagem do servidor. Regras completas em [perfis-e-permissoes.md](../stbp-api/docs/perfis-e-permissoes.md).

| Rota | Tela | Perfil mínimo |
|---|---|---|
| `/login` | Login (usuário ou e-mail + senha) | — |
| `/trocar-senha` | Troca de senha. É obrigatória quando `trocarSenha = true`: as outras telas ficam bloqueadas até a troca | qualquer |
| `/painel` | **Painel de análise**: indicadores com variação contra o período anterior, evolução mensal (gráfico ou tabela), motivos, instituições, unidades, rotas, bens e emissores. Filtros de período e instituição ficam na URL | LEITOR |
| `/transferencias` | Listagem em **cartões** (capa = foto da unidade de destino, como no sistema antigo) ou tabela, com busca, filtros, paginação e PDF. Os filtros ficam na URL, então dá para compartilhar o link | LEITOR |
| `/transferencias/:id` | Detalhe com as fotos da origem e do destino, termo em PDF (retrato ou 2 vias), editar, lixeira, restaurar, excluir. Os botões dependem de `podeAlterar` | LEITOR |
| `/transferencias/nova`, `/transferencias/:id/editar` | Formulário com itens dinâmicos e **gerador de itens em sequência** (ex.: 100 computadores com patrimônio 36102 a 36201). As unidades são filtradas pela instituição, e instituições bloqueadas não aparecem | TECNICO |
| `/transferencias/lixeira` | Lixeira: o TECNICO vê as próprias, o ADMIN vê todas | TECNICO |
| `/instituicoes` | Instituições: nome e logo no mesmo formulário (com pré-visualização), bloqueio para uso, e exclusão só das que nunca foram usadas | ADMIN |
| `/unidades` | Unidades: nome, instituições e foto (capa dos cartões) no mesmo formulário, bloqueio para uso, e exclusão só das que nunca foram usadas | ADMIN |
| `/usuarios` | Usuários: criar, editar, redefinir senha, bloquear, excluir (só quem nunca criou transferências) e restaurar | ADMIN |

## Estrutura

```
src/
├── api/            # cliente HTTP (token, erros Problem Details), tipos e chamadas por recurso
├── sessao/         # usuário logado (contexto) e proteção de rotas por perfil
├── componentes/    # layout, cabeçalho de página, cartões/tabela de transferências, consultas, utilitários
├── paginas/        # uma pasta por área: transferencias/, usuarios/, cadastros/
├── tema.ts         # design system (Mantine): cores, tipografia, raios, padrões dos componentes
├── estilos.css     # tokens dos temas claro/escuro e classes utilitárias
└── main.tsx        # provedores (Mantine, Query, sessão) e rotas
e2e/fluxo.spec.ts   # testes de ponta a ponta (Playwright)
```

## Decisões

- **Sessão:** o token JWT fica no `localStorage`, então a sessão sobrevive a recarregar a página e vale por 8 horas. Se a API responde `401`, o usuário volta para o login. Se responde `403` com `TROCA_DE_SENHA_OBRIGATORIA`, vai para a troca de senha.
- **PDF:** a rota do termo exige token, então o arquivo é baixado com `fetch` e aberto como *blob*. A aba é aberta já no clique, para o navegador não bloquear o pop-up.
- **Erros de validação da API** (`campos`) aparecem embaixo do campo correspondente. Os itens são mapeados de `itens[0].descricao` para o formato do formulário.
- **Cartões ou tabela:** a escolha fica no `localStorage` (padrão: cartões). Unidades sem foto, ou com foto que falha ao carregar, mostram um ícone neutro (`FotoUnidade`).
- **Gerador de itens em sequência** (`GeradorItens`, regra em `sequencia.ts`):
  - **Entrada:** descrição, quantidade, patrimônio inicial e observação opcional.
  - **Regra do patrimônio:** incrementa a parte numérica do final, mantendo prefixo e zeros à esquerda (`022658` → `022659`; `NB-0010` → `NB-0011`).
  - **Antes de gerar:** mostra o intervalo e avisa se algum patrimônio já está na lista. Respeita o limite de 500 itens por transferência.
  - **Linha vazia:** a linha em branco inicial é substituída pelos itens gerados.
- **Desempenho com muitos itens:**
  - **Por que fora do `useForm`:** os itens ficam num estado próprio, porque o `useForm` copia todos os valores a cada tecla e redesenharia a grade inteira.
  - **Linhas memorizadas:** cada alteração cria um objeto novo só para a linha alterada, e as linhas (`LinhaItem`) são memorizadas.
  - **Medição:** com 100 itens, digitar leva cerca de 35 ms por tecla; com a abordagem anterior, eram cerca de 200 ms. O teste de ponta a ponta mede isso e falha acima de 150 ms.
- **Ordem dos itens:** é definida pelos botões ↑ ↓ e enviada à API, que numera o termo nessa ordem.

## Testes de ponta a ponta

Rodam contra a aplicação no ar, local (`npm run dev`) ou de homologação, com um usuário **ADMIN ou SUPERADMIN** real. O teste cria uma transferência e a exclui definitivamente ao final.

```bash
npx playwright install chromium     # uma vez
E2E_USUARIO=login E2E_SENHA=senha npx playwright test
E2E_URL=http://servidor:8088 E2E_USUARIO=... E2E_SENHA=... npx playwright test   # outro endereço
```

Capturas de tela de cada etapa ficam em `e2e/capturas/`.
