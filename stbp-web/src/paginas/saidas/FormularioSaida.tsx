import { Alert, Button, Center, Group, Input, Loader, Paper, SegmentedControl, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { saidasApi } from '../../api/recursos'
import type { SaidaDetalhe, SaidaPedido, TipoSaida } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { useInstituicoes, useUnidades } from '../../componentes/consultas'
import { comChave, GradeItens, itemVazio, validarItens, type ColunaItem, type ErrosItens, type ItemForm } from '../../componentes/itens/GradeItens'
import { errosDeCampo, mensagemDeErro, notificarErro, notificarSucesso, TIPOS_SAIDA } from '../../componentes/util'

interface ValoresForm {
  data: string
  tipo: TipoSaida
  tipoOutro: string
  instituicaoId: string
  origemId: string
  /** Destino: uma unidade cadastrada ou um destino externo (assistência técnica, local de evento...). */
  destinoModo: 'unidade' | 'externo'
  destinoId: string
  destinoExterno: string
  portador: string
}

/** Colunas do formulário FM-072-UOP-04 (sem patrimônio: nesta modalidade os materiais não são patrimoniados). */
const COLUNAS: ColunaItem[] = [
  { campo: 'descricao', rotulo: 'Descrição do material', obrigatorio: true, maxLength: 200, placeholder: 'Ex.: Projetor Epson' },
  { campo: 'areaSaida', rotulo: 'Área de saída', largura: 190, maxLength: 150, placeholder: 'Setor, oficina, lab.' },
  { campo: 'areaEntrada', rotulo: 'Área de entrada', largura: 190, maxLength: 150, placeholder: 'Setor, oficina, lab.' },
  { campo: 'observacao', rotulo: 'Observação', maxLength: 5000, placeholder: 'Se temporário, data prevista de retorno' },
]

const obrigatorio = (mensagem: string) => (v: string) => (v.trim() ? null : mensagem)

function valoresDe(s: SaidaDetalhe): ValoresForm {
  return {
    data: s.data,
    tipo: s.tipo,
    tipoOutro: s.tipoOutro ?? '',
    instituicaoId: String(s.instituicao.id),
    origemId: String(s.origem.id),
    destinoModo: s.destino ? 'unidade' : 'externo',
    destinoId: s.destino ? String(s.destino.id) : '',
    destinoExterno: s.destinoExterno ?? '',
    portador: s.portador ?? '',
  }
}

function itensDe(s: SaidaDetalhe): ItemForm[] {
  return s.itens.map((i) =>
    comChave({
      id: i.id,
      descricao: i.descricao,
      patrimonio: '',
      areaSaida: i.areaSaida ?? '',
      areaEntrada: i.areaEntrada ?? '',
      observacao: i.observacao ?? '',
    }),
  )
}

export function FormularioSaida() {
  const parametro = useParams().id
  const id = parametro ? Number(parametro) : null
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const instituicoes = useInstituicoes()
  const unidades = useUnidades()
  const [enviando, setEnviando] = useState(false)
  const inicializado = useRef(false)

  const existente = useQuery({ queryKey: ['saida', id], queryFn: () => saidasApi.detalhar(id!), enabled: id !== null })

  const form = useForm<ValoresForm>({
    initialValues: {
      data: dayjs().format('YYYY-MM-DD'),
      tipo: 'PERMANENTE',
      tipoOutro: '',
      instituicaoId: '',
      origemId: '',
      destinoModo: 'unidade',
      destinoId: '',
      destinoExterno: '',
      portador: '',
    },
    validate: {
      data: (v) => (v ? null : 'Informe a data'),
      instituicaoId: obrigatorio('Informe a instituição'),
      origemId: obrigatorio('Informe a unidade de origem'),
      tipoOutro: (v, valores) => (valores.tipo === 'OUTRO' && !v.trim() ? 'Informe qual é o tipo de saída' : null),
      destinoId: (v, valores) => (valores.destinoModo === 'unidade' && !v ? 'Informe a unidade de destino' : null),
      destinoExterno: (v, valores) => (valores.destinoModo === 'externo' && !v.trim() ? 'Informe o destino' : null),
    },
  })

  const [itens, setItens] = useState<ItemForm[]>(() => [itemVazio(true)])
  const [errosItens, setErrosItens] = useState<ErrosItens>({})

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
    return <Alert color="red">Você não pode alterar esta saída.</Alert>
  }

  // Bloqueadas não entram em registros novos; ao editar, as atuais continuam disponíveis (D-033, D-035)
  const instituicaoAtual = existente.data?.instituicao.id
  const opcoesInstituicao = (instituicoes.data ?? [])
    .filter((i) => i.ativa || i.id === instituicaoAtual)
    .map((i) => ({ value: String(i.id), label: i.ativa ? i.nome : `${i.nome} (bloqueada)` }))
  const instituicaoId = Number(form.values.instituicaoId)
  const opcoesUnidade = (atualId: number | undefined) =>
    (unidades.data ?? [])
      .filter((u) => u.instituicaoIds.includes(instituicaoId))
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

  const enviar = form.onSubmit(async (v) => {
    const erros = validarItens(itens)
    setErrosItens(erros)
    if (Object.keys(erros).length > 0) {
      notificarErro(new Error('Há itens sem descrição.'))
      return
    }
    const externo = v.destinoModo === 'externo'
    const pedido: SaidaPedido = {
      data: v.data,
      tipo: v.tipo,
      tipoOutro: v.tipo === 'OUTRO' ? v.tipoOutro : null,
      instituicaoId: Number(v.instituicaoId),
      origemId: Number(v.origemId),
      destinoId: externo ? null : Number(v.destinoId),
      destinoExterno: externo ? v.destinoExterno : null,
      portador: v.portador || null,
      itens: itens.map(({ id, descricao, areaSaida, areaEntrada, observacao }) => ({
        id,
        descricao,
        areaSaida: areaSaida ?? '',
        areaEntrada: areaEntrada ?? '',
        observacao,
      })),
    }
    setEnviando(true)
    try {
      const salva = id === null ? await saidasApi.criar(pedido) : await saidasApi.atualizar(id, pedido)
      queryClient.setQueryData(['saida', salva.id], salva)
      await queryClient.invalidateQueries({ queryKey: ['saidas'] })
      await queryClient.invalidateQueries({ queryKey: ['autores-saidas'] })
      notificarSucesso(id === null ? `Saída nº ${salva.id} registrada.` : 'Saída atualizada.')
      navegar(`/saidas/${salva.id}`, { replace: id !== null })
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

  const semInstituicao = !form.values.instituicaoId
  return (
    <form onSubmit={enviar}>
      <Stack gap="md">
        <CabecalhoPagina
          titulo={id === null ? 'Nova saída de materiais' : `Editar saída nº ${id}`}
          descricao="Os dados abaixo saem impressos no Controle de Saída de Materiais da Unidade (FM-072-UOP-04)."
        />

        <Paper withBorder>
          <Text fw={600} px="md" py="sm" style={{ borderBottom: '1px solid var(--stbp-borda)' }}>
            Dados da saída
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" p="md">
            <DateInput label="Data" valueFormat="DD/MM/YYYY" withAsterisk {...form.getInputProps('data')} />
            <Select
              label="Tipo de saída"
              withAsterisk
              allowDeselect={false}
              data={Object.entries(TIPOS_SAIDA).map(([value, t]) => ({ value, label: t.nome }))}
              {...form.getInputProps('tipo')}
            />
            {form.values.tipo === 'OUTRO' ? (
              <TextInput label="Outro, qual?" withAsterisk maxLength={150} placeholder="Ex.: doação" {...form.getInputProps('tipoOutro')} />
            ) : (
              <div />
            )}
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
              disabled={semInstituicao}
              placeholder={semInstituicao ? 'Escolha a instituição' : undefined}
              data={opcoesUnidade(existente.data?.origem.id)}
              {...form.getInputProps('origemId')}
            />
            <TextInput
              label="Portador do equipamento"
              description="Opcional. Sai impresso sob a linha de assinatura."
              maxLength={150}
              {...form.getInputProps('portador')}
            />
          </SimpleGrid>
          <Stack gap={6} px="md" pb="md">
            <Input.Label required>Para</Input.Label>
            <Group align="flex-start" gap="sm" wrap="nowrap">
              <SegmentedControl
                aria-label="Tipo de destino"
                value={form.values.destinoModo}
                onChange={(v) => form.setFieldValue('destinoModo', v as ValoresForm['destinoModo'])}
                data={[
                  { value: 'unidade', label: 'Unidade' },
                  { value: 'externo', label: 'Destino externo' },
                ]}
              />
              {form.values.destinoModo === 'unidade' ? (
                <Select
                  aria-label="Para (unidade de destino)"
                  searchable
                  style={{ flex: 1, maxWidth: 420 }}
                  disabled={semInstituicao}
                  placeholder={semInstituicao ? 'Escolha a instituição' : 'Unidade de destino'}
                  data={opcoesUnidade(existente.data?.destino?.id)}
                  {...form.getInputProps('destinoId')}
                />
              ) : (
                <TextInput
                  aria-label="Para (destino externo)"
                  style={{ flex: 1, maxWidth: 420 }}
                  maxLength={200}
                  placeholder="Ex.: assistência técnica, local do evento"
                  {...form.getInputProps('destinoExterno')}
                />
              )}
            </Group>
          </Stack>
        </Paper>

        <GradeItens
          itens={itens}
          setItens={setItens}
          erros={errosItens}
          setErros={setErrosItens}
          colunas={COLUNAS}
          descricaoGerador="Para vários materiais iguais. A descrição, as áreas e a observação são repetidas em todos e podem ser ajustadas depois."
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={() => navegar(-1)}>
            Cancelar
          </Button>
          <Button type="submit" loading={enviando}>
            {id === null ? 'Registrar saída' : 'Salvar alterações'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
