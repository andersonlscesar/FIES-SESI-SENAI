import { expect, test, type Page } from '@playwright/test'

// Fluxo principal com um usuário ADMIN ou SUPERADMIN real:
//   E2E_USUARIO=... E2E_SENHA=... npx playwright test
// Cria uma transferência de teste e a exclui definitivamente ao final. Capturas de tela em e2e/capturas/.

const usuario = process.env.E2E_USUARIO ?? ''
const senha = process.env.E2E_SENHA ?? ''
test.skip(!usuario || !senha, 'Defina E2E_USUARIO e E2E_SENHA')

async function capturar(page: Page, nome: string) {
  await page.waitForTimeout(350) // deixa terminar animações (modais, listas) antes da captura
  await page.screenshot({ path: `e2e/capturas/${nome}.png`, fullPage: true })
}

async function escolher(page: Page, rotulo: string, opcao: string) {
  await page.getByRole('combobox', { name: rotulo }).click()
  const item = page.getByRole('option', { name: opcao, exact: true })
  await expect(item).toBeVisible()
  // A lista suspensa abre com animação; em máquinas carregadas a checagem de "estabilidade" pode não terminar
  await item.click({ force: true })
  await expect(page.getByRole('combobox', { name: rotulo })).toHaveValue(opcao)
}

/** Abre o formulário de nova transferência e confirma que ele carregou (evita agir na listagem por engano). */
async function abrirNovaTransferencia(page: Page) {
  await page.goto('/transferencias/nova')
  await expect(page.getByRole('heading', { name: 'Nova transferência' })).toBeVisible()
}

async function entrar(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Usuário ou e-mail').fill(usuario)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Transferências' })).toBeVisible()
}

test('login com senha errada mostra a mensagem da API', async ({ page }) => {
  await page.goto('/login')
  await capturar(page, '01-login')
  await page.getByLabel('Usuário ou e-mail').fill(usuario)
  await page.getByLabel('Senha').fill('senha-errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Usuário ou senha inválidos')).toBeVisible()
})

test('lista, busca e detalhe', async ({ page }) => {
  await entrar(page)
  const total = page.getByText(/\d+ transferência\(s\)/)
  await expect(total).toBeVisible()
  const totalSemFiltro = await total.textContent()
  await capturar(page, '02-lista')

  await page.getByPlaceholder(/Buscar por número/).fill('projetor')
  await expect(page).toHaveURL(/busca=projetor/)
  await expect(total).not.toHaveText(totalSemFiltro ?? '')
  // Visão padrão em cartões: a capa é a foto da unidade de destino
  await expect(page.getByRole('img', { name: /Foto da unidade/ }).first()).toBeVisible()
  await capturar(page, '03-busca-cartoes')

  await page.locator('label', { hasText: 'Tabela' }).click()
  await expect(page.getByRole('columnheader', { name: 'Origem → Destino' })).toBeVisible()
  await capturar(page, '03b-busca-tabela')
  await page.locator('label', { hasText: 'Cartões' }).click()

  await page.getByText(/^Nº \d+$/).first().click()
  await expect(page.getByRole('heading', { name: /Transferência nº \d+/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /Foto da unidade/ }).first()).toBeVisible()
  await capturar(page, '04-detalhe')
})

test('cria, edita, move para a lixeira e exclui uma transferência', async ({ page }) => {
  await entrar(page)
  await page.getByRole('link', { name: 'Nova transferência' }).first().click()
  await expect(page.getByRole('heading', { name: 'Nova transferência' })).toBeVisible()

  await escolher(page, 'Instituição', 'SESI')
  await escolher(page, 'De (unidade de origem)', 'SEDE')
  await escolher(page, 'Para (unidade de destino)', 'CEFEM')
  await page.getByLabel('Responsável pelo envio').fill('teste e2e envio')
  await page.getByLabel('Responsável pelo recebimento').fill('teste e2e recebimento')
  await page.getByLabel('Descrição do item 1').fill('item de teste e2e')
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByLabel('Descrição do item 2').fill('segundo item')
  await page.getByLabel('Patrimônio do item 2').fill('99999')
  await capturar(page, '05-formulario')
  await page.getByRole('button', { name: 'Criar transferência' }).click()

  const titulo = page.getByRole('heading', { name: /Transferência nº \d+/ })
  await expect(titulo).toBeVisible()
  await expect(page.getByText('Teste E2e Envio')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'S/P' })).toBeVisible()

  await page.getByRole('link', { name: 'Editar' }).click()
  await expect(page.getByLabel('Descrição do item 1')).toHaveValue('Item de teste e2e')
  await page.getByLabel('Responsável pelo envio').fill('Fulano Editado')
  await page.getByRole('button', { name: 'Remover item' }).first().click()
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Fulano Editado')).toBeVisible()
  await expect(page.getByText('1 item', { exact: true })).toBeVisible()
  await capturar(page, '06-detalhe-editado')

  await page.getByRole('button', { name: 'Mover para a lixeira' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mover para a lixeira' }).click()
  await expect(page.getByText(/Na lixeira desde/)).toBeVisible()
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir definitivamente' }).click()
  await expect(page.getByRole('heading', { name: 'Lixeira' })).toBeVisible()
})

