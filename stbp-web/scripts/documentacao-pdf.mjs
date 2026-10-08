// Gera documentacao/STBP-documentacao.pdf a partir da documentação do repositório (README.md e docs/ de cada parte).
//   npm run docs:pdf
// - Os capítulos são os próprios arquivos Markdown, na ordem de CAPITULOS; links entre eles viram links internos.
// - A "Referência rápida dos endpoints" sai das tabelas de stbp-api/docs/api.md e é conferida contra os controllers:
//   se um endpoint do código não estiver documentado (ou o contrário), o script para com erro.
// - O diagrama Mermaid do modelo de dados é desenhado com o Mermaid do CDN; sem internet, sai como texto.
// - Impressão pelo Chromium do Playwright (o mesmo dos testes de ponta a ponta).
import { execSync } from 'node:child_process'
import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium } from '@playwright/test'
import { Marked } from 'marked'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const raiz = resolve(web, '..')
const saida = join(raiz, 'documentacao', 'STBP-documentacao.pdf')

/** Ordem dos capítulos. {@code titulo} substitui o título (h1) do arquivo. */
const CAPITULOS = [
  { id: 'visao-geral', arquivo: 'documentacao/visao-geral.md' },
  { id: 'perfis', arquivo: 'stbp-api/docs/perfis-e-permissoes.md' },
  { id: 'telas', arquivo: 'stbp-web/README.md', titulo: 'Telas (stbp-web)' },
  { id: 'endpoints', gerado: true, titulo: 'Referência rápida dos endpoints' },
  { id: 'api', arquivo: 'stbp-api/docs/api.md' },
  { id: 'modelo', arquivo: 'stbp-api/docs/modelo-de-dados.md' },
  { id: 'api-dev', arquivo: 'stbp-api/README.md', titulo: 'API: desenvolvimento (stbp-api)' },
  { id: 'design', arquivo: 'stbp-web/docs/design.md' },
  { id: 'implantacao', arquivo: 'implantacao/README.md' },
  { id: 'migracao', arquivo: 'stbp-api/docs/migracao-de-dados.md' },
  { id: 'decisoes', arquivo: 'stbp-api/docs/decisoes.md' },
]

const ler = (caminho) => readFileSync(join(raiz, caminho), 'utf8')
const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Âncora no estilo do GitHub (a usada nos links entre os .md): minúsculas, sem pontuação, espaços → "-". */
const ancora = (texto) =>
  texto
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')

// ---- Endpoints: código × documentação

/** Endpoints declarados nos controllers ({@code GET /api/...}). */
function endpointsDoCodigo() {
  const pasta = join(raiz, 'stbp-api/src/main/java')
  const encontrados = []
  for (const arquivo of globSync('**/*Controller.java', { cwd: pasta })) {
    const fonte = readFileSync(join(pasta, arquivo), 'utf8')
    const base = fonte.match(/@RequestMapping\("([^"]+)"\)/)?.[1] ?? ''
    const anotacao = /@(Get|Post|Put|Delete|Patch)Mapping(?:\((?:path\s*=\s*|value\s*=\s*)?"?([^",)]*)"?[^)]*\))?/g
    for (const m of fonte.matchAll(anotacao)) encontrados.push(`${m[1].toUpperCase()} ${base}${m[2] ?? ''}`)
  }
  return encontrados
}

/** Primeira frase de um texto Markdown (para a tabela resumida); ignora ". " e ": " dentro de `código`. */
const primeiraFrase = (texto) => {
  let emCodigo = false
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === '`') emCodigo = !emCodigo
    if (!emCodigo && (texto[i] === '.' || texto[i] === ':') && (i + 1 === texto.length || texto[i + 1] === ' ')) {
      return texto.slice(0, i).trim()
    }
  }
  return texto.trim()
}

/**
 * Lê os endpoints do api.md: linhas de tabela cuja 1ª célula é `MÉTODO /api/...` e títulos com o endpoint no texto.
 * O perfil vem da coluna "Perfil", ou do que está entre parênteses no título da seção (ex.: "(ADMIN ou SUPERADMIN)").
 */
