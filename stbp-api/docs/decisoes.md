# Registro de decisões

As decisões técnicas do projeto e o motivo de cada uma, da mais recente para a mais antiga.

---

### D-037 · Painel de análise geral
**2026-10-06 (pedido do usuário).**
- **Endpoint:** `GET /api/painel` calcula no banco (SQL agregado) os indicadores do período e do período anterior equivalente, a evolução mensal, os motivos, as instituições, as unidades de origem e destino, as rotas, os emissores e os bens mais transferidos. Um único pedido alimenta a tela inteira.
- **Escopo:** exclui a lixeira e está disponível a todos os perfis, porque é somente leitura.
- **Tela:** `/painel`, desenhada segundo as regras de visualização registradas em `stbp-web/docs/design.md` § Painel e gráficos. As cores dos dados foram validadas com o validador de paleta.
- **Correção encontrada no caminho:** mudanças seguidas de filtro (período e depois instituição) se sobrescreviam, porque o seletor do Mantine guardava uma versão antiga da função de atualização da URL. Agora os filtros, do painel e da listagem de transferências, partem da URL atual do navegador. Um teste de ponta a ponta cobre o caso.

### D-036 · Identidade visual mais sóbria (revisão da D-032)
**2026-10-06 (pedido do usuário: "está bom, mas quero melhor e um pouco mais sério").**
- **Cor:** marinho mais escuro e dessaturado; menu lateral em grafite-marinho quase preto, com indicador ativo neutro.
- **Cantos:** 2 px.
- **Marcadores:** etiquetas coloridas substituídas por **marcadores** (quadrado de 8 px + texto em tom normal). A cor passa a ser sinal, não enfeite.
- **Navegação:** **trilha** no cabeçalho, no lugar de sobretítulos e links "voltar".
- **Cartões:** viraram **fichas** com campos rotulados, e a foto ficou menor e levemente dessaturada.
- **Login:** perdeu a grade decorativa e ganhou o aviso de acesso restrito.

O guia está atualizado em [stbp-web/docs/design.md](../../stbp-web/docs/design.md).

### D-035 · Cadastros com vínculos não são excluídos: são bloqueados
**2026-10-06 (pedido do usuário).** Estende a D-033 a todos os cadastros: **instituições, unidades e usuários com transferências não podem ser excluídos**, apenas bloqueados.
- **Unidades:** ganharam `ativa` (V5), com bloquear e desbloquear. Uma unidade bloqueada não pode ser origem nem destino de transferências novas. Ao editar uma transferência antiga, origem e destino bloqueados podem ser mantidos. As 16 unidades migradas já têm transferências, então para elas o bloqueio é a única opção.
- **Usuários:** quem criou transferências não vai para a lixeira (`409`). Fica bloqueado, sem acesso. Quem nunca criou continua podendo ir para a lixeira e ser restaurado, como no sistema antigo.
  - **Por que:** o histórico registra o autor de cada termo.
  - **Dados existentes:** usuários excluídos com transferências passam a bloqueados, tanto na V5 (bancos já migrados) quanto no script de migração do legado. No dump atual, isso afetou 1 usuário.
- **Na tela:** as respostas da API trazem `emUso`. As telas desabilitam "Excluir" e explicam o motivo ("bloqueie em vez de excluir").

### D-034 · Gerador de itens com patrimônio sequencial
**2026-10-06 (pedido do usuário).** Uma transferência pode ter lotes grandes de bens iguais, como 100 computadores com patrimônio sequencial. O formulário ganhou **"Gerar itens em sequência"**: o usuário informa descrição, quantidade, patrimônio inicial e, opcionalmente, uma observação, e os itens são gerados com um clique.
- **Regra do patrimônio:** incrementa a parte numérica do final, mantendo prefixo e zeros à esquerda (`0900001` → `0900100`, `NB-0010` → `NB-0011`). Usa `BigInt`, para não perder precisão em números de série longos.
- **Validações:** o patrimônio inicial precisa terminar em número, o limite de 500 itens é respeitado, e o sistema avisa quando um patrimônio já está na lista.
- **Onde fica:** só no frontend. A API recebe os itens como sempre, sem endpoint novo.
- **Desempenho:** para o formulário continuar fluido com centenas de linhas, os itens saíram do `useForm` e ficaram num estado que só substitui a linha alterada, e as linhas são memorizadas. Com 100 itens, a digitação caiu de cerca de 200 para cerca de 35 ms por tecla.
- **Testes:** a regra de sequência tem testes unitários (Vitest), e o fluxo completo de 100 itens tem teste de ponta a ponta.

