# Design system do STBP

Direção visual: **institucional e sóbria**. É um sistema de controle patrimonial, então a interface deve transmitir confiabilidade, precisão e seriedade: nada "fofo", sem cantos arredondados e sem enfeites. A referência são sistemas financeiros e jurídicos: pouca cor, muita estrutura e dados com rótulo.

Implementação:
- [`src/tema.ts`](../src/tema.ts): tema do Mantine (cores, tipografia, raios, padrões dos componentes).
- [`src/estilos.css`](../src/estilos.css): tokens CSS dos temas claro e escuro e classes utilitárias.

## Princípios

1. **Hierarquia por contraste e espaço, não por enfeite.** Bordas finas de 1 px, sombras quase ausentes, fundo da área de trabalho um tom abaixo das superfícies.
2. **Cantos quase retos.** O raio padrão é de 2 px. Nada de pílulas.
3. **Cor é sinal, não enfeite.** Categorias e situações aparecem como **marcador** (quadrado de 8 px colorido + texto em tom normal), nunca como etiquetas coloridas (`Badge`). Agrupamentos neutros, como as instituições de uma unidade, usam a etiqueta de contorno `stbp-etiqueta`.
4. **Números são dados de documento.** O nº do termo, o patrimônio, as datas e a ordem dos itens usam fonte monoespaçada com algarismos tabulares (classe `stbp-numero`), para alinhar em colunas e não serem confundidos com texto.
5. **Uma cor de ação.** O azul institucional do SENAI-SE (tom 8) marca a ação principal de cada tela. O vermelho fica só para ações destrutivas, sempre com confirmação.
6. **Os dois temas são iguais em qualidade.** Toda cor nova entra como token com valor claro **e** escuro. Nunca use `bg="white"`, `bg="gray.1"` ou similares fixos.

## Tipografia

| Uso | Fonte | Detalhes |
|---|---|---|
| Interface | IBM Plex Sans (variável) | Família corporativa e técnica. Títulos com peso 600 |
| Números de documento | IBM Plex Mono 400/500 | Classe `stbp-numero` |
| Sobretítulos e cabeçalhos de tabela | Plex Sans 600, 11 px, caixa alta, espaçamento 0,06 a 0,08 em | Classes `stbp-sobretitulo` e `stbp-th` |

As fontes são **servidas pela própria aplicação** (pacotes `@fontsource`), sem Google Fonts. Assim funcionam numa intranet sem internet e não expõem os acessos a terceiros.

Escala de títulos: h1 28 px (login), h2 20 px (título de página), h3 18 px, h4 16 px.

## Cores

