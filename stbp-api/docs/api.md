# Referência da API

URL base local: `http://localhost:8080`. Todas as rotas ficam sob `/api` e trocam JSON.

## Convenções

### Autenticação

Faça login em `POST /api/auth/login` e envie o token recebido em todas as outras chamadas:

```
Authorization: Bearer <token>
```

O token vale **8 horas** (`stbp.seguranca.jwt-validade`). A cada requisição, o usuário é recarregado do banco. Por isso, bloqueio, exclusão e mudança de perfil valem **imediatamente**, mesmo para tokens já emitidos.

### Erros

Os erros seguem o formato [Problem Details (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457):

```json
{ "status": 422, "title": "Unprocessable Content", "detail": "A senha atual não confere", "instance": "/api/auth/senha" }
```

| Status | Quando |
|---|---|
| `400` | Dados inválidos. O campo `campos` traz a mensagem de cada campo: `{"campos": {"email": "E-mail inválido"}}` |
| `401` | Sem token, token inválido ou expirado, usuário bloqueado ou excluído, ou login com credenciais erradas |
| `403` | Sem permissão. Se `codigo` = `TROCA_DE_SENHA_OBRIGATORIA`, o frontend deve levar o usuário à tela de troca de senha |
| `404` | Recurso não encontrado |
| `409` | Conflito, como login ou e-mail já em uso |
| `422` | Regra de negócio violada, como bloquear a si mesmo |
| `429` | Muitas tentativas de login (limite de 5 por minuto para cada usuário + IP) |

> O `401` gerado pelo filtro de segurança (sem token ou token inválido) vem **sem corpo**, apenas com o cabeçalho `WWW-Authenticate`.

### Paginação

As listagens aceitam `page` (começa em 0), `size` e `sort` (ex.: `sort=nome,desc`) e respondem neste formato:

```json
{ "conteudo": [ ... ], "pagina": 0, "tamanho": 20, "totalElementos": 22, "totalPaginas": 2 }
```

### Objeto `Usuario`

```json
{
  "id": 3,
  "nome": "Anderson Luiz",
  "login": "anderson.luiz",
  "email": "anderson.luiz@fies.org.br",
  "perfil": "TECNICO",
  "status": "ATIVO",
  "trocarSenha": false,
  "emUso": true,
  "criadoEm": "2023-10-27T12:41:23Z",
  "atualizadoEm": "2024-02-01T10:00:00Z"
}
```

---

## Autenticação: `/api/auth`

### `POST /api/auth/login` (público)

O campo `usuario` aceita o **login ou o e-mail**, sem diferenciar maiúsculas e minúsculas.

```json
{ "usuario": "anderson.luiz", "senha": "..." }
```

Resposta `200`:

```json
{ "token": "eyJ...", "expiraEm": "2026-10-07T05:00:00Z", "usuario": { ...Usuario } }
```

| Erro | `detail` |
|---|---|
| `401` | `Usuário ou senha inválidos`. É a mesma resposta para usuário inexistente, senha errada ou usuário excluído |
| `401` | `A conta está bloqueada`. Só aparece se a senha estiver correta |
| `429` | Limite de tentativas atingido |

Se `usuario.trocarSenha` for `true`, o frontend deve abrir a tela de troca de senha. Até a troca, a API só aceita `GET /api/auth/eu` e `PUT /api/auth/senha`.

### `GET /api/auth/eu`

Devolve o `Usuario` logado. Funciona mesmo com troca de senha pendente.

### `PUT /api/auth/senha`

O usuário troca a própria senha. Funciona mesmo com troca de senha pendente. O token atual continua válido.

```json
{ "senhaAtual": "...", "novaSenha": "mínimo 8, máximo 72 caracteres" }
```

Resposta `204`. Erros: `422` com `A senha atual não confere` ou `A nova senha deve ser diferente da atual`; `400` se a nova senha for inválida.

---

## Usuários: `/api/usuarios` (ADMIN ou SUPERADMIN)

Regras de quem pode o quê: [perfis-e-permissoes.md](perfis-e-permissoes.md).

| Método e rota | Ação | Resposta |
|---|---|---|
| `GET /api/usuarios` | Lista usuários. Filtros: `busca` (nome, login ou e-mail), `perfil`, `status`. **Sem `status`, os excluídos ficam de fora**; use `status=EXCLUIDO` para ver a lixeira. Ordem padrão: `nome` | `200` página de `Usuario` |
| `GET /api/usuarios/{id}` | Detalhe | `200` `Usuario` |
| `POST /api/usuarios` | Cria o usuário. Ele precisará trocar a senha no primeiro acesso | `201` `Usuario` |
| `PUT /api/usuarios/{id}` | Altera nome, login, e-mail e perfil | `200` `Usuario` |
| `PUT /api/usuarios/{id}/senha` | Redefine a senha `{ "novaSenha": "..." }`. O usuário precisará trocá-la no próximo acesso | `204` |
| `POST /api/usuarios/{id}/bloquear` | ATIVO → BLOQUEADO | `200` `Usuario` |
| `POST /api/usuarios/{id}/desbloquear` | BLOQUEADO → ATIVO | `200` `Usuario` |
| `DELETE /api/usuarios/{id}` | ATIVO ou BLOQUEADO → EXCLUIDO (lixeira), **só para quem nunca criou transferências** (`emUso = false`). Com transferências, responde `409` e orienta a bloquear | `200` `Usuario` |
| `POST /api/usuarios/{id}/restaurar` | EXCLUIDO → ATIVO | `200` `Usuario` |

Corpo de `POST` (o `PUT` usa o mesmo corpo, sem `senha`):

```json
{
  "nome": "Fulano de Tal",
  "login": "fulano.tal",
  "email": "fulano.tal@fies.org.br",
  "senha": "mínimo 8 caracteres",
  "perfil": "TECNICO"
}
```

Login e e-mail são gravados em minúsculas. O login aceita letras, números, `.`, `-` e `_`.

| Erro | Quando |
|---|---|
| `403` | ADMIN tentando criar ou promover SUPERADMIN, ou alterar, bloquear, excluir ou redefinir a senha de um SUPERADMIN |
| `409` | `Login já está em uso` / `E-mail já está em uso` |
| `422` | Bloquear, excluir ou restaurar a si mesmo; alterar o próprio perfil; transição de status inválida (ex.: desbloquear quem não está bloqueado) |

---

## Instituições: `/api/instituicoes`

Todos os perfis consultam. Só ADMIN e SUPERADMIN alteram.

| Método e rota | Ação | Perfil | Resposta |
|---|---|---|---|
| `GET /api/instituicoes` | Lista em ordem de nome | todos | `200` `[Instituicao]` |
| `GET /api/instituicoes/{id}` | Detalhe | todos | `200` `Instituicao` |
| `POST /api/instituicoes` | Cria `{ "nome": "IEL" }` | ADMIN | `201` `Instituicao` |
| `PUT /api/instituicoes/{id}` | Renomeia `{ "nome": "..." }` | ADMIN | `200` `Instituicao` |
| `DELETE /api/instituicoes/{id}` | Exclui, **só se a instituição nunca foi usada** (`emUso = false`). Os vínculos com unidades são removidos junto. Se houver transferências, responde `409` e orienta a bloquear | ADMIN | `204` |
| `POST /api/instituicoes/{id}/bloquear` | Bloqueia para novas transferências. O histórico, os filtros e os termos continuam funcionando | ADMIN | `200` `Instituicao` |
| `POST /api/instituicoes/{id}/desbloquear` | Volta a permitir novas transferências | ADMIN | `200` `Instituicao` |
| `GET /api/instituicoes/{id}/logo` | A imagem da logo. **Público, sem token**, para usar direto em `<img src>`. `404` se não houver logo | — | `200` `image/png` ou `image/jpeg` |
| `PUT /api/instituicoes/{id}/logo` | Envia ou substitui a logo: `multipart/form-data`, campo `arquivo`, PNG ou JPEG de até 1 MB | ADMIN | `204` |
| `DELETE /api/instituicoes/{id}/logo` | Remove a logo | ADMIN | `204` |

```json
{ "id": 1, "nome": "SESI", "logoUrl": "/api/instituicoes/1/logo", "ativa": true, "emUso": true }
```

- `logoUrl` vem `null` quando a instituição não tem logo. A logo é impressa no termo em PDF.
- `ativa`: `false` significa bloqueada para novas transferências.
- `emUso`: indica que a instituição já foi usada em transferências; nesse caso não pode ser excluída, só bloqueada (D-033).

Exemplo de envio da logo:

```bash
curl -X PUT localhost:8080/api/instituicoes/1/logo -H "Authorization: Bearer $TOKEN" -F arquivo=@sesi.png
```

## Unidades: `/api/unidades`

| Método e rota | Ação | Perfil | Resposta |
|---|---|---|---|
| `GET /api/unidades` | Lista em ordem de nome. Com `?instituicaoId=2`, só as unidades daquela instituição (para filtrar o formulário de transferência) | todos | `200` `[Unidade]` |
| `GET /api/unidades/{id}` | Detalhe | todos | `200` `Unidade` |
| `POST /api/unidades` | Cria | ADMIN | `201` `Unidade` |
| `PUT /api/unidades/{id}` | Altera o nome e as instituições | ADMIN | `200` `Unidade` |
| `DELETE /api/unidades/{id}` | Exclui, **só se a unidade nunca foi usada** (`emUso = false`). Se for origem ou destino de alguma transferência, responde `409` e orienta a bloquear | ADMIN | `204` |
| `POST /api/unidades/{id}/bloquear` | Bloqueia para novas transferências. O histórico, os filtros e os termos continuam funcionando | ADMIN | `200` `Unidade` |
| `POST /api/unidades/{id}/desbloquear` | Volta a permitir novas transferências | ADMIN | `200` `Unidade` |
| `GET /api/unidades/{id}/imagem` | A foto da unidade (JPEG). **Público, sem token**, para usar direto em `<img src>`. `404` se não houver foto | — | `200` `image/jpeg` |
| `PUT /api/unidades/{id}/imagem` | Envia ou substitui a foto: `multipart/form-data`, campo `arquivo`, PNG ou JPEG de até 20 MB. É gravada **redimensionada**: JPEG de até 1200 px no lado maior, com a rotação EXIF aplicada | ADMIN | `204` |
| `DELETE /api/unidades/{id}/imagem` | Remove a foto | ADMIN | `204` |

```json
{ "nome": "SESI LAGARTO", "instituicaoIds": [1] }
```

A resposta tem o formato `{ "id": 17, "nome": "SESI LAGARTO", "imagemUrl": "/api/unidades/17/imagem", "ativa": true, "emUso": false, "instituicaoIds": [1] }`. `ativa` e `emUso` têm o mesmo significado que nas instituições (D-035). `imagemUrl` vem `null` quando a unidade não tem foto. A foto aparece nos cartões das transferências (ver D-031).

**Regras comuns:**
- Nomes de instituição e de unidade são gravados **em maiúsculas** e sem espaços extras, como já estavam no sistema antigo e como saem no termo.
- Nomes repetidos, sem diferenciar maiúsculas e minúsculas, retornam `409`.
- Unidade precisa de pelo menos uma instituição; instituição inexistente retorna `422`.

## Motivos: `GET /api/motivos` (todos os perfis)

São fixos, porque definem os quadros do termo impresso (ver [D-007](decisoes.md)).

```json
[{ "codigo": "TRANSFERENCIA_ENTRE_FILIAIS", "descricao": "Transferência entre filiais", "tipo": "DEFINITIVA" }, ...]
```

---

## Transferências: `/api/transferencias`

Regras de quem pode o quê: [perfis-e-permissoes.md](perfis-e-permissoes.md#transferências).

| Método e rota | Ação | Perfil mínimo | Resposta |
|---|---|---|---|
| `GET /api/transferencias` | Lista as transferências fora da lixeira (filtros abaixo). Ordem padrão: número decrescente | LEITOR | `200` página de `TransferenciaResumo` |
| `GET /api/transferencias/{id}` | Detalhe com os itens | LEITOR | `200` `TransferenciaDetalhe` |
| `GET /api/transferencias/autores` | Usuários que já criaram transferências (opções do filtro "criado por") | LEITOR | `200` `[{ "id", "nome" }]` |
| `POST /api/transferencias` | Cria a transferência e os itens | TECNICO | `201` `TransferenciaDetalhe` |
| `PUT /api/transferencias/{id}` | Altera o cabeçalho e os itens | TECNICO (autor) / ADMIN | `200` `TransferenciaDetalhe` |
| `DELETE /api/transferencias/{id}` | Move para a lixeira, **com os itens**: eles saem da listagem, da busca por patrimônio e do painel, mas ficam guardados para a restauração | TECNICO (autor) / ADMIN | `204` |
| `GET /api/transferencias/lixeira` | Lixeira: o TECNICO vê só as próprias, o ADMIN vê todas. Ordem: exclusão mais recente | TECNICO | `200` página de `TransferenciaResumo` |
| `POST /api/transferencias/{id}/restaurar` | Tira da lixeira | TECNICO (autor) / ADMIN | `204` |
| `DELETE /api/transferencias/{id}/definitivo` | Exclui de forma permanente o termo **e todos os seus itens**, **apenas se estiver na lixeira** | TECNICO (autor) / ADMIN | `204` |
| `GET /api/transferencias/{id}/termo` | Termo de Transferência em PDF (ver abaixo) | LEITOR | `200` `application/pdf` |

### Termo em PDF

`GET /api/transferencias/{id}/termo?formato=RETRATO&download=false`

| Parâmetro | Valores | Padrão | Efeito |
|---|---|---|---|
| `formato` | `RETRATO`, `PAISAGEM` | `RETRATO` | `RETRATO`: uma via por folha A4. `PAISAGEM`: duas vias lado a lado numa A4 deitada, como no sistema antigo |
| `download` | `true`, `false` | `false` | `false` abre no navegador (`inline`); `true` força o download (`attachment`) |

- **Nome do arquivo:** `Termo <número> - <origem> - <destino>.pdf`.
- **Paginação:** com muitos itens, o termo ocupa várias páginas, repetindo o cabeçalho (logo, partes, motivo) e o rodapé (assinaturas) em cada uma.
- **Visibilidade:** a mesma do detalhe; uma transferência na lixeira retorna `404` para quem não pode alterá-la.
- **Uso no frontend:** como a rota exige o token, baixe o PDF com `fetch` (enviando o cabeçalho `Authorization`) e abra o resultado com `URL.createObjectURL(blob)`.

### Filtros da listagem

Todos são opcionais e se combinam entre si (E).

| Parâmetro | Exemplo | Efeito |
|---|---|---|
| `busca` | `notebook` | Procura, sem diferenciar maiúsculas e minúsculas, em: unidades de origem e destino, instituição, autor, responsáveis, descrição do motivo, e descrição, patrimônio e observação dos itens. **Se for um número, também encontra a transferência com esse número** |
| `instituicaoId`, `origemId`, `destinoId` | `2` | Igualdade |
| `criadoPorId` | `3` | Transferências criadas por esse usuário |
| `minhas` | `true` | Só as do usuário logado |
| `motivo` | `MANUTENCAO` | Igualdade |
| `dataInicial`, `dataFinal` | `2026-01-31` | Intervalo de datas da transferência (inclusivo) |

Também aceita a paginação padrão (`page`, `size`, `sort`). Ordenar por um campo inexistente retorna `400`.

### Corpo de `POST` e `PUT`

```json
{
  "data": "2026-10-06",
  "motivo": "TRANSFERENCIA_ENTRE_FILIAIS",
  "instituicaoId": 1,
  "origemId": 1,
  "destinoId": 3,
  "responsavelEnvio": "Fabrizio de Farias",
  "responsavelRecebimento": "Débora Noronha",
  "itens": [
    { "id": 120, "descricao": "Notebook Dell Latitude", "patrimonio": "36102", "observacao": "Com fonte" },
    { "descricao": "Teclado USB", "patrimonio": "S/P" }
  ]
}
```

- **Regras e validações.**
  - Origem e destino **precisam pertencer à instituição** informada; caso contrário, `422`.
  - A instituição e as unidades de origem e destino **não podem estar bloqueadas**: responde `422` com `A instituição X está bloqueada para uso` ou `A unidade X está bloqueada para uso`. A exceção é editar uma transferência que já as usa, sem trocá-las.
  - Origem igual ao destino é permitida (há 28 casos assim no histórico).
  - Entre 1 e 500 itens.
  - Tamanhos máximos: descrição 200, patrimônio 150, observação 5000 caracteres.
- **Normalizações** (as mesmas do sistema antigo):
  - Responsáveis ganham maiúscula em cada palavra e perdem espaços extras.
  - A descrição começa com maiúscula.
  - Patrimônio `S/P`, `s/p` ou vazio é gravado como `null` (sem patrimônio).
  - Observação vazia é gravada como `null`.
- **Itens na edição** (`PUT`):
  - Um item **com `id`** atualiza aquele item.
  - Um item **sem `id`** é incluído.
  - Itens que **não vierem na lista** são removidos.
  - A ordem da lista define a numeração no termo.
  - Um `id` que não pertence à transferência, ou repetido, retorna `422`.
- Transferência na lixeira não pode ser editada (`422`); é preciso restaurá-la antes.

### Objetos de resposta

`TransferenciaResumo` (listagens):

```json
{
  "id": 707,
  "data": "2026-06-12",
  "motivo": "TRANSFERENCIA_ENTRE_FILIAIS",
  "instituicao": { "id": 2, "nome": "SENAI" },
  "origem": { "id": 6, "nome": "CETCC", "imagemUrl": "/api/unidades/6/imagem" },
  "destino": { "id": 7, "nome": "SCM - UNIDADE MÓVEL", "imagemUrl": "/api/unidades/7/imagem" },
  "responsavelEnvio": "Karla Beatriz De Jesus",
  "responsavelRecebimento": "...",
  "criadoPor": { "id": 19, "nome": "Thalia Almeida" },
  "quantidadeItens": 3,
  "criadoEm": "2026-06-12T13:10:00Z",
  "excluidoEm": null
}
```

`TransferenciaDetalhe` tem os mesmos campos, exceto `quantidadeItens`, e acrescenta:

- `itens`: `[{ "id", "ordem", "descricao", "patrimonio", "observacao" }]`, em ordem
- `atualizadoEm`
- `podeAlterar`: indica se o usuário logado pode editar, excluir ou restaurar. Use para mostrar ou esconder os botões no frontend.

Uma transferência na lixeira só é visível (detalhe, restaurar, excluir) para o autor e para administradores. Para os demais, retorna `404`.

---

## Painel de análise: `GET /api/painel` (todos os perfis)

Agregados para o painel. Considera só transferências **fora da lixeira**, pela data da transferência.

| Parâmetro | Padrão | Efeito |
|---|---|---|
| `dataInicial`, `dataFinal` | últimos 12 meses (do 1º dia de 11 meses atrás até hoje) | Intervalo analisado, inclusivo. Data inicial depois da final retorna `422` |
| `instituicaoId` | todas | Restringe a uma instituição |

Resposta (resumida):

```json
{
  "periodo": { "inicio": "2025-11-01", "fim": "2026-10-07" },
  "periodoAnterior": { "inicio": "2024-11-25", "fim": "2025-10-31" },
  "resumo": { "transferencias": 168, "itens": 1139, "itensSemPatrimonio": 261, "unidadesEnvolvidas": 16,
              "transferenciasAnterior": 256, "itensAnterior": 2131 },
  "porMes": [{ "mes": "2025-11", "transferencias": 27, "itens": 210 }, ...],
  "porMotivo": [{ "motivo": "TRANSFERENCIA_ENTRE_FILIAIS", "descricao": "Transferência entre filiais", "transferencias": 141, "itens": 980 }, ...],
  "porInstituicao": [{ "id": 2, "nome": "SENAI", "transferencias": 98, "itens": 726 }, ...],
  "principaisOrigens": [...], "principaisDestinos": [...],
  "principaisRotas": [{ "origem": "SEDE", "destino": "CETCC", "transferencias": 23, "itens": 349 }, ...],
  "principaisEmissores": [...],
  "bensMaisTransferidos": [{ "descricao": "DELL PRO MICRO QCM1250", "itens": 167, "transferencias": 6 }, ...]
}
```

- **`periodoAnterior`:** tem a mesma duração do período, imediatamente antes dele. Serve para calcular as variações do `resumo`.
- **`porMes`:** traz todos os meses do período, inclusive os sem movimento, com zero. Em "todo o histórico" (intervalo longo), começa no primeiro mês com dados.
- **`porMotivo`:** traz sempre os quatro motivos, na ordem do sistema.
- **Rankings:** origens, destinos e emissores trazem os 8 primeiros; rotas e bens, os 10 primeiros.
- **`bensMaisTransferidos`:** agrupa as descrições sem diferenciar maiúsculas e espaços, e exibe a grafia mais frequente.
