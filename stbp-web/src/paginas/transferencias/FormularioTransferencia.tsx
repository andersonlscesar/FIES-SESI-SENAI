import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Checkbox,
  CloseButton,
  Group,
  Loader,
  Menu,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconClearAll,
  IconEdit,
  IconListCheck,
  IconListNumbers,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'

import { transferenciasApi } from '../../api/recursos'
import type { Motivo, TransferenciaDetalhe, TransferenciaPedido } from '../../api/tipos'
import { useInstituicoes, useUnidades } from '../../componentes/consultas'
import { errosDeCampo, mensagemDeErro, MOTIVOS, notificarErro, notificarSucesso } from '../../componentes/util'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { EdicaoItensLote } from '../../componentes/EdicaoItensLote'
import { aplicarEmLote, criterios, intervalo, type AlteracoesLote } from '../../componentes/edicaoLote'
import { filtrarItens } from '../../componentes/filtroItens'
import { GeradorItens, type ItemGerado } from '../../componentes/GeradorItens'
import { descreverIntervalo, MAXIMO_ITENS } from '../../componentes/sequencia'

interface ItemForm {
  chave: string
  id?: number
  descricao: string
  patrimonio: string
  observacao: string
}

interface ValoresForm {
  data: string
  motivo: string
  instituicaoId: string
  origemId: string
  destinoId: string
  responsavelEnvio: string
  responsavelRecebimento: string
}

/** Erros dos itens, por caminho ("itens.3.descricao") ou geral ("itens"). */
type ErrosItens = Record<string, string>

const novaChave = () => crypto.randomUUID()
const itemVazio = (): ItemForm => ({ chave: novaChave(), descricao: '', patrimonio: '', observacao: '' })
const itemEstaVazio = (i: ItemForm) => !i.id && !i.descricao.trim() && !i.patrimonio.trim() && !i.observacao.trim()
const obrigatorio = (mensagem: string) => (v: string) => (v.trim() ? null : mensagem)
/** A partir de quantos itens o filtro aparece (mesmo critério do detalhe). */
const MINIMO_PARA_FILTRO = 6
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

function valoresDe(t: TransferenciaDetalhe): ValoresForm {
  return {
    data: t.data,
    motivo: t.motivo,
    instituicaoId: String(t.instituicao.id),
    origemId: String(t.origem.id),
    destinoId: String(t.destino.id),
    responsavelEnvio: t.responsavelEnvio,
    responsavelRecebimento: t.responsavelRecebimento,
  }
}

function itensDe(t: TransferenciaDetalhe): ItemForm[] {
  return t.itens.map((i) => ({
    chave: novaChave(),
    id: i.id,
    descricao: i.descricao,
    patrimonio: i.patrimonio ?? 'S/P',
    observacao: i.observacao ?? '',
  }))
}