function endpointsDaDocumentacao(md) {
  const grupos = []
  let grupo = null
  let perfilDaSecao = ''
  const linhas = md.split('\n')
  let colunaPerfil = -1
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    const titulo = linha.match(/^(#{2,3}) (.*)$/)
    if (titulo) {
      const texto = titulo[2]
      const endpoint = texto.match(/`(GET|POST|PUT|DELETE|PATCH) (\/[^`?]+)`/)
      if (titulo[1] === '##') {
        perfilDaSecao = texto.match(/\(([^)]*)\)\s*$/)?.[1] ?? ''
        const nome = texto.split(':')[0].trim()
        if (/`\/api|`(GET|POST)/.test(texto) || endpoint) {
          grupo = { nome, endpoints: [] }
          grupos.push(grupo)
        } else {
          grupo = null
        }
      }
      if (endpoint && grupo) {
        // Endpoint descrito por um título: a descrição é a 1ª frase do parágrafo seguinte (ou o próprio título)
        let j = i + 1
        while (j < linhas.length && !linhas[j].trim()) j++
        const paragrafo = linhas[j] && !/^[#|`>{-]/.test(linhas[j]) ? primeiraFrase(linhas[j]) : texto.split(':')[0]
        const perfil = texto.match(/\(([^)]*)\)\s*$/)?.[1] ?? 'qualquer usuário logado'
        grupo.endpoints.push({ metodo: endpoint[1], caminho: endpoint[2], acao: paragrafo, perfil })
      }
      continue
    }
    if (linha.startsWith('|') && grupo) {
      const celulas = linha.split('|').slice(1, -1).map((c) => c.trim())
      if (/^Método/.test(celulas[0])) colunaPerfil = celulas.findIndex((c) => /^Perfil/.test(c))
      const endpoint = celulas[0].match(/^`(GET|POST|PUT|DELETE|PATCH) (\/[^`?]+)`$/)
      if (endpoint) {
        const perfil = colunaPerfil > 0 ? celulas[colunaPerfil] : perfilDaSecao
        grupo.endpoints.push({ metodo: endpoint[1], caminho: endpoint[2], acao: primeiraFrase(celulas[1]), perfil })
      }
    }
  }
  return grupos.filter((g) => g.endpoints.length > 0)
}

/** Capítulo gerado: tabela de todos os endpoints, depois de conferir código × documentação. */
function referenciaRapida() {
  const grupos = endpointsDaDocumentacao(ler('stbp-api/docs/api.md'))
  const documentados = grupos.flatMap((g) => g.endpoints.map((e) => `${e.metodo} ${e.caminho}`))
  const doCodigo = endpointsDoCodigo()
  const semDocumentacao = doCodigo.filter((e) => !documentados.includes(e))
  const semCodigo = documentados.filter((e) => !doCodigo.includes(e))
  if (semDocumentacao.length || semCodigo.length) {
    console.error('Endpoints divergentes entre o código e stbp-api/docs/api.md:')
    for (const e of semDocumentacao) console.error(`  no código, sem documentação: ${e}`)
    for (const e of semCodigo) console.error(`  documentado, mas não existe no código: ${e}`)
    process.exit(1)
  }
  const perfil = (p) =>
    ({ '—': 'Público', todos: 'Todos', 'todos os perfis': 'Todos', público: 'Público', 'ADMIN ou SUPERADMIN': 'ADMIN' })[p] ??
    p.charAt(0).toUpperCase() + p.slice(1)
  let md = `A API tem **${doCodigo.length} endpoints**, todos sob \`/api\`, mais o \`GET /actuator/health\`, que é público e serve ao Docker e ao monitoramento. A lista abaixo é montada a partir do capítulo *Referência da API* e conferida automaticamente contra os controllers do código a cada geração deste documento.\n\n`
  md += `A coluna **Perfil** mostra o perfil mínimo; os perfis são cumulativos (LEITOR < TECNICO < ADMIN < SUPERADMIN). "Autor" significa que o TECNICO só altera os próprios registros. Exceto onde indicado como público, todas as rotas exigem o cabeçalho \`Authorization: Bearer <token>\`.\n\n`
  for (const g of grupos) {
    md += `## ${g.nome}\n\n| Método | Caminho | O que faz | Perfil |\n|---|---|---|---|\n`
    for (const e of g.endpoints) {
      md += `| <span class="metodo metodo-${e.metodo.toLowerCase()}">${e.metodo}</span> | <code class="caminho">${e.caminho}</code> | ${e.acao.replaceAll('|', '\\|')} | ${perfil(e.perfil)} |\n`
    }
    md += '\n'
  }
  md += `## Infraestrutura\n\n| Método | Caminho | O que faz | Perfil |\n|---|---|---|---|\n| <span class="metodo metodo-get">GET</span> | <code class="caminho">/actuator/health</code> | Saúde da aplicação, usada pelo health check do Docker | Público |\n`
  return md
}