test('telas de administração', async ({ page }) => {
  await entrar(page)
  await page.getByRole('link', { name: 'Usuários' }).click()
  await expect(page.getByRole('heading', { name: 'Usuários' })).toBeVisible()
  await expect(page.getByRole('cell', { name: usuario, exact: true })).toBeVisible()
  await capturar(page, '07-usuarios')

  await page.getByRole('link', { name: 'Instituições' }).click()
  await expect(page.getByAltText('Logo SESI')).toBeVisible()
  await capturar(page, '08-instituicoes')

  await page.getByRole('link', { name: 'Unidades' }).click()
  await expect(page.getByRole('cell', { name: 'CETAF-AJU', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Foto da unidade CETAF-AJU' })).toBeVisible()
  await capturar(page, '09-unidades')
})

test('tema escuro: alternância e telas principais', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/login')
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark')
  await capturar(page, '10-escuro-login')

  await entrar(page)
  await expect(page.getByRole('img', { name: /Foto da unidade/ }).first()).toBeVisible()
  await capturar(page, '11-escuro-lista')

  await page.getByText(/^Nº \d+$/).first().click()
  await expect(page.getByRole('heading', { name: /Transferência nº/ })).toBeVisible()
  await capturar(page, '12-escuro-detalhe')

  await page.getByRole('link', { name: 'Nova transferência' }).first().click()
  await capturar(page, '13-escuro-formulario')

  // O botão do cabeçalho alterna para o claro, e a escolha é lembrada
  await page.getByRole('button', { name: 'Usar tema claro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'light')
})

/** PNG 1x1 válido, para testar o envio de imagens. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

test('instituição: logo no cadastro, bloqueio e exclusão', async ({ page }) => {
  const nome = `TESTE E2E ${Date.now()}`
  await entrar(page)
  await page.getByRole('link', { name: 'Instituições' }).click()

  // Cadastro com a logo no próprio formulário
  await page.getByRole('button', { name: 'Nova instituição' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Nome').fill(nome)
  await modal.locator('input[type=file]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
  await expect(modal.getByRole('img', { name: 'Pré-visualização: Logo' })).toBeVisible()
  await capturar(page, '14-instituicao-cadastro')
  await modal.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('img', { name: `Logo ${nome}` })).toBeVisible()
  const linha = page.getByRole('row', { name: new RegExp(nome) })
  await expect(linha.getByText('Sem transferências')).toBeVisible()

  // Bloqueada, some do formulário de nova transferência
  await linha.getByRole('button', { name: `Ações para ${nome}` }).click()
  await page.getByRole('menuitem', { name: 'Bloquear para uso' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bloquear' }).click()
  await expect(linha.getByText('Bloqueada')).toBeVisible()
  await capturar(page, '15-instituicoes-bloqueio')

  await page.getByRole('link', { name: 'Nova transferência' }).first().click()
  await page.getByRole('combobox', { name: 'Instituição' }).click()
  await expect(page.getByRole('option', { name: 'SESI', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: new RegExp(nome) })).toHaveCount(0)
  await page.keyboard.press('Escape')

  // Desbloqueia e exclui (nunca foi usada)
  await page.getByRole('link', { name: 'Instituições' }).click()
  await linha.getByRole('button', { name: `Ações para ${nome}` }).click()
  await page.getByRole('menuitem', { name: 'Desbloquear' }).click()
  await expect(linha.getByText('Ativa')).toBeVisible()
  await linha.getByRole('button', { name: `Ações para ${nome}` }).click()
  await page.getByRole('menuitem', { name: 'Excluir' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('row', { name: new RegExp(nome) })).toHaveCount(0)

  // Instituição em uso: excluir fica desabilitado
  await page.getByRole('row', { name: /SESI/ }).getByRole('button', { name: 'Ações para SESI' }).click()
  await expect(page.getByRole('menuitem', { name: 'Excluir' })).toBeDisabled()
})

test('gera 100 itens com patrimônio sequencial', async ({ page }) => {
  await entrar(page)
  await abrirNovaTransferencia(page)
  await escolher(page, 'Instituição', 'SESI')
  await escolher(page, 'De (unidade de origem)', 'SEDE')
  await escolher(page, 'Para (unidade de destino)', 'CEFEM')
  await page.getByLabel('Responsável pelo envio').fill('teste e2e lote')
  await page.getByLabel('Responsável pelo recebimento').fill('teste e2e lote')

  await page.getByRole('button', { name: 'Gerar itens em sequência' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Descrição dos itens').fill('Notebook Dell Latitude 3420')
  await modal.getByLabel('Patrimônio inicial').fill('0900001')
  await modal.getByLabel('Quantidade').fill('100')
  await expect(modal.getByText('100 itens · patrimônio')).toBeVisible()
  await expect(modal.getByText('0900001 a 0900100')).toBeVisible()
  await capturar(page, '16-gerador-itens')
  await modal.getByRole('button', { name: 'Gerar 100 itens' }).click()

  // A linha vazia inicial foi substituída: exatamente 100 itens, em sequência
  await expect(page.getByLabel('Patrimônio do item 100', { exact: true })).toHaveValue('0900100')
  await expect(page.getByLabel('Patrimônio do item 101', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Patrimônio do item 1', { exact: true })).toHaveValue('0900001')

  // Digitação continua fluida com 100 linhas no formulário
  const inicio = Date.now()
  await page.getByLabel('Observação do item 50', { exact: true }).pressSequentially('Com carregador', { delay: 0 })
  const msPorTecla = (Date.now() - inicio) / 'Com carregador'.length
  console.log(`digitação com 100 itens: ${msPorTecla.toFixed(0)} ms por tecla`)
  expect(msPorTecla).toBeLessThan(150)

  await page.getByRole('button', { name: 'Criar transferência' }).click()
  await expect(page.getByRole('heading', { name: /Transferência nº \d+/ })).toBeVisible()
  await expect(page.getByText('100 itens', { exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Com carregador' })).toBeVisible()

  // Filtro rápido dos itens: patrimônio parcial, observação sem acento/maiúsculas, nº do item, Esc limpa
  const filtro = page.getByLabel('Filtrar itens')
  await filtro.fill('090007')
  await expect(page.getByText('10 de 100 itens')).toBeVisible()
  await filtro.fill('CARREGADOR')
  await expect(page.getByText('1 de 100 itens')).toBeVisible()
  await expect(page.getByRole('cell', { name: '0900050' })).toBeVisible()
  await capturar(page, '17-filtro-itens')
  await filtro.fill('latitude xyz')
  await expect(page.getByText('Nenhum item corresponde a “latitude xyz”.')).toBeVisible()
  await filtro.press('Escape')
  await expect(page.getByText('100 itens', { exact: true })).toBeVisible()

  // Limpeza: lixeira e exclusão definitiva
  await page.getByRole('button', { name: 'Mover para a lixeira' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mover para a lixeira' }).click()
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir definitivamente' }).click()
  await expect(page.getByRole('heading', { name: 'Lixeira' })).toBeVisible()
})

test('edição em lote: observação esquecida, patrimônio por intervalo e filtro', async ({ page }) => {
  await entrar(page)
  await abrirNovaTransferencia(page)
  await escolher(page, 'Instituição', 'SESI')
  await escolher(page, 'De (unidade de origem)', 'SEDE')
  await escolher(page, 'Para (unidade de destino)', 'CEFEM')
  await page.getByLabel('Responsável pelo envio').fill('teste e2e lote')
  await page.getByLabel('Responsável pelo recebimento').fill('teste e2e lote')

  // 20 notebooks gerados sem observação; um deles recebe observação à mão
  await page.getByRole('button', { name: 'Gerar itens em sequência' }).click()
  const gerador = page.getByRole('dialog')
  await gerador.getByLabel('Descrição dos itens').fill('Notebook Dell Latitude 3420')
  await gerador.getByLabel('Patrimônio inicial').fill('0800001')
  await gerador.getByLabel('Quantidade').fill('20')
  await gerador.getByRole('button', { name: 'Gerar 20 itens' }).click()
  // O envio do gerador não pode disparar a validação do formulário da transferência
  await expect(page.getByText('Informe a descrição')).toHaveCount(0)
  await expect(page.getByText('Há itens sem descrição.')).toHaveCount(0)
  await page.getByLabel('Observação do item 2', { exact: true }).fill('Com fonte')

  // "Esqueci a observação": seleciona os sem observação e aplica de uma vez
  await page.getByRole('button', { name: 'Selecionar' }).click()
  await page.getByRole('menuitem', { name: 'Sem observação' }).click()
  await expect(page.getByText('19 selecionados')).toBeVisible()
  await page.getByRole('button', { name: 'Editar selecionados' }).click()
  const lote = page.getByRole('dialog', { name: 'Editar 19 itens selecionados' })
  await lote.getByLabel('Texto da observação').fill('Lab 16')
  await capturar(page, '18-edicao-lote')
  await lote.getByRole('button', { name: 'Aplicar a 19 itens' }).click()
  await expect(page.getByLabel('Observação do item 1', { exact: true })).toHaveValue('Lab 16')
  await expect(page.getByLabel('Observação do item 2', { exact: true })).toHaveValue('Com fonte')
  await expect(page.getByLabel('Observação do item 20', { exact: true })).toHaveValue('Lab 16')

  // Intervalo com Shift (itens 3 a 6) e renumeração do patrimônio
  await page.getByRole('button', { name: 'Limpar seleção' }).click()
  await page.getByLabel('Selecionar item 3', { exact: true }).click()
  await page.getByLabel('Selecionar item 6', { exact: true }).click({ modifiers: ['Shift'] })
  await expect(page.getByText('4 selecionados')).toBeVisible()
  await page.getByRole('button', { name: 'Editar selecionados' }).click()
  const lote2 = page.getByRole('dialog', { name: 'Editar 4 itens selecionados' })
  await lote2.getByRole('checkbox', { name: 'Observação' }).uncheck()
  await lote2.getByRole('checkbox', { name: 'Patrimônio' }).check()
  await lote2.getByLabel('Patrimônio inicial').fill('NB-0100')
  await expect(lote2.getByText('NB-0100 a NB-0103')).toBeVisible()
  await lote2.getByRole('button', { name: 'Aplicar a 4 itens' }).click()
  await expect(page.getByLabel('Patrimônio do item 3', { exact: true })).toHaveValue('NB-0100')
  await expect(page.getByLabel('Patrimônio do item 6', { exact: true })).toHaveValue('NB-0103')
  await expect(page.getByLabel('Patrimônio do item 7', { exact: true })).toHaveValue('0800007')

  // Filtro da grade + "Todos" seleciona só os filtrados
  await page.getByRole('button', { name: 'Limpar seleção' }).click()
  await page.getByLabel('Filtrar itens').fill('NB-')
  await expect(page.getByText('4 de 20 itens')).toBeVisible()
  await page.getByLabel('Selecionar todos os itens visíveis').check()
  await expect(page.getByText('4 selecionados')).toBeVisible()
  await page.getByLabel('Filtrar itens').press('Escape')
  await expect(page.getByLabel('Patrimônio do item 20', { exact: true })).toBeVisible()

  // Salva e confere no detalhe
  await page.getByRole('button', { name: 'Criar transferência' }).click()
  await expect(page.getByRole('heading', { name: /Transferência nº \d+/ })).toBeVisible()
  await page.getByLabel('Filtrar itens').fill('lab 16')
  await expect(page.getByText('19 de 20 itens')).toBeVisible()

  // Limpeza
  await page.getByRole('button', { name: 'Mover para a lixeira' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mover para a lixeira' }).click()
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir definitivamente' }).click()
  await expect(page.getByRole('heading', { name: 'Lixeira' })).toBeVisible()
})

test('unidades e usuários com vínculos não são excluídos, só bloqueados', async ({ page }) => {
  const nome = `UNIDADE E2E ${Date.now()}`
  await entrar(page)
  await page.getByRole('link', { name: 'Unidades' }).click()

  // Unidade nova (sem transferências): bloqueia, some do formulário, desbloqueia e exclui
  await page.getByRole('button', { name: 'Nova unidade' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Nome').fill(nome)
  await modal.getByRole('combobox', { name: 'Instituições' }).click({ force: true })
  await page.getByRole('option', { name: 'SESI', exact: true }).click({ force: true })
  await page.keyboard.press('Escape')
  await modal.getByRole('button', { name: 'Salvar' }).click()
  const linha = page.getByRole('row', { name: new RegExp(nome) })
  await expect(linha.getByText('Sem transferências')).toBeVisible()

  await linha.getByRole('button', { name: `Ações para ${nome}` }).click()
  await page.getByRole('menuitem', { name: 'Bloquear para uso' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bloquear' }).click()
  await expect(linha.getByText('Bloqueada')).toBeVisible()
  await capturar(page, '17-unidades-bloqueio')

  await abrirNovaTransferencia(page)
  await escolher(page, 'Instituição', 'SESI')
  await page.getByRole('combobox', { name: 'De (unidade de origem)' }).click()
  await expect(page.getByRole('option', { name: 'SEDE', exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: new RegExp(nome) })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await page.goto('/unidades')
  await linha.getByRole('button', { name: `Ações para ${nome}` }).click()
  await page.getByRole('menuitem', { name: 'Desbloquear' }).click()
  await expect(linha.getByText('Ativa')).toBeVisible()
  await linha.getByRole('button', { name: `Ações para ${nome}` }).click()
  await page.getByRole('menuitem', { name: 'Excluir' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('row', { name: new RegExp(nome) })).toHaveCount(0)

  // Unidade em uso: excluir desabilitado
  await page.getByRole('button', { name: 'Ações para CETAF-AJU' }).click()
  await expect(page.getByRole('menuitem', { name: 'Excluir' })).toBeDisabled()
  await page.keyboard.press('Escape')

  // Usuário com transferências: excluir desabilitado
  await page.getByRole('link', { name: 'Usuários' }).click()
  await page.getByPlaceholder('Buscar por nome, login ou e-mail').fill('thalia')
  const acoesThalia = page.getByRole('button', { name: /Ações para Thalia/ })
  await acoesThalia.click()
  await expect(page.getByRole('menuitem', { name: 'Excluir' })).toBeDisabled()
})

test('painel de análise: indicadores, gráfico, tabela e filtros', async ({ page }) => {
  await entrar(page)
  await page.getByRole('link', { name: 'Painel' }).click()
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  await expect(page.getByText('Itens transferidos')).toBeVisible()
  await expect(page.getByText('Evolução mensal')).toBeVisible()
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible()
  await capturar(page, '18-painel')

  // Versão em tabela do gráfico mensal (acessibilidade)
  await page.getByRole('button', { name: 'Ver tabela' }).click()
  await expect(page.getByRole('columnheader', { name: 'Mês' })).toBeVisible()
  await page.getByRole('button', { name: 'Ver gráfico' }).click()

  // Filtros ficam na URL e recalculam tudo
  await page.getByRole('combobox', { name: 'Período' }).click({ force: true })
  await page.getByRole('option', { name: 'Todo o histórico' }).click({ force: true })
  await expect(page).toHaveURL(/periodo=tudo/)
  await page.getByRole('combobox', { name: 'Instituição' }).click({ force: true })
  await page.getByRole('option', { name: 'SENAI', exact: true }).click({ force: true })
  await expect(page).toHaveURL(/instituicao=2/)
  // Os dois filtros se mantêm juntos (uma mudança não desfaz a anterior)
  await expect(page).toHaveURL(/periodo=tudo/)
  await expect(page.getByRole('combobox', { name: 'Período' })).toHaveValue('Todo o histórico')
  await expect(page.getByText('Por instituição')).toBeVisible()

  await page.getByRole('button', { name: 'Usar tema escuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark')
  await capturar(page, '19-painel-escuro')
})