### D-033 · Instituição em uso é bloqueada, não excluída; imagens enviadas no próprio formulário
**2026-10-06 (pedido do usuário).**
- **Bloqueio em vez de exclusão:** uma instituição usada em transferências não pode ser excluída, porque o histórico e os termos dependem dela. Ela é **bloqueada para uso** (`instituicao.ativa`, V4).
  - **O que muda:** some do formulário de novas transferências, e a API recusa o uso dela (`422`).
  - **O que continua:** os filtros (com o rótulo "bloqueada"), o detalhe, a edição das transferências antigas (sem trocar a instituição) e os termos em PDF.
  - **Na tela:** a resposta traz `emUso`, e a interface só habilita "Excluir" para instituições nunca usadas.
- **Imagens no formulário:** a logo da instituição e a foto da unidade agora são escolhidas no próprio formulário de cadastro e edição, com pré-visualização, e enviadas ao salvar (componente `CampoImagem`).
  - **Problema da versão anterior:** a imagem só podia ser enviada depois do cadastro, por um ícone na lista, que ficava ao lado de um ícone muito parecido de "remover". No banco local, a logo da SENAI chegou a ser removida dessa forma e foi restaurada a partir do arquivo original.

### D-032 · Identidade visual institucional, com temas claro e escuro
**2026-10-06 (pedido do usuário: sistema bonito, sério, não "fofo" nem arredondado demais, com tema escuro).**
- **Cor e tipografia:** azul-marinho institucional como cor principal; IBM Plex Sans na interface e IBM Plex Mono em números de documento.
- **Forma:** cantos de 2 a 4 px, sombras mínimas.
- **Estrutura:** menu lateral marinho e cabeçalho de página padronizado em todas as telas. O login tem um painel institucional ao lado do formulário.
- **Tema escuro:** paleta de ardósia, segue o sistema operacional por padrão e tem botão de alternância.
- **Fontes:** servidas pela própria aplicação, sem Google Fonts.

O design system está documentado em [stbp-web/docs/design.md](../../stbp-web/docs/design.md).

### D-031 · Fotos das unidades de volta, redimensionadas (substitui a D-022)
**2026-10-06 (pedido do usuário).** No sistema antigo, cada transferência aparecia num cartão com a foto da unidade de destino. A D-022 tinha descartado as fotos por serem "decorativas", o que foi um erro: elas fazem parte da forma como os usuários reconhecem as transferências. Agora:
- **Banco:** a foto fica em `unidade.imagem` (V3), no mesmo mecanismo da logo (`ImagemRepository`, `GET` público).
- **Upload:** aceita PNG ou JPEG de até 20 MB e grava **JPEG de até 1200 px** no lado maior, com a rotação EXIF das fotos de celular aplicada. Com isso, a foto de 18 MB do sistema antigo vira 220 KB.
- **Migração:** o mesmo redimensionamento é feito com ImageMagick, num container temporário (`migracao/carregar-imagens.sh`, que também pode ser rodado sozinho sobre um banco já migrado).
- **Fidelidade:** os vínculos foram migrados como estavam. O CEFEM usa a foto do CETICC, e o JBR a do CETAF-EST; o script avisa, e a correção é feita na tela **Unidades**.
- **Frontend:** listagem e lixeira em **cartões** (padrão, como no sistema antigo) ou em tabela; o detalhe mostra as fotos de origem e destino.

### D-030 · Backup diário com `pg_dump` e retenção de 30 dias
**2026-10-06.**
- **Como:** o `implantacao/backup.sh` gera um dump no formato *custom* (compactado, restaurável tabela a tabela) e apaga os arquivos com mais de 30 dias. O agendamento é feito pelo cron do servidor.
- **Validação:** o dump foi gerado e restaurado num banco de teste, com os mesmos totais.
- **Cópia externa:** levar os arquivos para fora do servidor fica a cargo da infraestrutura da FIES. O guia alerta para isso.

### D-029 · Token no `localStorage`
**2026-10-06.** O frontend guarda o JWT no `localStorage`. Assim, a sessão sobrevive a recarregar a página e a abrir novas abas, durante as 8 horas de validade do token.
- **Risco conhecido:** um script malicioso injetado na página poderia ler o token.
- **Mitigações:** o React escapa todo conteúdo exibido; não há HTML vindo de usuários; o nginx envia cabeçalhos de segurança. Ainda assim, bloquear um usuário derruba a sessão na hora (D-013).
- **Alternativa descartada por ora:** cookie `HttpOnly` com proteção CSRF. Seria mais restritivo, mas complica a API stateless.