// ---- Markdown → HTML

/** Converte um capítulo, com âncoras prefixadas pelo id do capítulo e links resolvidos. */
function converter(capitulo, idsPorArquivo) {
  const md = capitulo.gerado ? `# ${capitulo.titulo}\n\n${referenciaRapida()}` : ler(capitulo.arquivo)
  const pastaDoArquivo = capitulo.arquivo ? dirname(join(raiz, capitulo.arquivo)) : raiz
  let primeiroTitulo = true
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }) {
        if (depth === 1 && primeiroTitulo) {
          primeiroTitulo = false
          const titulo = capitulo.titulo ?? this.parser.parseInline(tokens)
          return `<h1 id="${capitulo.id}" class="capitulo"><span class="numero">Capítulo ${capitulo.numero}</span>${titulo}</h1>\n`
        }
        return `<h${depth} id="${capitulo.id}--${ancora(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`
      },
      link({ href, tokens }) {
        const texto = this.parser.parseInline(tokens)
        if (/^(https?:|mailto:)/.test(href)) return `<a href="${escapar(href)}">${texto}</a>`
        const [caminho, fragmento] = href.split('#')
        const alvo = caminho ? relative(raiz, resolve(pastaDoArquivo, caminho)) : capitulo.arquivo
        const id = idsPorArquivo.get(alvo)
        if (!id) return `<span class="ref">${texto}</span>` // arquivo fora do documento (código, Dockerfile...)
        return `<a href="#${fragmento ? `${id}--${fragmento}` : id}">${texto}</a>`
      },
      code({ text, lang }) {
        if (lang === 'mermaid') return `<pre class="mermaid">${escapar(text)}</pre>\n`
        return `<pre><code>${escapar(text)}</code></pre>\n`
      },
    },
  })
  return `<section class="capitulo">${marked.parse(md)}</section>`
}

function versao() {
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd: raiz }).toString().trim()
    const alterado = execSync('git status --porcelain', { cwd: raiz }).toString().trim() !== ''
    return `commit ${commit}${alterado ? ' com alterações locais' : ''}`
  } catch {
    return 'versão não identificada'
  }
}

