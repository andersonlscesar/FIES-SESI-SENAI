# Registro de decisões

As decisões técnicas do projeto e o motivo de cada uma, da mais recente para a mais antiga.

---

### D-047 · Documentação do projeto em PDF
**2026-10-07 (pedido do usuário: "gere o pdf documentando todo o projeto e também seus endpoints").**
- **Fonte única:** o PDF não é escrito à parte. Ele é gerado dos mesmos arquivos Markdown do repositório (`npm run docs:pdf` em `stbp-web`), então acompanha a documentação. O único texto novo é a visão geral, em `documentacao/visao-geral.md`.
- **Endpoints conferidos:** a referência rápida é montada a partir do `api.md` e comparada com os `@GetMapping`, `@PostMapping` e demais anotações dos controllers. Uma divergência interrompe a geração. Na primeira geração, os 55 endpoints bateram.
- **Correções encontradas no caminho:**
  - Documentos que ainda falavam só em "transferências" nas regras de exclusão de instituições, unidades e usuários.
  - A estrutura de pacotes do README da API, sem `saida/` e `painel/`.
  - O diagrama do modelo de dados, sem as colunas das tabelas de saída.
  - O título da D-045, que tinha se perdido.

---

### D-046 · Formulário de saída idêntico ao FM-072-UOP-04 em papel
**2026-10-07 (pedido do usuário: "o relatório dessas saídas deve estar o mais idêntico possível com o que te enviei").**
- **Revisão da D-044:** a primeira versão do PDF reorganizava o formulário em quadros com faixa cinza ("Dados da saída" e "Tipo de saída"). Agora ele segue o papel.
- **Como foi medido:** as posições do texto, as linhas da tabela e as caixas foram extraídas do PDF original (`pdftotext -bbox` e os vetores da página) e reproduzidas em pontos. Uma comparação automática mostrou diferença de até 1 pt.
- **O que ficou igual ao papel:**
  - Papel Carta paisagem.
  - Fontes DejaVu Sans Condensed 10 pt no texto e DejaVu Sans Bold nos títulos, embutidas no PDF (licença livre, em `resources/pdf/fontes/LICENSE-DejaVu.txt`).
  - Caixa do logo e do título, e o título no alto da caixa.
  - DATA, DE e PARA com linha de preenchimento.
  - Tipos com as caixas soltas: PERMANENTE □ □ MANUTENÇÃO e TEMPORÁRIO □ □ EVENTO.
  - "OUTRO, QUAL:" com linha.
  - Tabela sem fundo cinza, com cabeçalho em negrito, os textos do original e as mesmas larguras de coluna.
  - No mínimo 4 linhas de itens, completando com linhas em branco.
  - Assinatura do portador e "Liberei…" / "Recebi…" com "Ciente".
  - FM-072-UOP-04 no rodapé.
- **O que foi corrigido do original:**
  - **Alinhamento:** "TEMPORÁRIO", "EVENTO" e "OUTRO" estavam deslocados. Agora ficam em coluna com "PERMANENTE" e "MANUTENÇÃO", e as caixas centradas no texto.
  - **Datas inteiras na linha:** a data do "Recebi…" fica na mesma linha, e as datas na observação não se partem ("15/10/2026" vai inteira para a linha seguinte).
  - **"Responsável da UOP":** no original, a legenda caía na página 2. Agora fica sob as duas linhas "Ciente".
  - **Grafia:** "ÍTEM" virou "ITEM", e "LABORATÓRIO" quebra depois da barra, não no meio da palavra.
- **Acréscimos do sistema:**
  - O nome do portador impresso sobre a linha de assinatura.
  - "Saída nº X · página n de m", em letra pequena, à direita do código do formulário.
- **Várias páginas:** o cabeçalho e o código se repetem em cada página. O cabeçalho da tabela se repete. As assinaturas vêm uma vez, logo após o último item, como no papel, sem se dividir entre páginas.

### D-045 · Saídas de materiais no painel
**2026-10-07 (pedido do usuário: "inclua também essas saídas de materiais no painel").**
- **Uma visão por vez:** o painel ganhou o seletor "Movimentação" (Transferências | Saídas de materiais), que fica na URL (`?visao=saidas`) junto com o período e a instituição. As duas modalidades não são somadas: são documentos diferentes, com motivos/tipos diferentes, e um total misturado não responderia a nenhuma pergunta real.
- **Endpoint próprio:** `GET /api/painel/saidas`, com os mesmos parâmetros e as mesmas regras do `GET /api/painel` (lixeira fora, período anterior de mesma duração, todos os perfis). As regras de período ficaram numa classe comum (`Periodos`).
- **O que muda em relação às transferências:**
  - O indicador "Itens sem patrimônio" deu lugar a **"Para destinos externos"**: a parte das saídas que vai para fora das unidades cadastradas.
  - **Por tipo de saída** mostra os cinco quadros do formulário, sempre na mesma ordem.
  - **Destinos mais frequentes** junta unidades e destinos externos no mesmo ranking. O destino externo aparece com o ícone de alfinete e é agrupado pelo texto, sem diferenciar maiúsculas e espaços ("Assistência Técnica XYZ" e "assistência técnica  xyz" contam juntos).
  - **Materiais mais frequentes** no lugar de "Bens mais transferidos".

 · Controle de Saída de Materiais (FM-072-UOP-04)