### D-028 · Produção em Docker Compose, com nginx na frente (mesma origem)
**2026-10-06 (servidor Linux com Docker, escolha do usuário).**
- **Pilha:** Postgres, API e web, em [`implantacao/compose.yaml`](../../implantacao/compose.yaml).
- **Porta única:** só o nginx publica porta. Ele serve as telas e encaminha `/api` para a API. Telas e API ficam no mesmo endereço, então não há CORS para configurar, e a API e o banco ficam fora do alcance da rede.
- **Ordem de subida:** os serviços têm health check e sobem em ordem (banco → API → web).
- **Validação:** o pacote foi testado em homologação com o dump real, senhas aleatórias e os testes Playwright.

### D-027 · Frontend em React + TypeScript com Mantine
**2026-10-06 (React + TypeScript: escolha do usuário).**
- **Mantine:** fornece formulários com listas dinâmicas (os itens), seletor de datas em português, modais e notificações, sem precisar montar um design system próprio.
- **TanStack Query:** cuida do cache e da sincronização com a API.
- **Filtros na URL:** os filtros da listagem ficam na URL, então uma busca pode ser compartilhada por link.
- **Testes:** testes de ponta a ponta com Playwright, contra a aplicação real.

### D-026 · Número do termo e paginação impressos no rodapé
**2026-10-06.** O termo antigo não imprimia o número da transferência nem a paginação. Assim, um termo em papel não podia ser localizado no sistema, e não havia como saber se faltava uma folha. O rodapé agora traz "Termo nº 707 · página 1 de 2" ao lado do código do formulário FM-008-SCI-04. O restante do layout foi mantido.

### D-025 · Fonte Carlito no lugar da Calibri
**2026-10-06.** O termo antigo usava Calibri, que é proprietária e não pode ser distribuída nem embutida no PDF fora do Windows. A Carlito tem licença livre (SIL OFL, em `resources/pdf/fontes/OFL.txt`) e é *métrica-compatível* com a Calibri: cada caractere ocupa a mesma largura. Por isso o texto quebra nos mesmos pontos e o layout fica igual.

### D-024 · Cadastro de instituições e unidades pela API (substitui a D-021)
**2026-10-06 (pedido do usuário).** Instituições e unidades ganharam CRUD na API, base para as telas de cadastro. Só ADMIN e SUPERADMIN alteram; todos consultam.
- **Nomes em maiúsculas:** como todos os existentes e como aparecem no termo.
- **Exclusão:** recusada (`409`) se o registro for usado em alguma transferência, para preservar o histórico. Excluir uma instituição sem transferências remove também os vínculos dela com unidades.
- **Ids:** passaram a ser gerados pelo banco; as sequências já continuam a partir dos ids migrados.

### D-023 · Logo da instituição guardada no banco e enviada pela API
**2026-10-06.** A logo sai impressa no termo, então precisa ser gerenciável junto com o cadastro.
- **Onde fica:** na própria tabela `instituicao` (`logo bytea` + `logo_tipo`), com upload via API. São arquivos pequenos (25 a 54 KB), poucos registros e nenhuma pasta de arquivos para configurar ou fazer backup à parte.
- **Leitura sem carregar os bytes:** os bytes não são mapeados na entidade JPA; são lidos sob demanda por `LogoRepository`.
- **Formatos:** apenas PNG e JPEG, detectados pelo conteúdo do arquivo e não pelo cabeçalho do navegador, com até 1 MB.
- **Acesso público:** o `GET` da imagem é público, porque `<img src>` não envia token e a logo não é sigilosa.

A migração lê as logos de `public/img/instituicao` do sistema antigo (migração Flyway `V2`).

### D-022 · ~~Fotos das unidades não são migradas~~ (substituída pela D-031)
**2026-10-06.** No sistema antigo, cada unidade tinha uma foto, usada apenas como decoração nos cards da listagem. As fotos não foram migradas, e a coluna foi removida (V2):
- **Dados errados:** algumas estavam incorretas. O CEFEM mostrava a foto do CETICC, e o JBR a do CETAF-EST.
- **Tamanho:** chegavam a 18 MB por arquivo.
- **Valor:** não aparecem no termo.

