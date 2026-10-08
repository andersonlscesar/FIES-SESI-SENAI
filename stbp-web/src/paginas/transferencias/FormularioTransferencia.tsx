import { Alert, Button, Center, Group, Loader, Paper, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { transferenciasApi } from '../../api/recursos'
import type { Motivo, TransferenciaDetalhe, TransferenciaPedido } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { useInstituicoes, useUnidades } from '../../componentes/consultas'
import { comChave, GradeItens, itemVazio, validarItens, type ColunaItem, type ErrosItens, type ItemForm } from '../../componentes/itens/GradeItens'
import { errosDeCampo, mensagemDeErro, MOTIVOS, notificarErro, notificarSucesso } from '../../componentes/util'

interface ValoresForm {
  data: string
  motivo: string
  instituicaoId: string
  origemId: string
  destinoId: string
  responsavelEnvio: string
  responsavelRecebimento: string
}

/** Colunas do termo de transferência (FM-008-SCI-04). */
const COLUNAS: ColunaItem[] = [
  { campo: 'descricao', rotulo: 'Descrição do bem', obrigatorio: true, maxLength: 200, placeholder: 'Ex.: Notebook Dell Latitude 3420' },
  { campo: 'patrimonio', rotulo: 'Patrimônio', largura: 170, maxLength: 150, placeholder: 'S/P' },
  { campo: 'observacao', rotulo: 'Observação', maxLength: 5000 },
]

const obrigatorio = (mensagem: string) => (v: string) => (v.trim() ? null : mensagem)

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
  return t.itens.map((i) =>
    comChave({ id: i.id, descricao: i.descricao, patrimonio: i.patrimonio ?? 'S/P', observacao: i.observacao ?? '' }),
  )
}

export function FormularioTransferencia() {
  const parametro = useParams().id
  const id = parametro ? Number(parametro) : null
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const instituicoes = useInstituicoes()
  const unidades = useUnidades()
  const [enviando, setEnviando] = useState(false)
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

  // Itens fora do useForm (ver GradeItens): só a linha alterada é redesenhada
  const [itens, setItens] = useState<ItemForm[]>(() => [itemVazio()])
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

  const enviar = form.onSubmit(async (v) => {
    const erros = validarItens(itens)
    setErrosItens(erros)
    if (Object.keys(erros).length > 0) {
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

        <GradeItens itens={itens} setItens={setItens} erros={errosItens} setErros={setErrosItens} colunas={COLUNAS} />

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