**2026-10-07 (pedido do usuário: "a empresa utiliza esse tipo de formulário para registrar transferências mais simples. Implemente esta modalidade. O relatório em anexo está todo desalinhado").**

Decisões do usuário:
- **De e Para:** DE é uma unidade cadastrada. PARA é uma unidade cadastrada ou um destino externo digitado (assistência técnica, local de evento).
- **Patrimônio:** não existe nesta modalidade, como no papel. A primeira versão tinha uma coluna opcional, que o usuário pediu para remover no mesmo dia: "nesse cenário não haverá patrimônios". A V6 foi ajustada antes de ser aplicada em qualquer banco. Na tela, a grade de itens sem coluna de patrimônio troca o gerador em sequência por "Adicionar vários iguais" e esconde as opções de patrimônio da seleção e da edição em lote.
- **Retorno:** só registrado, como no papel (a data prevista vai na observação do item). O controle de devolução fica para uma etapa futura.
- **Navegação:** menu próprio ("Saídas de materiais" e "Nova saída"), com a lixeira compartilhada em abas.

Como foi feito:
- **Modelo:** tabelas próprias (`saida_material`, `saida_material_item`, V6), em vez de um "tipo" dentro de `transferencia`. Os campos são diferentes: sem responsáveis, com tipo de saída, áreas por item, destino externo e portador. As restrições `CHECK` garantem destino único e "outro, qual" coerente com o tipo.
- **Numeração:** própria ("Saída nº 1"), independente dos termos de transferência.
- **Regras:** as mesmas da transferência (permissões, lixeira, bloqueios, sincronização dos itens).
- **Cadastros em uso:** instituições, unidades e usuários usados **só** em saídas também não podem ser excluídos (D-035).
  - **Correção no caminho:** a exclusão consultava repositórios que olhavam só as transferências, e excluir uma unidade usada apenas numa saída dava erro 500 de chave estrangeira. A regra passou a usar a fórmula `emUso` da entidade, que é única e cobre os dois casos.
- **PDF:** refeito do zero em A4 paisagem, com todas as medidas em mm, colunas de largura fixa (`colgroup` e `table-layout: fixed`) e dois quadros simétricos de mesma altura ("Dados da saída" e "Tipo de saída"). *Substituído pela D-046: o PDF agora reproduz o formulário em papel.*
  - **O que corrige do formulário original:** o rótulo "Responsável da UOP" deslocado para a página 2, as caixas de seleção desencontradas e as colunas de largura irregular.
  - **Assinaturas e cabeçalho:** repetidos em cada página. A renderização foi extraída para `comum/GeradorPdf`, compartilhado com o termo de transferência.
- **Tela:** a grade de itens do formulário de transferência (filtro, seleção, edição em lote, gerador em sequência) virou o componente `GradeItens`, com colunas configuráveis. Na saída, ele ganha as áreas de saída e entrada, também no gerador e na edição em lote.

### D-043 · Edição em lote dos itens no formulário
**2026-10-07 (pedido do usuário: "esqueci de colocar a observação em vários itens, gostaria de em uma vez só aplicar a observação").**
- **Seleção:** caixa por linha, "selecionar todos os visíveis" no cabeçalho, Shift+clique para intervalos e seleções rápidas (sem observação, sem patrimônio, sem descrição, inverter). A seleção é guardada pela chave do item, então sobrevive a reordenações.
- **"Editar selecionados":** altera observação, descrição e patrimônio de uma vez.
  - **Observação:** três modos; o padrão é "só nos sem observação", que resolve o caso relatado sem sobrescrever o que já foi digitado.
  - **Patrimônio:** renumera em sequência (o mesmo gerador da D-034) ou marca S/P, e avisa sobre repetições.
- **Também:** remover os selecionados e filtrar a grade, com o mesmo filtro do detalhe (D-041).
- **Por que no navegador:** tudo acontece no estado do formulário, sem nada novo na API. O lote só vai ao servidor ao salvar, como qualquer edição de item.
- **Desempenho:** a seleção usa `Set` imutável e linhas memorizadas. Marcar um item redesenha só aquela linha, e o teste de digitação com 100 itens continua abaixo do limite.
- **Correção encontrada no caminho:** o envio do modal "Gerar itens em sequência" se propagava, pela árvore do React (portais), até o formulário da transferência. Isso disparava a validação antes da hora e mostrava "Há itens sem descrição" no item 1. O modal agora interrompe a propagação, e o teste de ponta a ponta confere isso.