O frontend pode usar um ícone padrão. Se a foto voltar a ser desejada, entra com o mesmo mecanismo da logo (D-023), com redimensionamento no upload.

### D-021 · ~~Instituições e unidades sem cadastro pela API~~ (substituída pela D-024)
**2026-10-06.** Previa manter instituições e unidades apenas via SQL, como no sistema antigo.

### D-020 · Busca textual corrigida e ampliada
**2026-10-06.**
- **Correção:** no sistema antigo, os `orWhere` da busca ficavam fora do agrupamento. Com uma palavra-chave preenchida, os demais filtros (instituição, unidade, datas…) deixavam de valer. Agora a busca é um único bloco OU, combinado com E aos outros filtros (há um teste de regressão para isso).
- **Ampliação:** a busca também encontra o **número** da transferência e a **descrição do motivo**.

### D-019 · Edição de itens identificada por id
**2026-10-06.** No sistema antigo, a edição casava os itens enviados com os existentes **pela posição na lista**. Remover um item do meio fazia os seguintes herdarem os ids errados. Agora cada item enviado traz seu `id`: com id, o item é atualizado; sem id, é incluído; os ausentes são removidos. A ordem da lista define a numeração no termo.

### D-018 · Lixeira: exclusão definitiva só a partir dela; ADMIN vê a de todos
**2026-10-06.** No sistema antigo era possível excluir definitivamente uma transferência ativa, e a lixeira mostrava só as do próprio usuário, mesmo para administradores, que podiam restaurar mas não encontravam as transferências dos outros. Agora:
- A exclusão definitiva exige que a transferência esteja na lixeira.
- O ADMIN vê a lixeira completa.
- Quem não pode alterar uma transferência na lixeira recebe `404`.

### D-017 · Unidades devem pertencer à instituição; origem = destino é permitido
**2026-10-06.** Conferido nos 703 registros migrados:
- **Pertencimento à instituição:** 100% das transferências usam unidades da instituição escolhida (o formulário antigo já filtrava). A regra passou a ser validada na API.
- **Origem igual ao destino:** há 28 casos no histórico, provavelmente movimentações internas ou manutenção. Por isso continua permitido.

### D-016 · Quantidade de itens calculada na consulta
**2026-10-06.** A listagem mostra a quantidade de itens de cada transferência. Ela é calculada por subconsulta (`@Formula`), sem carregar os itens. Os relacionamentos são carregados em lote (`default_batch_fetch_size=50`) para evitar o problema de N+1 consultas. Medição com os dados migrados: listagem em cerca de 80 ms e busca textual em cerca de 50 ms.

### D-015 · Proteções contra auto-bloqueio e transições de status explícitas
**2026-10-06.** Ninguém bloqueia, exclui ou restaura a si mesmo, nem altera o próprio perfil. Assim um ADMIN não fica sem acesso por engano, e o último SUPERADMIN não pode se rebaixar. Cada ação de status só vale a partir do status certo. No sistema antigo, "bloquear" e "desbloquear" eram o mesmo botão, que alternava o estado, e não havia essas proteções.

### D-014 · Limite de tentativas de login em memória
**2026-10-06.** São 5 tentativas por minuto para cada usuário + IP, como no sistema antigo (Fortify). O controle fica em memória, o que basta para uma instância só. Se a API rodar em várias instâncias, ele deve ir para um cache compartilhado (ex.: Redis). Usuário inexistente e senha errada têm a mesma resposta e tempo parecido (é comparado um hash fictício), para não revelar quais logins existem.

### D-013 · Usuário recarregado do banco a cada requisição
**2026-10-06.** O token carrega apenas o id do usuário. O perfil, o status e a troca de senha pendente são lidos do banco a cada requisição. Isso custa uma consulta por chave primária, que é barata com ~20 usuários. Em troca, bloquear, excluir, mudar o perfil ou redefinir a senha vale na hora, como os middlewares `BlockUser` e `IsFirstLogin` do sistema antigo. Também não é preciso manter uma lista de tokens revogados.

### D-012 · JWT assinado com HMAC (HS256), sem sessão
**2026-10-06.** A API é stateless, e o token é emitido pela própria aplicação com o suporte nativo do Spring Security (`oauth2-resource-server` + Nimbus). Não há dependência de biblioteca JWT externa nem de servidor de identidade. O segredo vem de `STBP_JWT_SEGREDO`. Se um dia houver SSO ou LDAP com um provedor externo, troca-se o emissor sem mudar o resto da API.