export function FormularioTransferencia() {
  const parametro = useParams().id
  const id = parametro ? Number(parametro) : null
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const instituicoes = useInstituicoes()
  const unidades = useUnidades()
  const [enviando, setEnviando] = useState(false)
  const [geradorAberto, setGeradorAberto] = useState(false)
  const [edicaoLote, setEdicaoLote] = useState(0) // 0 = fechada; muda a cada abertura para começar limpa
  const inicializado = useRef(false)

  const existente = useQuery({
    queryKey: ['transferencia', id],
    queryFn: () => transferenciasApi.detalhar(id!),
    enabled: id !== null,
  })

  const form = useForm<ValoresForm>({
    initialValues: {
      data: dayjs().format('YYYY-MM-DD'),
      motivo: 'TRANSFERENCIA_ENTRE_FILIAIS',
      instituicaoId: '',
      origemId: '',
      destinoId: '',
      responsavelEnvio: '',
      responsavelRecebimento: '',
    },
    validate: {
      data: (v) => (v ? null : 'Informe a data'),
      instituicaoId: obrigatorio('Informe a instituição'),
      origemId: obrigatorio('Informe a unidade de origem'),
      destinoId: obrigatorio('Informe a unidade de destino'),
      responsavelEnvio: obrigatorio('Informe o responsável pelo envio'),
      responsavelRecebimento: obrigatorio('Informe o responsável pelo recebimento'),
    },
  })

  /*
   * Os itens ficam fora do useForm: ele copia todos os valores a cada tecla, o que redesenharia todas as linhas.
   * Aqui cada alteração cria um objeto novo só para a linha alterada, e as demais (memorizadas) não são redesenhadas
   * — essencial para lotes grandes (ex.: 100 computadores gerados em sequência).
   */
  const [itens, setItens] = useState<ItemForm[]>(() => [itemVazio()])
  const [errosItens, setErrosItens] = useState<ErrosItens>({})

  // Seleção de itens para edição em lote (por chave, que não muda ao reordenar)
  const [selecionados, setSelecionados] = useState<ReadonlySet<string>>(() => new Set())
  const ancora = useRef<string | null>(null) // último item clicado, para selecionar intervalos com Shift
  const chavesVisiveis = useRef<string[]>([])

  // Filtro da grade. Calculado quando a busca ou a quantidade de itens muda, e não a cada tecla nos itens:
  // assim um item não some da tela enquanto está sendo editado.
  const [busca, setBusca] = useState('')
  const [buscaAplicada] = useDebouncedValue(busca, 150)
  const itensAtuais = useRef(itens)
  itensAtuais.current = itens
  const chavesFiltradas = useMemo(() => {
    if (!buscaAplicada.trim()) return null
    const comOrdem = itensAtuais.current.map((i, n) => ({
      chave: i.chave,
      ordem: n + 1,
      descricao: i.descricao,
      patrimonio: i.patrimonio.trim() ? i.patrimonio : null,
      observacao: i.observacao,
    }))
    return new Set(filtrarItens(comOrdem, buscaAplicada).map((i) => i.chave))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaAplicada, itens.length])

  // Ações das linhas com identidade estável (não dependem de nada do render): a memorização das linhas funciona
  const acoesItem = useMemo<AcoesItem>(
    () => ({
      alterar: (i, campo, valor) => {
        setItens((atuais) => atuais.map((item, j) => (j === i ? { ...item, [campo]: valor } : item)))
        setErrosItens((erros) => {
          const caminho = `itens.${i}.${campo}`
          if (!(caminho in erros)) return erros
          const { [caminho]: _, ...resto } = erros
          return resto
        })
      },
      mover: (de, para) =>
        setItens((atuais) => {
          const copia = [...atuais]
          const [movido] = copia.splice(de, 1)
          copia.splice(para, 0, movido)
          return copia
        }),
      remover: (i, chave) => {
        setItens((atuais) => atuais.filter((_, j) => j !== i))
        setSelecionados((atual) => {
          if (!atual.has(chave)) return atual
          const novo = new Set(atual)
          novo.delete(chave)
          return novo
        })
        setErrosItens({}) // os índices mudam; os erros voltam a aparecer ao salvar
      },
      selecionar: (chave, marcado, comShift) => {
        const chaves = comShift && ancora.current ? intervalo(chavesVisiveis.current, ancora.current, chave) : [chave]
        ancora.current = chave
        setSelecionados((atual) => {
          const novo = new Set(atual)
          for (const c of chaves) {
            if (marcado) novo.add(c)
            else novo.delete(c)
          }
          return novo
        })
      },
    }),
    [],
  )

  useEffect(() => {
    if (existente.data && !inicializado.current) {
      inicializado.current = true
      form.setValues(valoresDe(existente.data))
      form.resetDirty()
      setItens(itensDe(existente.data))
    }
  }, [existente.data, form])

  if (id !== null && existente.isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    )
  }
  if (existente.isError) return <Alert color="red">{mensagemDeErro(existente.error)}</Alert>
  if (existente.data && !existente.data.podeAlterar) {
    return <Alert color="red">Você não pode alterar esta transferência.</Alert>
  }

  // Instituições bloqueadas não entram em transferências novas; ao editar, a atual continua disponível (D-033)
  const instituicaoAtual = existente.data?.instituicao.id
  const opcoesInstituicao = (instituicoes.data ?? [])
    .filter((i) => i.ativa || i.id === instituicaoAtual)
    .map((i) => ({ value: String(i.id), label: i.ativa ? i.nome : `${i.nome} (bloqueada)` }))

  const instituicaoId = Number(form.values.instituicaoId)
  const unidadesDaInstituicao = (unidades.data ?? []).filter((u) => u.instituicaoIds.includes(instituicaoId))
  // Unidades bloqueadas não entram em transferências novas; ao editar, a origem/destino atual continua disponível (D-035)
  const opcoesUnidade = (atualId: number | undefined) =>
    unidadesDaInstituicao
      .filter((u) => u.ativa || u.id === atualId)
      .map((u) => ({ value: String(u.id), label: u.ativa ? u.nome : `${u.nome} (bloqueada)` }))

  const escolherInstituicao = (valor: string | null) => {
    const novaId = Number(valor)
    const pertence = (unidadeId: string) =>
      unidades.data?.find((u) => String(u.id) === unidadeId)?.instituicaoIds.includes(novaId) ?? false
    form.setFieldValue('instituicaoId', valor ?? '')
    if (!pertence(form.values.origemId)) form.setFieldValue('origemId', '')
    if (!pertence(form.values.destinoId)) form.setFieldValue('destinoId', '')
  }

  /** Valida os itens (descrição obrigatória); devolve true se estiverem válidos. */
  const validarItens = () => {
    const erros: ErrosItens = {}
    itens.forEach((item, i) => {
      if (!item.descricao.trim()) erros[`itens.${i}.descricao`] = 'Informe a descrição'
    })
    setErrosItens(erros)
    return Object.keys(erros).length === 0
  }

  const enviar = form.onSubmit(async (v) => {
    if (!validarItens()) {
      notificarErro(new Error('Há itens sem descrição.'))
      return
    }
    const pedido: TransferenciaPedido = {
      data: v.data,
      motivo: v.motivo as Motivo,
      instituicaoId: Number(v.instituicaoId),
      origemId: Number(v.origemId),
      destinoId: Number(v.destinoId),
      responsavelEnvio: v.responsavelEnvio,
      responsavelRecebimento: v.responsavelRecebimento,
      itens: itens.map(({ id, descricao, patrimonio, observacao }) => ({ id, descricao, patrimonio, observacao })),
    }
    setEnviando(true)
    try {
      const salva = id === null ? await transferenciasApi.criar(pedido) : await transferenciasApi.atualizar(id, pedido)
      queryClient.setQueryData(['transferencia', salva.id], salva)
      await queryClient.invalidateQueries({ queryKey: ['transferencias'] })
      await queryClient.invalidateQueries({ queryKey: ['autores'] })
      notificarSucesso(id === null ? `Transferência nº ${salva.id} criada.` : 'Transferência atualizada.')
      navegar(`/transferencias/${salva.id}`, { replace: id !== null })
    } catch (erro) {
      const campos = errosDeCampo(erro)
      const deItens = Object.fromEntries(Object.entries(campos).filter(([c]) => c === 'itens' || c.startsWith('itens.')))
      form.setErrors(Object.fromEntries(Object.entries(campos).filter(([c]) => !(c in deItens))))
      setErrosItens(deItens)
      notificarErro(erro)
    } finally {
      setEnviando(false)
    }
  })

  /** A linha em branco inicial é substituída pelos itens gerados, em vez de sobrar vazia. */
  const soLinhaVazia = itens.length === 1 && itemEstaVazio(itens[0])
  const vagas = MAXIMO_ITENS - (soLinhaVazia ? 0 : itens.length)

  const adicionarGerados = (gerados: ItemGerado[]) => {
    const novos = gerados.map((g) => ({ chave: novaChave(), ...g }))
    setItens(soLinhaVazia ? novos : [...itens, ...novos])
    notificarSucesso(
      `${gerados.length} ${gerados.length === 1 ? 'item gerado' : 'itens gerados'} (patrimônio ${descreverIntervalo(gerados.map((g) => g.patrimonio))}).`,
    )
  }

  const limparItens = () =>
    modals.openConfirmModal({
      title: 'Limpar todos os itens?',
      children: <Text size="sm">Os {itens.length} itens da lista serão removidos do formulário. Nada é gravado até você salvar.</Text>,
      labels: { confirm: 'Limpar itens', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        setItens([itemVazio()])
        setErrosItens({})
        setSelecionados(new Set())
      },
    })

  const visiveis = chavesFiltradas ? itens.filter((i) => chavesFiltradas.has(i.chave)) : itens
  chavesVisiveis.current = visiveis.map((i) => i.chave)
  const visiveisSelecionados = visiveis.filter((i) => selecionados.has(i.chave)).length
  const comFiltro = itens.length >= MINIMO_PARA_FILTRO

  /** Seleciona entre os itens visíveis (respeita o filtro). */
  const selecionarVisiveis = (criterio: (i: ItemForm) => boolean) => {
    setSelecionados(new Set(visiveis.filter(criterio).map((i) => i.chave)))
    ancora.current = null
  }
  const inverterSelecao = () => setSelecionados(new Set(visiveis.filter((i) => !selecionados.has(i.chave)).map((i) => i.chave)))

  const aplicarLote = (alteracoes: AlteracoesLote) => {
    const novos = aplicarEmLote(itens, selecionados, alteracoes)
    const alterados = novos.filter((item, i) => item !== itens[i]).length
    setItens(novos)
    setErrosItens({})
    notificarSucesso(`Alteração aplicada a ${plural(alterados, 'item', 'itens')}.`)
  }

  const removerSelecionados = () =>
    modals.openConfirmModal({
      title: `Remover ${plural(selecionados.size, 'item selecionado', 'itens selecionados')}?`,
      children: <Text size="sm">Eles saem da lista do formulário. Nada é gravado até você salvar.</Text>,
      labels: { confirm: 'Remover', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        const restantes = itens.filter((i) => !selecionados.has(i.chave))
        setItens(restantes.length > 0 ? restantes : [itemVazio()])
        setSelecionados(new Set())
        setErrosItens({})
      },
    })
  return (
    <form onSubmit={enviar}>
      <Stack gap="md">
        <CabecalhoPagina
          titulo={id === null ? 'Nova transferência' : `Editar transferência nº ${id}`}
          descricao="Os dados abaixo saem impressos no Termo de Transferência de Bens Patrimoniais."
        />

        <Paper withBorder>
          <Text fw={600} px="md" py="sm" style={{ borderBottom: '1px solid var(--stbp-borda)' }}>
            Dados da transferência
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" p="md">
            <DateInput label="Data" valueFormat="DD/MM/YYYY" withAsterisk {...form.getInputProps('data')} />
            <Select
              label="Motivo"
              withAsterisk
              allowDeselect={false}
              data={Object.entries(MOTIVOS).map(([value, m]) => ({ value, label: `${m.nome} (${m.tipo.toLowerCase()})` }))}
              {...form.getInputProps('motivo')}
            />
            <Select
              label="Instituição"
              withAsterisk
              data={opcoesInstituicao}
              {...form.getInputProps('instituicaoId')}
              onChange={escolherInstituicao}
            />
            <Select
              label="De (unidade de origem)"
              withAsterisk
              searchable
              disabled={!form.values.instituicaoId}
              placeholder={form.values.instituicaoId ? undefined : 'Escolha a instituição'}
              data={opcoesUnidade(existente.data?.origem.id)}
              {...form.getInputProps('origemId')}
            />
            <Select
              label="Para (unidade de destino)"
              withAsterisk
              searchable
              disabled={!form.values.instituicaoId}
              placeholder={form.values.instituicaoId ? undefined : 'Escolha a instituição'}
              data={opcoesUnidade(existente.data?.destino.id)}
              {...form.getInputProps('destinoId')}
            />
            <div />
            <TextInput label="Responsável pelo envio" withAsterisk maxLength={150} {...form.getInputProps('responsavelEnvio')} />
            <TextInput
              label="Responsável pelo recebimento"
              withAsterisk
              maxLength={150}
              {...form.getInputProps('responsavelRecebimento')}
            />
          </SimpleGrid>
        </Paper>

        <Paper withBorder p="md">
          <Group justify="space-between" mb="sm">
            <Text fw={600}>
              Itens ({itens.length}
              {itens.length >= MAXIMO_ITENS * 0.8 ? ` de ${MAXIMO_ITENS}` : ''})
            </Text>
            <Text size="xs" c="dimmed">
              Sem patrimônio? Deixe em branco ou escreva S/P.
            </Text>
          </Group>
          {errosItens.itens && (
            <Alert color="red" mb="sm">
              {errosItens.itens}
            </Alert>
          )}
          {(comFiltro || selecionados.size > 0) && (
            <Group justify="space-between" gap="sm" py="xs" mb="xs" className="stbp-barra-itens">
              <Group gap="xs">
                {comFiltro && (
                  <TextInput
                    aria-label="Filtrar itens"
                    placeholder="Filtrar por descrição, patrimônio ou nº"
                    size="xs"
                    w={280}
                    leftSection={<IconSearch size={14} />}
                    value={busca}
                    onChange={(e) => setBusca(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setBusca('')
                      if (e.key === 'Enter') e.preventDefault() // não envia o formulário
                    }}
                    rightSection={busca && <CloseButton size="sm" aria-label="Limpar filtro" onClick={() => setBusca('')} />}
                  />
                )}
                <Menu position="bottom-start">
                  <Menu.Target>
                    <Button size="xs" variant="default" leftSection={<IconListCheck size={14} />} rightSection={<IconChevronDown size={14} />}>
                      Selecionar
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {chavesFiltradas && <Menu.Label>Entre os {visiveis.length} itens filtrados</Menu.Label>}
                    <Menu.Item onClick={() => selecionarVisiveis(() => true)}>Todos</Menu.Item>
                    <Menu.Item onClick={() => selecionarVisiveis(criterios.semObservacao)}>Sem observação</Menu.Item>
                    <Menu.Item onClick={() => selecionarVisiveis(criterios.semPatrimonio)}>Sem patrimônio</Menu.Item>
                    <Menu.Item onClick={() => selecionarVisiveis(criterios.semDescricao)}>Sem descrição</Menu.Item>
                    <Menu.Divider />
                    <Menu.Item onClick={inverterSelecao}>Inverter seleção</Menu.Item>
                    <Menu.Item onClick={() => setSelecionados(new Set())} disabled={selecionados.size === 0}>
                      Nenhum
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                {chavesFiltradas && (
                  <Text size="xs" c="dimmed">
                    {visiveis.length} de {plural(itens.length, 'item', 'itens')}
                  </Text>
                )}
              </Group>
              {selecionados.size > 0 && (
                <Group gap="xs">
                  <Text size="sm" fw={500} aria-live="polite">
                    {plural(selecionados.size, 'selecionado', 'selecionados')}
                  </Text>
                  <Button size="xs" leftSection={<IconEdit size={14} />} onClick={() => setEdicaoLote((n) => n + 1)}>
                    Editar selecionados
                  </Button>
                  <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={removerSelecionados}>
                    Remover
                  </Button>
                  <CloseButton size="sm" aria-label="Limpar seleção" title="Limpar seleção" onClick={() => setSelecionados(new Set())} />
                </Group>
              )}
            </Group>
          )}
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing={6}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={36} pr={0}>
                    <Checkbox
                      size="xs"
                      aria-label="Selecionar todos os itens visíveis"
                      checked={visiveis.length > 0 && visiveisSelecionados === visiveis.length}
                      indeterminate={visiveisSelecionados > 0 && visiveisSelecionados < visiveis.length}
                      onChange={(e) => selecionarVisiveis(() => e.currentTarget.checked)}
                    />
                  </Table.Th>
                  <Table.Th w={50}>Item</Table.Th>
                  <Table.Th>Descrição do bem *</Table.Th>
                  <Table.Th w={170}>Patrimônio</Table.Th>
                  <Table.Th>Observação</Table.Th>
                  <Table.Th w={110} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {itens.map((item, i) =>
                  chavesFiltradas && !chavesFiltradas.has(item.chave) ? null : (
                  <LinhaItem
                    key={item.chave}
                    indice={i}
                    item={item}
                    selecionado={selecionados.has(item.chave)}
                    total={itens.length}
                    erroDescricao={errosItens[`itens.${i}.descricao`]}
                    erroPatrimonio={errosItens[`itens.${i}.patrimonio`]}
                    erroObservacao={errosItens[`itens.${i}.observacao`]}
                    acoes={acoesItem}
                  />
                  ),
                )}
                {visiveis.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        Nenhum item corresponde a “{buscaAplicada.trim()}”.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Group mt="sm" gap="xs">
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              disabled={itens.length >= MAXIMO_ITENS}
              onClick={() => {
                setBusca('') // o item novo precisa aparecer
                setItens((atuais) => [...atuais, itemVazio()])
              }}
            >
              Adicionar item
            </Button>
            <Button
              variant="default"
              leftSection={<IconListNumbers size={16} />}
              disabled={vagas < 1}
              onClick={() => {
                setBusca('')
                setGeradorAberto(true)
              }}
            >
              Gerar itens em sequência
            </Button>
            {itens.length > 1 && (
              <Button variant="subtle" color="red" leftSection={<IconClearAll size={16} />} onClick={limparItens}>
                Limpar itens
              </Button>
            )}
          </Group>
        </Paper>

        {edicaoLote > 0 && (
          <EdicaoItensLote
            key={edicaoLote}
            aberto
            itens={itens}
            selecionados={selecionados}
            aoFechar={() => setEdicaoLote(0)}
            aoAplicar={aplicarLote}
          />
        )}

        <GeradorItens
          aberto={geradorAberto}
          vagas={vagas}
          patrimoniosExistentes={itens.map((i) => i.patrimonio)}
          aoFechar={() => setGeradorAberto(false)}
          aoGerar={adicionarGerados}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={() => navegar(-1)}>
            Cancelar
          </Button>
          <Button type="submit" loading={enviando}>
            {id === null ? 'Criar transferência' : 'Salvar alterações'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

interface AcoesItem {
  alterar: (indice: number, campo: 'descricao' | 'patrimonio' | 'observacao', valor: string) => void
  mover: (de: number, para: number) => void
  remover: (indice: number, chave: string) => void
  /** Marca/desmarca um item; com Shift, o intervalo desde o último clicado. */
  selecionar: (chave: string, marcado: boolean, comShift: boolean) => void
}

/**
 * Uma linha da grade de itens. Memorizada: ao digitar num item, só a linha dele é redesenhada
 * (importante em lotes grandes, ex.: 100 computadores gerados em sequência).
 */
const LinhaItem = memo(function LinhaItem({
  indice,
  item,
  selecionado,
  total,
  erroDescricao,
  erroPatrimonio,
  erroObservacao,
  acoes,
}: {
  indice: number
  item: ItemForm
  selecionado: boolean
  total: number
  erroDescricao?: ReactNode
  erroPatrimonio?: ReactNode
  erroObservacao?: ReactNode
  acoes: AcoesItem
}) {
  const n = indice + 1
  return (
    <Table.Tr style={{ verticalAlign: 'top' }} data-selecionado={selecionado || undefined} className="stbp-linha-item">
      <Table.Td pt={14} pr={0}>
        <Checkbox
          size="xs"
          aria-label={`Selecionar item ${n}`}
          checked={selecionado}
          onChange={(e) => acoes.selecionar(item.chave, e.currentTarget.checked, (e.nativeEvent as MouseEvent).shiftKey === true)}
        />
      </Table.Td>
      <Table.Td pt={14} className="stbp-numero" c="dimmed">
        {String(n).padStart(2, '0')}
      </Table.Td>
      <Table.Td>
        <TextInput
          aria-label={`Descrição do item ${n}`}
          maxLength={200}
          value={item.descricao}
          error={erroDescricao}
          onChange={(e) => acoes.alterar(indice, 'descricao', e.currentTarget.value)}
        />
      </Table.Td>
      <Table.Td>
        <TextInput
          aria-label={`Patrimônio do item ${n}`}
          maxLength={150}
          placeholder="S/P"
          classNames={{ input: 'stbp-numero' }}
          value={item.patrimonio}
          error={erroPatrimonio}
          onChange={(e) => acoes.alterar(indice, 'patrimonio', e.currentTarget.value)}
        />
      </Table.Td>
      <Table.Td>
        <TextInput
          aria-label={`Observação do item ${n}`}
          maxLength={5000}
          value={item.observacao}
          error={erroObservacao}
          title={item.observacao.length > 40 ? item.observacao : undefined}
          onChange={(e) => acoes.alterar(indice, 'observacao', e.currentTarget.value)}
        />
      </Table.Td>
      <Table.Td>
        <Group gap={2} wrap="nowrap" pt={4}>
          <ActionIcon variant="subtle" color="gray" disabled={indice === 0} aria-label="Subir item" title="Subir" onClick={() => acoes.mover(indice, indice - 1)}>
            <IconArrowUp size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            disabled={indice === total - 1}
            aria-label="Descer item"
            title="Descer"
            onClick={() => acoes.mover(indice, indice + 1)}
          >
            <IconArrowDown size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" disabled={total === 1} aria-label="Remover item" title="Remover" onClick={() => acoes.remover(indice, item.chave)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  )
})