function montarHtml() {
  CAPITULOS.forEach((c, i) => (c.numero = i + 1))
  const idsPorArquivo = new Map(CAPITULOS.filter((c) => c.arquivo).map((c) => [c.arquivo, c.id]))
  const corpo = CAPITULOS.map((c) => converter(c, idsPorArquivo)).join('\n')
  const titulos = [...corpo.matchAll(/<h1 id="([^"]+)" class="capitulo"><span class="numero">[^<]*<\/span>(.*?)<\/h1>/g)]
  const sumario = titulos
    .map(([, id, titulo], i) => `<li><a href="#${id}"><span>${i + 1}</span>${titulo.replace(/<[^>]+>/g, '')}</a></li>`)
    .join('\n')
  const fonte = (pacote, arquivo) => pathToFileURL(join(web, 'node_modules', pacote, 'files', arquivo)).href
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>STBP · Documentação do projeto</title>
<style>
  @font-face { font-family: 'Plex'; font-weight: 100 700; src: url('${fonte('@fontsource-variable/ibm-plex-sans', 'ibm-plex-sans-latin-wght-normal.woff2')}') format('woff2'); }
  @font-face { font-family: 'Plex'; font-weight: 100 700; src: url('${fonte('@fontsource-variable/ibm-plex-sans', 'ibm-plex-sans-latin-ext-wght-normal.woff2')}') format('woff2');
               unicode-range: U+0100-024F, U+1E00-1EFF, U+20A0-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF; }
  @font-face { font-family: 'Plex Mono'; font-weight: 400; src: url('${fonte('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff2')}') format('woff2'); }
  @font-face { font-family: 'Plex Mono'; font-weight: 600; src: url('${fonte('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-600-normal.woff2')}') format('woff2'); }

  :root { --azul: #2058ab; --azul-escuro: #16396e; --tinta: #1b2330; --fraco: #5b6676; --borda: #d7dde6; --fundo: #f4f6f9; }
  @page { size: A4; margin: 20mm 18mm 18mm 18mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Plex', 'DejaVu Sans', sans-serif; font-size: 9.5pt; line-height: 1.5; color: var(--tinta); margin: 0; }

  /* Capa */
  .capa { height: 257mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; }
  .capa .faixa { border-top: 3mm solid var(--azul); padding-top: 12mm; }
  .capa .sigla { font-size: 11pt; font-weight: 600; letter-spacing: 0.25em; color: var(--azul); }
  .capa h1.titulo-capa { font-size: 30pt; line-height: 1.15; margin: 6mm 0 4mm; font-weight: 600; color: var(--tinta); border: 0; }
  .capa .subtitulo { font-size: 14pt; color: var(--fraco); margin: 0; }
  .capa .rodape-capa { border-top: 1px solid var(--borda); padding-top: 5mm; font-size: 9pt; color: var(--fraco); display: flex; justify-content: space-between; }
  .capa .rodape-capa strong { color: var(--tinta); font-weight: 600; }

  /* Sumário */
  .sumario { break-after: page; }
  .sumario h2 { font-size: 18pt; font-weight: 600; margin: 0 0 8mm; border: 0; }
  .sumario ol { list-style: none; padding: 0; margin: 0; }
  .sumario li a { display: flex; gap: 6mm; padding: 2.6mm 0; border-bottom: 1px solid var(--borda); color: var(--tinta); text-decoration: none; font-size: 11pt; }
  .sumario li a span { width: 8mm; color: var(--azul); font-weight: 600; font-variant-numeric: tabular-nums; }

  /* Capítulos */
  section.capitulo { break-before: page; }
  h1.capitulo { font-size: 22pt; line-height: 1.2; font-weight: 600; margin: 0 0 7mm; padding-bottom: 4mm; border-bottom: 2px solid var(--azul); }
  h1.capitulo .numero { display: block; font-size: 9pt; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--azul); margin-bottom: 2mm; }
  h1:not(.capitulo) { font-size: 16pt; }
  h2 { font-size: 13.5pt; font-weight: 600; margin: 8mm 0 3mm; color: var(--azul-escuro); break-after: avoid; }
  h3 { font-size: 11pt; font-weight: 600; margin: 6mm 0 2mm; break-after: avoid; }
  h4 { font-size: 10pt; font-weight: 600; margin: 4mm 0 1.5mm; break-after: avoid; }
  p { margin: 0 0 2.5mm; }
  ul, ol { margin: 0 0 3mm; padding-left: 5mm; }
  li { margin: 0.6mm 0; }
  a { color: var(--azul); text-decoration: none; }
  strong { font-weight: 600; }
  hr { border: 0; border-top: 1px solid var(--borda); margin: 6mm 0; }
  blockquote { margin: 0 0 3mm; padding: 2mm 4mm; border-left: 2px solid var(--azul); background: var(--fundo); color: var(--fraco); }
  blockquote p { margin: 0; }

  code { font-family: 'Plex Mono', 'DejaVu Sans Mono', monospace; font-size: 8.3pt; background: var(--fundo); padding: 0.2mm 1mm; border-radius: 2px; overflow-wrap: anywhere; }
  /* DejaVu Sans Mono nos blocos: tem os caracteres de desenho de caixa dos diagramas em texto (a Plex Mono não) */
  pre { font-family: 'DejaVu Sans Mono', monospace; background: var(--fundo); border: 1px solid var(--borda); border-radius: 3px;
        padding: 3mm 4mm; font-size: 7.8pt; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0 0 3.5mm; break-inside: avoid; }
  pre code { background: none; padding: 0; font-size: inherit; }
  pre.mermaid { background: none; border: 0; text-align: center; padding: 0; }
  pre.mermaid svg { max-width: 100%; max-height: 215mm; height: auto; width: auto; }

  table { width: 100%; border-collapse: collapse; margin: 0 0 4mm; font-size: 8.4pt; line-height: 1.4; }
  thead { display: table-header-group; }
  thead:not(:has(th:not(:empty))) { display: none; } /* tabelas Markdown com cabeçalho vazio (| | |) */
  tr { break-inside: avoid; }
  th { text-align: left; font-weight: 600; background: var(--fundo); color: var(--tinta); border-bottom: 1.5px solid var(--borda); padding: 1.6mm 2mm; }
  td { border-bottom: 1px solid var(--borda); padding: 1.6mm 2mm; vertical-align: top; }
  td code { font-size: 7.8pt; }
  td code.caminho, td:first-child > code:only-child { white-space: nowrap; }

  .ref { color: var(--tinta); }
  .metodo { display: inline-block; min-width: 13mm; text-align: center; font-family: 'Plex Mono', monospace; font-size: 7.4pt; font-weight: 600;
            padding: 0.3mm 1mm; border-radius: 2px; color: #fff; }
  .metodo-get { background: #2058ab; }
  .metodo-post { background: #2b7a4b; }
  .metodo-put { background: #9a6200; }
  .metodo-delete { background: #b42318; }
  .metodo-patch { background: #6941c6; }
</style>
</head>
<body>
<div class="capa">
  <div class="faixa">
    <div class="sigla">FIES · SESI · SENAI</div>
    <h1 class="titulo-capa">STBP<br>Sistema de Transferência de Bens Patrimoniais</h1>
    <p class="subtitulo">Documentação do projeto e referência da API</p>
  </div>
  <div class="rodape-capa">
    <span>Gerado em <strong>${hoje}</strong></span>
    <span>${escapar(versao())}</span>
  </div>
</div>
<nav class="sumario">
  <h2>Sumário</h2>
  <ol>${sumario}</ol>
</nav>
${corpo.replaceAll('✅', '✓')}
</body>
</html>`
}

const html = montarHtml()
const arquivoHtml = join(tmpdir(), `stbp-documentacao-${process.pid}.html`)
writeFileSync(arquivoHtml, html)

const navegador = await chromium.launch()
try {
  const pagina = await navegador.newPage()
  await pagina.goto(pathToFileURL(arquivoHtml).href, { waitUntil: 'load' })
  await pagina.evaluate(() => document.fonts.ready)
  if (await pagina.locator('pre.mermaid').count()) {
    try {
      await pagina.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js' })
      await pagina.evaluate(async () => {
        // eslint-disable-next-line no-undef
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', fontFamily: 'Plex, sans-serif' })
        // eslint-disable-next-line no-undef
        await mermaid.run({ querySelector: 'pre.mermaid' })
      })
    } catch (erro) {
      console.warn(`Diagramas Mermaid ficaram como texto (sem acesso ao CDN?): ${erro.message.split('\n')[0]}`)
    }
  }
  mkdirSync(dirname(saida), { recursive: true })
  await pagina.pdf({
    path: saida,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    outline: true,
    tagged: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%; margin:0 18mm; font-family:sans-serif; font-size:7.5pt; color:#5b6676; display:flex; justify-content:space-between;">
      <span>STBP · Documentação do projeto e da API</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  })
} finally {
  await navegador.close()
}
console.log(`PDF gerado: ${relative(process.cwd(), saida)}`)