### D-011 · ADMIN não cria nem promove SUPERADMIN
**2026-10-06 (confirmado pelo usuário).** O ADMIN não pode criar usuários SUPERADMIN, promover alguém a SUPERADMIN, nem alterar usuários que já são SUPERADMIN. No sistema antigo, o ADMIN conseguia escolher o nível "superadministrador" ao criar ou editar usuários; só a edição de quem já era superadministrador era bloqueada. Agora só o SUPERADMIN gerencia SUPERADMINs.

### D-010 · Itens órfãos do legado são descartados
**2026-10-06.** 4 itens apontavam para saídas excluídas definitivamente: o MyISAM não apagou os itens junto. Sem a saída, esses itens não têm origem, destino nem data, então são descartados e listados no log da migração. Qualquer outro tipo de órfão continua abortando a migração.

### D-009 · Patrimônio como texto livre e opcional
**2026-10-06.** No legado, `patrimonio` às vezes contém vários números ("26281, 26292") ou números de série (até 101 caracteres). A coluna ficou `varchar(150)`, e `NULL` substitui os vários "s/p".
**Futuro:** avaliar *um item por patrimônio*, para permitir o histórico de cada bem.

### D-008 · PDF em paisagem montado a partir do termo em retrato
**2026-10-06 (implementado).** No sistema antigo, o termo em paisagem são duas cópias do termo lado a lado numa A4 deitada, feitas com um segundo conjunto de templates (`pdf-horizontal/*`).
- **Como foi feito:** a API tem um único template, o retrato (`resources/pdf/termo.xhtml`, Thymeleaf + OpenHTMLtoPDF). A paisagem é montada com PDFBox: cada página A4 é reduzida na escala A4 → A5 e desenhada duas vezes lado a lado.
- **Resultado:** só existe um layout para manter, e as duas vias saem sempre idênticas.

### D-007 · Motivo da transferência como enum
**2026-10-06.** O termo em PDF dependia de IDs fixos da tabela `motivos` (1 a 4) para marcar os quadros "Definitiva" e "Temporária". Isso já era um enum disfarçado. O enum no código carrega o texto e o tipo.

### D-006 · Perfil único por usuário, com o novo perfil LEITOR
**2026-10-06.** Ninguém usava várias permissions do *spatie* ao mesmo tempo, e as roles estavam vazias. O perfil virou uma coluna. A permission antiga `usuário` vira `LEITOR` (somente leitura), conforme decisão do usuário.

### D-005 · Status do usuário em um campo
**2026-10-06.** `is_blocked` e `deleted_at` viraram `status` (`ATIVO` / `BLOQUEADO` / `EXCLUIDO`), e `is_first_login` e `is_password_reset_by_adm` viraram `trocar_senha`. Cada par descrevia um único estado.

### D-004 · IDs preservados na migração
**2026-10-06.** Os números das transferências são a referência que os usuários já conhecem: aparecem nas telas e nos links do sistema antigo. Manter os IDs evita uma tabela de correspondência.
*Correção:* uma versão anterior deste registro dizia que o número saía impresso no termo, o que não acontecia no sistema antigo. Passou a sair na API (D-026).

### D-003 · Login local, com as senhas atuais
**2026-10-06 (confirmado pelo usuário: o login deve ser local; LDAP descartado).** O sistema antigo tinha o LdapRecord instalado, mas autenticava por senha local. A API mantém o login local, por login ou e-mail.
- **Senhas atuais continuam valendo:** os hashes BCrypt `$2y$` do Laravel são aceitos pelo `BCryptPasswordEncoder` do Spring, sem conversão.
- **Conferido nos dados migrados:** os 22 hashes estão em formato BCrypt válido, e os 14 usuários ativos entram direto, sem troca obrigatória de senha.
- **Teste automatizado:** usa um hash gerado pelo PHP (`password_hash`), igual ao do Laravel.

### D-002 · PostgreSQL + Flyway
**2026-10-06.** O usuário optou por migrar para PostgreSQL. O schema é versionado com Flyway. A migração dos dados usa o pgloader (MySQL → schema `legado`) e depois SQL puro (`legado` → modelo novo), o que deixa a conversão auditável e repetível.

### D-001 · Spring Boot 4 + Java 21 + Maven
**2026-10-06.** A API foi reescrita em Spring Boot. Usamos Maven com o wrapper (`./mvnw`) por ser declarativo e não exigir instalação; Java 21 é a LTS instalada no ambiente.