### D-042 · Menu e botões um tom mais escuros
**2026-10-07 (pedido do usuário: "não gostei da tonalidade do menu lateral, está muito claro").** O usuário escolheu escurecer o menu **e** os botões juntos, para que continuem iguais (D-040).
- **Cor:** `#194a92`, o tom 8 da mesma paleta, um degrau abaixo do `#2058ab` do site. Vale para os dois temas (`primaryShade` 8) e para o filete do login.
- **Contraste:** texto branco a 8,6:1, e todos os textos do menu continuam ≥ 4,5:1, inclusive no item ativo e no hover.
- **Gráficos:** continuam no `#2058ab` (`--stbp-dado`).

### D-041 · Filtro rápido nos itens da transferência
**2026-10-07 (pedido do usuário: "pode haver muitos itens e talvez seja necessário fazer uma busca rápida pelo item").**
- **Onde:** o detalhe da transferência ganhou um campo de filtro sobre a tabela de itens, exibido a partir de 6 itens.
- **Como filtra:** no navegador, sem nova chamada à API, porque o detalhe já traz todos os itens. Busca na descrição, no patrimônio (parte do número, ou "S/P" para os sem patrimônio), na observação e no nº do item ("7" ou "07"). Ignora acentos e maiúsculas, e com vários termos todos precisam casar ("dell 38491").
- **Na tela:** os trechos encontrados ficam destacados, o contador mostra "10 de 100 itens" e `Esc` limpa a busca.
- **Testes:** testes unitários em `filtroItens.test.ts` e um caso no teste de ponta a ponta dos 100 itens.
- **Correção no caminho:** no tema escuro, os botões vermelhos discretos ("Mover para a lixeira") apareciam quase brancos, por padrão do Mantine 9. Agora usam o vermelho tom 4.

### D-040 · Menu lateral no azul do SENAI-SE
**2026-10-07 (pedido do usuário: "o menu pode ter a cor do senai também").** Revê o ponto da D-038 que mantinha o menu em grafite.
- **Tema claro:** o menu usa `#2058ab`, a cor da barra de navegação de www.se.senai.br.
- **Tema escuro (revisto no mesmo dia):** a primeira versão usava `#122d57` no menu, e os botões usavam `#2f6cc7`. O usuário apontou que o menu não combinava com os botões. Agora menu e botões usam `#2058ab` nos dois temas (`primaryShade` 7 no claro e no escuro).
- **Legibilidade:** os textos do menu foram escolhidos por contraste calculado, sempre ≥ 4,5:1, inclusive nos rótulos pequenos de seção, no item ativo e no hover. O item ativo ganhou barra branca.
- **Login:** o painel lateral do login continua grafite.

### D-039 · Itens acompanham a transferência na exclusão
**2026-10-07 (pedido do usuário: "ao excluir uma saída, seus itens também devem ser excluídos").** No sistema antigo, excluir uma saída deixava os itens para trás: o dump tinha itens órfãos de saídas apagadas, descartados na migração.
- **Na API, os itens não existem fora do termo:**
  - **Lixeira:** a transferência vai com os itens. Eles saem da listagem, da busca por patrimônio e do painel, e voltam juntos na restauração. Por isso não são apagados nesse momento.
  - **Exclusão definitiva:** apaga o termo e os itens, pela cascata do JPA e também pela chave estrangeira `ON DELETE CASCADE` (V1). Mesmo uma exclusão feita direto no banco não deixa órfãos.
- **Teste:** `TransferenciaIntegracaoTest.itensAcompanhamATransferenciaNaLixeiraENaExclusao` confere as três etapas, consultando a tabela `item` diretamente.
- **Telas:** as confirmações de lixeira e de exclusão definitiva dizem quantos itens vão junto.

### D-038 · Azul institucional do SENAI-SE
**2026-10-07 (pedido do usuário: "o azul do site pode ser nesse tom", referindo-se a www.se.senai.br).**
- **Origem da cor:** `#2058ab`, o azul da barra de navegação e dos botões do site (o mais usado na folha de estilos). O rodapé e a faixa do topo usam `#1b62cc`, um tom mais claro e mais vivo, que não foi adotado.
- **Paleta:** a paleta principal `marinho` foi substituída por `azul`. O `#2058ab` é o tom 7 e o tom dos botões no tema claro. Os demais tons foram gerados em OKLCH com o mesmo matiz. No escuro, os botões usam o tom 6 `#2f6cc7`, que mantém 5,1:1 com texto branco.
- **Gráficos:** também passam a usar o azul institucional (`--stbp-dado`). A cor separada da D-037 existia só porque o marinho antigo tinha croma baixo demais.
- **O que não mudou:** o menu lateral continua grafite, com indicador neutro (D-036). O azul fica para a ação principal e para os dados, para não perder a sobriedade.

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