| Token / paleta | Claro | Escuro | Uso |
|---|---|---|---|
| `azul` (cor principal) | tom 8 `#194a92` | tom 8 `#194a92` | Botões principais, links, destaque. É o azul da barra de navegação de [se.senai.br](https://www.se.senai.br); os demais tons foram gerados em OKLCH com o mesmo matiz. O tom 8 fica um degrau abaixo do azul do site, porque o tom 7 ficou claro demais no menu. Texto branco sobre ele: 8,6:1. É o mesmo tom nos dois temas e no menu lateral |
| `dark` (ardósia) | — | `#0b0e13` … `#d5dae2` | Paleta do tema escuro: tons de ardósia, não preto puro |
| `--stbp-fundo` | `#f4f5f7` | `#0f1319` | Fundo da área de trabalho |
| `--stbp-lateral-fundo` | `#194a92` (azul-8) | `#194a92` | Menu lateral. Textos `--stbp-lateral-texto` e `--stbp-lateral-texto-fraco` com contraste ≥ 4,5:1 sobre o fundo, inclusive no item ativo e no hover |
| `--stbp-lateral-ativo-destaque` | `#ffffff` | `#ffffff` | Barra do item ativo do menu, com fundo branco a 12% |
| `--stbp-th-fundo` | `#f7f8fa` | `#161b23` | Fundo do cabeçalho das tabelas |
| `--stbp-borda` | `#dfe3e8` | `#2b323e` | Filetes divisórios internos |
| `--stbp-placeholder-*` | cinza-azulado claro | ardósia | Unidade sem foto |
| `--stbp-destaque-fundo` | `#fbe7a1` | `#5c4a12` | Fundo do trecho encontrado por um filtro (`<mark class="stbp-destaque">`), com o texto na cor normal |
| `--stbp-selecao-fundo` | `#eaf1fb` | `#17233a` | Fundo das linhas selecionadas na grade de itens do formulário |
| `--mantine-color-red-light-color` (só no escuro) | — | tom 4 `#ff8787` | Texto de botões vermelhos `subtle` e `light`. O Mantine 9 usa o tom 0 (quase branco), e a ação destrutiva deixava de parecer vermelha |

**Motivos da transferência:**

| Motivo | Cor | Natureza |
|---|---|---|
| Entre filiais | azul | definitiva |
| Baixa/Descarte | vermelho | definitiva |
| Manutenção | laranja | temporária |
| Empréstimo | verde-azulado | temporária |

Os motivos aparecem com o componente `Marcador`. O quadrado usa o tom 8 da paleta no tema claro e o tom 5 no escuro; o texto fica na cor normal. Situações: Ativa (verde, quadrado cheio), Bloqueada ou Excluída (cinza, quadrado vazado).

## Raios e sombras

| Token | Valor | Uso |
|---|---|---|
| `xs`, `sm` | 2 px | **padrão**: botões, campos, cartões, painéis, menus, modais, tooltips |
| `md`, `lg`, `xl` | 3, 4, 6 px | raramente; evite |

As sombras aparecem só em elementos flutuantes (menus, modais). Os cartões não ganham sombra no hover, só uma borda mais escura.

## Componentes e padrões

- **Trilha de navegação** (`Trilha`), no cabeçalho da aplicação: "Patrimônio / Transferências / Nº 707". Os níveis anteriores são links; o atual fica em destaque. Ela substitui o sobretítulo e o link "voltar" das páginas. Nova rota → incluir em `Trilha.tsx`.
- **Cabeçalho de página** (`CabecalhoPagina`): título (20 px), marcadores opcionais ao lado, descrição de uma linha e ações à direita, fechado por um filete inferior. **Toda tela usa esse componente.**
- **Painéis com título:** título em peso 600 numa faixa separada por filete (ex.: "Dados do termo", "Itens transferidos").
- **Detalhe:** fotos origem → destino no topo, itens à esquerda e um painel "Dados do termo" à direita, dividido em seções (Transferência, Responsáveis, Registro).
- **Cartões de transferência**, em formato de **ficha**:
  - **Capa:** foto do destino, baixa (112 px) e levemente dessaturada, com véu escuro em degradê para garantir a leitura do texto branco.
  - **Etiquetas sobre a foto:** nº do termo (monoespaçado) e instituição, retangulares e semitransparentes.
  - **Corpo:** grade de campos com rótulo em caixa alta (Data, Motivo, Envio, Recebimento, Emitido por).
  - **Rodapé:** quantidade de itens e há quanto tempo foi gerado, separado por filete.
- **Tabelas:** cabeçalho em caixa alta sobre fundo sutil (`--stbp-th-fundo`), números tabulares e linhas zebradas apenas em listas de itens.
- **Imagens em formulários** (`CampoImagem`):
  - **Pré-visualização:** mostra a imagem atual ou a escolhida.
  - **Botões nomeados:** "Escolher", "Trocar" e "Remover", em vez de ícones soltos na lista.
  - **Validação no navegador:** confere tipo e tamanho antes do envio.
  - **Envio ao salvar:** a imagem só é enviada quando o formulário é salvo.
  - **Ajuste:** logo com `contain` (sem cortar), foto com `cover`.
- **Ações de linha:** ficam num menu "⋯". Ações destrutivas vão por último, separadas por um divisor e em vermelho. Uma ação indisponível aparece desabilitada, com o motivo numa dica (ex.: "Já usada em transferências: bloqueie em vez de excluir").
- **Filtro rápido de itens:** no detalhe da transferência, a partir de 6 itens. Filtra na hora, sem ir à API, por descrição, patrimônio (parcial ou "S/P"), observação ou nº do item. A busca ignora acentos e maiúsculas, e todos os termos precisam casar. Os trechos encontrados ficam destacados, o cabeçalho mostra "10 de 100 itens" e `Esc` limpa a busca. A lógica fica em `componentes/filtroItens.ts`, com testes unitários.
- **Grade de itens (`componentes/itens/GradeItens.tsx`):** é a mesma nos formulários de transferência e de saída de materiais, e só as colunas mudam (`ColunaItem[]`). Na saída, as áreas de saída e entrada aparecem também no gerador e na edição em lote. Sem coluna de patrimônio, a grade troca o gerador em sequência por "Adicionar vários iguais" e esconde as opções de patrimônio.
- **Edição em lote dos itens (formulário):** cada linha tem uma caixa de seleção; Shift+clique seleciona o intervalo desde o último item clicado. O menu "Selecionar" oferece todos, sem observação, sem patrimônio, sem descrição, inverter e nenhum, sempre entre os itens visíveis (respeita o filtro).
  - **Barra de ações:** com itens selecionados, a barra mostra "N selecionados", "Editar selecionados", "Remover" e "×". Ela fica presa no topo ao rolar listas longas (`stbp-barra-itens`), e as linhas selecionadas ganham o fundo `--stbp-selecao-fundo`.
  - **"Editar selecionados":** cada campo só é aplicado se estiver marcado.
    - Observação: só nos itens sem observação (padrão), substituir em todos ou acrescentar ao final, separando com "; ".
    - Descrição.
    - Patrimônio: numerar em sequência, na ordem da lista, ou marcar como S/P.
  - **Pré-visualização:** o botão diz quantos itens mudam de fato ("Aplicar a 19 itens"). A lógica fica em `componentes/edicaoLote.ts`, com testes unitários.
  - **Filtro no formulário:** recalculado só quando a busca ou a quantidade de itens muda, para que um item não suma da tela enquanto é editado.
- **Menu lateral:** azul do SENAI-SE, como a barra de navegação do site. O tom é o mesmo dos botões principais, nos dois temas. O item ativo é marcado por uma barra branca de 2 px à esquerda e fundo levemente mais claro. A marca usa símbolo em contorno.
- **Login:** painel liso em grafite com filete superior no azul institucional, título, descrição e o aviso "Acesso restrito a usuários autorizados…", sem padrões decorativos.
- **Ícones:** Tabler, traço 1,6, tamanho 16 a 18 px.

## Painel e gráficos

Regras seguidas pelo painel (`/painel`) e por qualquer gráfico novo:

- **Forma:**
  - Números de destaque → **indicadores** (cartões com valor, variação e contexto), não gráficos.
  - Evolução no tempo → **colunas** por mês.
  - Rankings → **barras horizontais** com rótulo e valor sempre visíveis, ou tabela com barra embutida.
  - Sem pizza nem rosca.
- **Um eixo só:** transferências e itens têm escalas diferentes, então ficam em seletor (um ou outro), nunca juntos em dois eixos.
- **Cor dos dados:** série única em `--stbp-dado`, o próprio azul institucional: tom 7 `#2058ab` no claro e tom 5 `#447fd8` no escuro, com trilho `--stbp-dado-trilho`.
  - **Croma:** o azul do SENAI tem croma 0,145, acima do piso de 0,1. Por isso, ao contrário do antigo marinho, não é lido como cinza e serve aos gráficos sem uma cor separada. O cinza fica reservado para o que está fora de foco.
  - **Contraste contra as superfícies reais:** 6,9:1 sobre `#ffffff` e 4,2:1 sobre `#191e27`, ambos acima do mínimo de 3:1.
  - **Motivos:** aparecem com o `Marcador` no rótulo, e as barras continuam numa cor só.
- **Variação neutra:** "+12% vs. período anterior" usa seta e texto em tom secundário, sem verde ou vermelho, porque mais transferências não é bom nem ruim.
- **Marcas:**
  - Colunas de até 24 px, com ponta levemente arredondada e base reta.
  - Grade só horizontal, em filete contínuo, sem tracejado.
  - Sem legenda numa série única: o título do cartão diz o que é.
- **Acessibilidade:**
  - **Tabela equivalente:** todo gráfico tem uma ("Ver tabela").
  - **Valores sem depender do mouse:** os rankings já mostram os valores, e o tooltip só complementa.
- **Filtros:** ficam numa linha acima de tudo e na URL, e recortam todos os números do painel juntos. Ao recarregar, o painel anterior fica esmaecido, sem esqueleto nem salto de layout.
- **Visões:** transferências e saídas de materiais nunca se somam. O seletor "Movimentação", primeiro da linha de filtros, troca o painel inteiro, e o recorte de período e instituição se mantém. Nas saídas, o destino externo leva o ícone de alfinete (`IconMapPin`, como no detalhe da saída) antes do nome, em vez de um sufixo de texto que seria cortado nos nomes longos.

## Tema claro e escuro

- O padrão é **seguir o sistema operacional**. O botão sol/lua no cabeçalho alterna entre claro e escuro, e o menu do usuário tem as três opções: Claro, Escuro e Seguir o sistema.
- A escolha fica salva em `localStorage` (`stbp-tema`). Um script no `index.html` aplica o tema antes de desenhar a página, para não "piscar" claro antes do escuro.
- **Como criar estilos para os dois temas:** defina o token em `:root` (claro) e em `:root[data-mantine-color-scheme='dark']` (escuro) no `estilos.css`, e use `var(--token)` no componente.

## Acessibilidade

- O contraste de texto e dos botões principais fica em 4,5:1 ou mais nos dois temas.
- Os cartões e as linhas de tabela são clicáveis inteiros. As ações internas (PDF, restaurar) param a propagação do clique.
- Imagens têm `alt` descritivo ("Foto da unidade CETCC"); o marcador de unidade sem foto tem `aria-label`.
- O foco de teclado é visível (anel do Mantine e contorno nos cartões).

## Conferência visual

O teste de ponta a ponta (`e2e/fluxo.spec.ts`) captura as telas principais nos dois temas em `e2e/capturas/` (os arquivos `10-*` a `13-*` são do tema escuro). Use essas capturas para revisar qualquer mudança visual.
