import { ActionIcon, Alert, Button, Checkbox, CloseButton, Group, Menu, Paper, Table, Text, TextInput } from '@mantine/core'
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
import { memo, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'

import { EdicaoItensLote } from '../EdicaoItensLote'
import { aplicarEmLote, criterios, intervalo, type AlteracoesLote, type CampoTexto } from '../edicaoLote'
import { filtrarItens } from '../filtroItens'
import { GeradorItens, type ItemGerado } from '../GeradorItens'
import { descreverIntervalo, MAXIMO_ITENS } from '../sequencia'
import { notificarErro, notificarSucesso } from '../util'

/** Um item no formulário. As áreas só existem no Controle de Saída de Materiais. */
export interface ItemForm {
  chave: string
  id?: number
  descricao: string
  patrimonio: string
  areaSaida?: string
  areaEntrada?: string
  observacao: string
}

export type CampoItem = 'descricao' | 'patrimonio' | 'areaSaida' | 'areaEntrada' | 'observacao'

/** Coluna editável da grade. */
export interface ColunaItem {
  campo: CampoItem
  rotulo: string
  /** Largura fixa em px (sem ela, a coluna divide o espaço restante). */
  largura?: number
  obrigatorio?: boolean
  maxLength: number
  placeholder?: string
}

/** Erros dos itens, por caminho ("itens.3.descricao") ou geral ("itens"). */
export type ErrosItens = Record<string, string>

/** A partir de quantos itens o filtro aparece (mesmo critério do detalhe). */
const MINIMO_PARA_FILTRO = 6
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

const novaChave = () => crypto.randomUUID()
export const itemVazio = (comAreas = false): ItemForm => ({
  chave: novaChave(),
  descricao: '',
  patrimonio: '',
  observacao: '',
  ...(comAreas ? { areaSaida: '', areaEntrada: '' } : {}),
})
export const comChave = <T extends object>(item: T) => ({ chave: novaChave(), ...item })
const itemEstaVazio = (i: ItemForm) =>
  !i.id && ![i.descricao, i.patrimonio, i.observacao, i.areaSaida ?? '', i.areaEntrada ?? ''].some((v) => v.trim())

/** Descrição obrigatória em todos os itens; devolve os erros por caminho (vazio = válido). */
export function validarItens(itens: ItemForm[]): ErrosItens {
  const erros: ErrosItens = {}
  itens.forEach((item, i) => {
    if (!item.descricao.trim()) erros[`itens.${i}.descricao`] = 'Informe a descrição'
  })
  return erros
}

const ROTULO_CURTO: Record<CampoItem, string> = {
  descricao: 'Descrição',
  patrimonio: 'Patrimônio',
  areaSaida: 'Área de saída',
  areaEntrada: 'Área de entrada',
  observacao: 'Observação',
}

/**
 * Grade de itens editável, com filtro, seleção (Shift+clique para intervalos), edição em lote, gerador de itens em
 * sequência e reordenação. Usada pela transferência e pelo controle de saída, que mudam só as colunas.
 *
 * Os itens ficam fora do useForm do formulário: ele copia todos os valores a cada tecla, o que redesenharia todas as
 * linhas. Aqui cada alteração cria um objeto novo só para a linha alterada, e as demais (memorizadas) não são
 * redesenhadas — essencial para lotes grandes (ex.: 100 computadores gerados em sequência).
 */
export function GradeItens({
  itens,
  setItens,
  erros,
  setErros,
  colunas,
  descricaoGerador,
}: {
  itens: ItemForm[]
  setItens: Dispatch<SetStateAction<ItemForm[]>>
  erros: ErrosItens
  setErros: Dispatch<SetStateAction<ErrosItens>>
  colunas: ColunaItem[]
  descricaoGerador?: ReactNode
}) {
  const comAreas = colunas.some((c) => c.campo === 'areaSaida' || c.campo === 'areaEntrada')
  // Sem coluna de patrimônio (controle de saída): o gerador cria itens iguais e não há opções de patrimônio
  const comPatrimonio = colunas.some((c) => c.campo === 'patrimonio')
  const [geradorAberto, setGeradorAberto] = useState(false)
  const [edicaoLote, setEdicaoLote] = useState(0) // 0 = fechada; muda a cada abertura para começar limpa

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
      ...i,
      ordem: n + 1,
      patrimonio: !comPatrimonio ? undefined : i.patrimonio.trim() ? i.patrimonio : null,
    }))
    return new Set(filtrarItens(comOrdem, buscaAplicada).map((i) => i.chave))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaAplicada, itens.length])

  // Ações das linhas com identidade estável (não dependem de nada do render): a memorização das linhas funciona
  const acoesItem = useMemo<AcoesItem>(
    () => ({
      alterar: (i, campo, valor) => {
        setItens((atuais) => atuais.map((item, j) => (j === i ? { ...item, [campo]: valor } : item)))
        setErros((atuais) => {
          const caminho = `itens.${i}.${campo}`
          if (!(caminho in atuais)) return atuais
          const { [caminho]: _, ...resto } = atuais
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
        setErros({}) // os índices mudam; os erros voltam a aparecer ao salvar
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
    [setItens, setErros],
  )

  /** A linha em branco inicial é substituída pelos itens gerados, em vez de sobrar vazia. */
  const soLinhaVazia = itens.length === 1 && itemEstaVazio(itens[0])
  const vagas = MAXIMO_ITENS - (soLinhaVazia ? 0 : itens.length)

  const adicionarGerados = (gerados: ItemGerado[]) => {
    const novos = gerados.map((g) => comChave(g))
    setItens(soLinhaVazia ? novos : [...itens, ...novos])
    const intervalo = comPatrimonio ? ` (patrimônio ${descreverIntervalo(gerados.map((g) => g.patrimonio))})` : ''
    notificarSucesso(`${gerados.length} ${gerados.length === 1 ? 'item gerado' : 'itens gerados'}${intervalo}.`)
  }

  const limparItens = () =>
    modals.openConfirmModal({
      title: 'Limpar todos os itens?',
      children: <Text size="sm">Os {itens.length} itens da lista serão removidos do formulário. Nada é gravado até você salvar.</Text>,
      labels: { confirm: 'Limpar itens', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        setItens([itemVazio(comAreas)])
        setErros({})
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
    try {
      const novos = aplicarEmLote(itens, selecionados, alteracoes)
      const alterados = novos.filter((item, i) => item !== itens[i]).length
      setItens(novos)
      setErros({})
      notificarSucesso(`Alteração aplicada a ${plural(alterados, 'item', 'itens')}.`)
    } catch (erro) {
      notificarErro(erro)
    }
  }

  const removerSelecionados = () =>
    modals.openConfirmModal({
      title: `Remover ${plural(selecionados.size, 'item selecionado', 'itens selecionados')}?`,
      children: <Text size="sm">Eles saem da lista do formulário. Nada é gravado até você salvar.</Text>,
      labels: { confirm: 'Remover', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        const restantes = itens.filter((i) => !selecionados.has(i.chave))
        setItens(restantes.length > 0 ? restantes : [itemVazio(comAreas)])
        setSelecionados(new Set())
        setErros({})
      },
    })

  // Campos de texto livre que a edição em lote pode substituir (descrição e, na saída, as áreas)
  const camposTexto = colunas
    .filter((c): c is ColunaItem & { campo: CampoTexto } => c.campo === 'descricao' || c.campo === 'areaSaida' || c.campo === 'areaEntrada')
    .map((c) => ({ campo: c.campo, rotulo: ROTULO_CURTO[c.campo], maxLength: c.maxLength, placeholder: c.placeholder }))

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="sm">
        <Text fw={600}>
          Itens ({itens.length}
          {itens.length >= MAXIMO_ITENS * 0.8 ? ` de ${MAXIMO_ITENS}` : ''})
        </Text>
        {comPatrimonio && (
          <Text size="xs" c="dimmed">
            Sem patrimônio? Deixe em branco ou escreva S/P.
          </Text>
        )}
      </Group>
      {erros.itens && (
        <Alert color="red" mb="sm">
          {erros.itens}
        </Alert>
      )}
      {(comFiltro || selecionados.size > 0) && (
        <Group justify="space-between" gap="sm" py="xs" mb="xs" className="stbp-barra-itens">
          <Group gap="xs">
            {comFiltro && (
              <TextInput
                aria-label="Filtrar itens"
                placeholder={comPatrimonio ? 'Filtrar itens por texto, patrimônio ou nº' : 'Filtrar itens por texto ou nº'}
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
                {comPatrimonio && (
                  <Menu.Item onClick={() => selecionarVisiveis(criterios.semPatrimonio)}>Sem patrimônio</Menu.Item>
                )}
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
      <Table.ScrollContainer minWidth={comAreas ? 960 : 760}>
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
              {colunas.map((c) => (
                <Table.Th key={c.campo} w={c.largura}>
                  {c.rotulo}
                  {c.obrigatorio ? ' *' : ''}
                </Table.Th>
              ))}
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
                  colunas={colunas}
                  erros={erros}
                  acoes={acoesItem}
                />
              ),
            )}
            {visiveis.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={colunas.length + 3}>
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
            setItens((atuais) => [...atuais, itemVazio(comAreas)])
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
          {comPatrimonio ? 'Gerar itens em sequência' : 'Adicionar vários iguais'}
        </Button>
        {itens.length > 1 && (
          <Button variant="subtle" color="red" leftSection={<IconClearAll size={16} />} onClick={limparItens}>
            Limpar itens
          </Button>
        )}
      </Group>

      {edicaoLote > 0 && (
        <EdicaoItensLote
          key={edicaoLote}
          aberto
          itens={itens}
          selecionados={selecionados}
          camposTexto={camposTexto}
          permitePatrimonio={comPatrimonio}
          aoFechar={() => setEdicaoLote(0)}
          aoAplicar={aplicarLote}
        />
      )}

      <GeradorItens
        aberto={geradorAberto}
        vagas={vagas}
        comAreas={comAreas}
        comPatrimonio={comPatrimonio}
        descricao={descricaoGerador}
        patrimoniosExistentes={itens.map((i) => i.patrimonio)}
        aoFechar={() => setGeradorAberto(false)}
        aoGerar={adicionarGerados}
      />
    </Paper>
  )
}

interface AcoesItem {
  alterar: (indice: number, campo: CampoItem, valor: string) => void
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
  colunas,
  erros,
  acoes,
}: {
  indice: number
  item: ItemForm
  selecionado: boolean
  total: number
  colunas: ColunaItem[]
  erros: ErrosItens
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
      {colunas.map((c) => {
        const valor = item[c.campo] ?? ''
        return (
          <Table.Td key={c.campo}>
            <TextInput
              aria-label={`${ROTULO_CURTO[c.campo]} do item ${n}`}
              maxLength={c.maxLength}
              placeholder={c.placeholder}
              classNames={c.campo === 'patrimonio' ? { input: 'stbp-numero' } : undefined}
              value={valor}
              error={erros[`itens.${indice}.${c.campo}`]}
              title={valor.length > 40 ? valor : undefined}
              onChange={(e) => acoes.alterar(indice, c.campo, e.currentTarget.value)}
            />
          </Table.Td>
        )
      })}
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
