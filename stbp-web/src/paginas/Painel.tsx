import { BarChart } from '@mantine/charts'
import { Alert, Button, Center, Group, Input, Loader, Paper, SegmentedControl, Select, SimpleGrid, Stack, Table, Text } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconChartBar, IconMapPin, IconTable } from '@tabler/icons-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { painelApi } from '../api/recursos'
import type { Painel as DadosPainel, PainelSaidas } from '../api/tipos'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina'
import { useInstituicoes } from '../componentes/consultas'
import { Marcador } from '../componentes/Marcador'
import { CartaoPainel, formatarNumero, Indicador, ListaBarras } from '../componentes/painel/Componentes'
import classes from '../componentes/painel/painel.module.css'
import { formatarData, mensagemDeErro, MOTIVOS, TIPOS_SAIDA } from '../componentes/util'

type Preset = '12m' | 'ano' | 'anoAnterior' | 'tudo' | 'personalizado'

const PRESETS: { value: Preset; label: string }[] = [
  { value: '12m', label: 'Últimos 12 meses' },
  { value: 'ano', label: 'Este ano' },
  { value: 'anoAnterior', label: 'Ano anterior' },
  { value: 'tudo', label: 'Todo o histórico' },
  { value: 'personalizado', label: 'Personalizado…' },
]

/** Datas do período escolhido (formato da API: AAAA-MM-DD). */
function intervalo(preset: Preset, inicio?: string | null, fim?: string | null) {
  const hoje = dayjs()
  switch (preset) {
    case 'ano':
      return { dataInicial: hoje.startOf('year').format('YYYY-MM-DD'), dataFinal: hoje.format('YYYY-MM-DD') }
    case 'anoAnterior': {
      const ano = hoje.subtract(1, 'year')
      return { dataInicial: ano.startOf('year').format('YYYY-MM-DD'), dataFinal: ano.endOf('year').format('YYYY-MM-DD') }
    }
    case 'tudo':
      return { dataInicial: '2000-01-01', dataFinal: hoje.format('YYYY-MM-DD') }
    case 'personalizado':
      return inicio && fim ? { dataInicial: inicio, dataFinal: fim } : {}
    default:
      return {} // a API usa os últimos 12 meses
  }
}

type Visao = 'transferencias' | 'saidas'

const VISOES: { value: Visao; label: string }[] = [
  { value: 'transferencias', label: 'Transferências' },
  { value: 'saidas', label: 'Saídas de materiais' },
]

const DESCRICOES: Record<Visao, string> = {
  transferencias: 'Visão geral das transferências de bens patrimoniais. Transferências na lixeira não são consideradas.',
  saidas: 'Visão geral do controle de saída de materiais (FM-072-UOP-04). Saídas na lixeira não são consideradas.',
}

const formatarDecimal = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const rotuloMes = (mes: string) => dayjs(`${mes}-01`).format('MMM/YY').replace('.', '')

export function Painel() {
  const [parametros, setParametros] = useSearchParams()
  const visao: Visao = parametros.get('visao') === 'saidas' ? 'saidas' : 'transferencias'
  const preset = (parametros.get('periodo') as Preset | null) ?? '12m'
  const inicio = parametros.get('inicio')
  const fim = parametros.get('fim')
  const instituicaoId = parametros.get('instituicao') ?? undefined
  const instituicoes = useInstituicoes()

  // Parte da URL atual do navegador, e não dos parâmetros deste render: componentes como o Select do Mantine podem
  // chamar uma versão antiga desta função, e mudanças seguidas de filtro se sobrescreveriam
  const alterar = (mudancas: Record<string, string | null | undefined>) =>
    setParametros(
      () => {
        const novo = new URLSearchParams(window.location.search)
        for (const [chave, valor] of Object.entries(mudancas)) {
          if (valor) novo.set(chave, valor)
          else novo.delete(chave)
        }
        return novo
      },
      { replace: true },
    )

  // Uma consulta por visão: cada uma mantém o próprio quadro anterior enquanto recarrega
  const filtro = { ...intervalo(preset, inicio, fim), instituicaoId }
  const periodoPronto = preset !== 'personalizado' || Boolean(inicio && fim)
  const transferencias = useQuery({
    queryKey: ['painel', filtro],
    queryFn: () => painelApi.gerar(filtro),
    placeholderData: keepPreviousData,
    enabled: visao === 'transferencias' && periodoPronto,
  })
  const saidas = useQuery({
    queryKey: ['painel-saidas', filtro],
    queryFn: () => painelApi.saidas(filtro),
    placeholderData: keepPreviousData,
    enabled: visao === 'saidas' && periodoPronto,
  })
  const consulta = visao === 'saidas' ? saidas : transferencias
  const dados = consulta.data

  return (
    <Stack gap="md">
      <CabecalhoPagina
        titulo="Painel"
        descricao={DESCRICOES[visao]}
      />

      {/* Filtros: uma linha acima de tudo; todos os números abaixo respondem ao mesmo recorte */}
      <Group gap="sm" align="flex-end" wrap="wrap">
        <Input.Wrapper label="Movimentação">
          <SegmentedControl
            display="flex"
            data={VISOES}
            value={visao}
            onChange={(v) => alterar({ visao: v === 'saidas' ? v : null })}
          />
        </Input.Wrapper>
        <Select
          label="Período"
          w={200}
          allowDeselect={false}
          data={PRESETS}
          value={preset}
          onChange={(v) => alterar({ periodo: v === '12m' ? null : v, inicio: null, fim: null })}
        />
        {preset === 'personalizado' && (
          <DatePickerInput
            label="De / até"
            type="range"
            w={260}
            valueFormat="DD/MM/YYYY"
            placeholder="Escolha o intervalo"
            value={[inicio, fim]}
            onChange={([de, ate]) => alterar({ inicio: de, fim: ate })}
          />
        )}
        <Select
          label="Instituição"
          w={200}
          placeholder="Todas"
          clearable
          data={(instituicoes.data ?? []).map((i) => ({ value: String(i.id), label: i.ativa ? i.nome : `${i.nome} (bloqueada)` }))}
          value={instituicaoId ?? null}
          onChange={(v) => alterar({ instituicao: v })}
        />
        {dados && (
          <Text size="xs" c="dimmed" pb={8}>
            {formatarData(dados.periodo.inicio)} a {formatarData(dados.periodo.fim)}
            {' · '}comparado a {formatarData(dados.periodoAnterior.inicio)} a {formatarData(dados.periodoAnterior.fim)}
          </Text>
        )}
      </Group>

      {consulta.isError && <Alert color="red">{mensagemDeErro(consulta.error)}</Alert>}
      {preset === 'personalizado' && !(inicio && fim) && (
        <Text size="sm" c="dimmed">
          Escolha o intervalo de datas para ver o painel.
        </Text>
      )}

      {periodoPronto && consulta.isPending && (
        <Center py="xl">
          <Loader />
        </Center>
      )}
      {dados && (
        <div className={consulta.isPlaceholderData || consulta.isFetching ? classes.recarregando : undefined}>
          {visao === 'saidas' ? (
            <ConteudoPainelSaidas dados={saidas.data as PainelSaidas} />
          ) : (
            <ConteudoPainel dados={transferencias.data as DadosPainel} />
          )}
        </div>
      )}
    </Stack>
  )
}

function ConteudoPainel({ dados }: { dados: DadosPainel }) {
  const r = dados.resumo
  const percentualSemPatrimonio = r.itens === 0 ? 0 : (r.itensSemPatrimonio / r.itens) * 100
  const totalTransferencias = r.transferencias

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        <Indicador rotulo="Transferências" valor={formatarNumero(r.transferencias)} atual={r.transferencias} anterior={r.transferenciasAnterior} />
        <Indicador rotulo="Itens transferidos" valor={formatarNumero(r.itens)} atual={r.itens} anterior={r.itensAnterior} />
        <Indicador
          rotulo="Itens sem patrimônio"
          valor={`${percentualSemPatrimonio.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
          complemento={`${formatarNumero(r.itensSemPatrimonio)} de ${formatarNumero(r.itens)} itens registrados como S/P`}
        />
        <Indicador
          rotulo="Unidades envolvidas"
          valor={formatarNumero(r.unidadesEnvolvidas)}
          complemento={
            r.transferencias > 0
              ? `${(r.itens / r.transferencias).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} itens por transferência, em média`
              : undefined
          }
        />
      </SimpleGrid>

      <EvolucaoMensal
        nome="Transferências"
        meses={dados.porMes.map((m) => ({ mes: m.mes, quantidade: m.transferencias, itens: m.itens }))}
      />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <CartaoPainel titulo="Por motivo" descricao="Transferências no período">
          <ListaBarras
            unidade="transferências"
            total={totalTransferencias}
            linhas={dados.porMotivo.map((m) => ({
              chave: m.motivo,
              rotuloTexto: m.descricao,
              rotulo: <Marcador cor={MOTIVOS[m.motivo].cor}>{m.descricao}</Marcador>,
              valor: m.transferencias,
            }))}
          />
        </CartaoPainel>
        <CartaoPainel titulo="Por instituição" descricao="Transferências no período">
          <ListaBarras
            unidade="transferências"
            total={totalTransferencias}
            linhas={dados.porInstituicao.map((i) => ({ chave: String(i.id), rotuloTexto: i.nome, rotulo: i.nome, valor: i.transferencias }))}
          />
        </CartaoPainel>
        <CartaoPainel titulo="Unidades que mais enviam" descricao="Transferências como origem">
          <ListaBarras
            unidade="transferências"
            linhas={dados.principaisOrigens.map((u) => ({ chave: String(u.id), rotuloTexto: u.nome, rotulo: u.nome, valor: u.transferencias }))}
          />
        </CartaoPainel>
        <CartaoPainel titulo="Unidades que mais recebem" descricao="Transferências como destino">
          <ListaBarras
            unidade="transferências"
            linhas={dados.principaisDestinos.map((u) => ({ chave: String(u.id), rotuloTexto: u.nome, rotulo: u.nome, valor: u.transferencias }))}
          />
        </CartaoPainel>
      </SimpleGrid>

      <CartaoPainel titulo="Principais rotas" descricao="Pares origem → destino mais frequentes">
        <TabelaComBarra
          colunas={['Origem → destino', 'Transferências', 'Itens']}
          linhas={dados.principaisRotas.map((r) => ({
            chave: `${r.origem}>${r.destino}`,
            rotulo: `${r.origem} → ${r.destino}`,
            valor: r.transferencias,
            extra: r.itens,
          }))}
        />
      </CartaoPainel>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <CartaoPainel titulo="Bens mais transferidos" descricao="Itens agrupados pela descrição">
          <TabelaComBarra
            colunas={['Descrição do bem', 'Itens', 'Transferências']}
            linhas={dados.bensMaisTransferidos.map((b) => ({ chave: b.descricao, rotulo: b.descricao, valor: b.itens, extra: b.transferencias }))}
          />
        </CartaoPainel>
        <CartaoPainel titulo="Quem mais registra" descricao="Transferências por usuário emissor">
          <ListaBarras
            unidade="transferências"
            linhas={dados.principaisEmissores.map((u) => ({ chave: String(u.id), rotuloTexto: u.nome, rotulo: u.nome, valor: u.transferencias }))}
          />
        </CartaoPainel>
      </SimpleGrid>
    </Stack>
  )
}

function ConteudoPainelSaidas({ dados }: { dados: PainelSaidas }) {
  const r = dados.resumo
  const percentualExterno = r.saidas === 0 ? 0 : (r.paraDestinoExterno / r.saidas) * 100

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        <Indicador rotulo="Saídas de materiais" valor={formatarNumero(r.saidas)} atual={r.saidas} anterior={r.saidasAnterior} />
        <Indicador rotulo="Materiais" valor={formatarNumero(r.itens)} atual={r.itens} anterior={r.itensAnterior} />
        <Indicador
          rotulo="Para destinos externos"
          valor={`${formatarDecimal(percentualExterno)}%`}
          complemento={`${formatarNumero(r.paraDestinoExterno)} de ${formatarNumero(r.saidas)} saídas foram para fora das unidades`}
        />
        <Indicador
          rotulo="Unidades envolvidas"
          valor={formatarNumero(r.unidadesEnvolvidas)}
          complemento={r.saidas > 0 ? `${formatarDecimal(r.itens / r.saidas)} materiais por saída, em média` : undefined}
        />
      </SimpleGrid>

      <EvolucaoMensal nome="Saídas" meses={dados.porMes.map((m) => ({ mes: m.mes, quantidade: m.saidas, itens: m.itens }))} />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <CartaoPainel titulo="Por tipo de saída" descricao="Saídas no período">
          <ListaBarras
            unidade="saídas"
            total={r.saidas}
            linhas={dados.porTipo.map((t) => ({
              chave: t.tipo,
              rotuloTexto: t.descricao,
              rotulo: <Marcador cor={TIPOS_SAIDA[t.tipo].cor}>{t.descricao}</Marcador>,
              valor: t.saidas,
            }))}
          />
        </CartaoPainel>
        <CartaoPainel titulo="Por instituição" descricao="Saídas no período">
          <ListaBarras
            unidade="saídas"
            total={r.saidas}
            linhas={dados.porInstituicao.map((i) => ({ chave: String(i.id), rotuloTexto: i.nome, rotulo: i.nome, valor: i.saidas }))}
          />
        </CartaoPainel>
        <CartaoPainel titulo="Unidades de onde mais saem materiais" descricao="Saídas como origem">
          <ListaBarras
            unidade="saídas"
            linhas={dados.principaisOrigens.map((u) => ({ chave: String(u.id), rotuloTexto: u.nome, rotulo: u.nome, valor: u.saidas }))}
          />
        </CartaoPainel>
        <CartaoPainel titulo="Destinos mais frequentes" descricao="Unidades e destinos externos (com o alfinete)">
          <ListaBarras
            unidade="saídas"
            linhas={dados.principaisDestinos.map((d) => ({
              chave: `${d.externo ? 'externo' : 'unidade'}:${d.nome}`,
              rotuloTexto: d.externo ? `${d.nome} (destino externo)` : d.nome,
              rotulo: d.externo ? (
                <>
                  <IconMapPin size={13} stroke={1.8} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
                  {d.nome}
                </>
              ) : (
                d.nome
              ),
              valor: d.saidas,
            }))}
          />
        </CartaoPainel>
      </SimpleGrid>

      <CartaoPainel titulo="Principais rotas" descricao="Pares origem → destino mais frequentes">
        <TabelaComBarra
          colunas={['Origem → destino', 'Saídas', 'Materiais']}
          linhas={dados.principaisRotas.map((rota) => ({
            chave: `${rota.origem}>${rota.destinoExterno ? 'externo:' : ''}${rota.destino}`,
            rotulo: `${rota.origem} → ${rota.destino}${rota.destinoExterno ? ' (externo)' : ''}`,
            valor: rota.saidas,
            extra: rota.itens,
          }))}
        />
      </CartaoPainel>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <CartaoPainel titulo="Materiais mais frequentes" descricao="Itens agrupados pela descrição">
          <TabelaComBarra
            colunas={['Descrição do material', 'Itens', 'Saídas']}
            linhas={dados.materiaisMaisFrequentes.map((m) => ({ chave: m.descricao, rotulo: m.descricao, valor: m.itens, extra: m.saidas }))}
          />
        </CartaoPainel>
        <CartaoPainel titulo="Quem mais registra" descricao="Saídas por usuário emissor">
          <ListaBarras
            unidade="saídas"
            linhas={dados.principaisEmissores.map((u) => ({ chave: String(u.id), rotuloTexto: u.nome, rotulo: u.nome, valor: u.saidas }))}
          />
        </CartaoPainel>
      </SimpleGrid>
    </Stack>
  )
}

/**
 * Colunas por mês, uma série por vez (registros OU itens: escalas diferentes nunca dividem o eixo).
 * {@code nome} é o que se conta: "Transferências" ou "Saídas".
 */
function EvolucaoMensal({ nome, meses }: { nome: string; meses: { mes: string; quantidade: number; itens: number }[] }) {
  const [medida, setMedida] = useState<'quantidade' | 'itens'>('quantidade')
  const [comoTabela, setComoTabela] = useState(false)
  const nomeMedida = medida === 'quantidade' ? nome : 'Itens'
  const serie = meses.map((m) => ({ mes: rotuloMes(m.mes), valor: m[medida], quantidade: m.quantidade, itens: m.itens }))

  return (
    <CartaoPainel
      titulo="Evolução mensal"
      descricao={`${nomeMedida} por mês`}
      acao={
        <Group gap="xs">
          <SegmentedControl
            size="xs"
            value={medida}
            onChange={(v) => setMedida(v as typeof medida)}
            data={[
              { value: 'quantidade', label: nome },
              { value: 'itens', label: 'Itens' },
            ]}
          />
          <Button
            size="xs"
            variant="default"
            leftSection={comoTabela ? <IconChartBar size={14} /> : <IconTable size={14} />}
            onClick={() => setComoTabela((v) => !v)}
          >
            {comoTabela ? 'Ver gráfico' : 'Ver tabela'}
          </Button>
        </Group>
      }
    >
      {comoTabela ? (
        <Table.ScrollContainer minWidth={360}>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mês</Table.Th>
                <Table.Th ta="right">{nome}</Table.Th>
                <Table.Th ta="right">Itens</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {serie.map((m) => (
                <Table.Tr key={m.mes}>
                  <Table.Td>{m.mes}</Table.Td>
                  <Table.Td ta="right">{formatarNumero(m.quantidade)}</Table.Td>
                  <Table.Td ta="right">{formatarNumero(m.itens)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      ) : (
        <BarChart
          h={260}
          data={serie}
          dataKey="mes"
          series={[{ name: 'valor', label: nomeMedida, color: 'var(--stbp-dado)' }]}
          maxBarWidth={24}
          barProps={{ radius: [2, 2, 0, 0] }}
          gridAxis="x"
          gridProps={{ strokeDasharray: '0' }}
          tickLine="none"
          valueFormatter={(v) => formatarNumero(v)}
          tooltipAnimationDuration={0}
          withLegend={false}
          aria-label={`Gráfico de colunas: ${nomeMedida.toLowerCase()} por mês`}
        />
      )}
    </CartaoPainel>
  )
}

/** Tabela compacta com uma barra embutida na coluna principal (ranking com valores exatos). */
function TabelaComBarra({
  colunas,
  linhas,
}: {
  colunas: [string, string, string]
  linhas: { chave: string; rotulo: string; valor: number; extra: number }[]
}) {
  const maximo = Math.max(1, ...linhas.map((l) => l.valor))
  if (linhas.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Sem dados no período.
      </Text>
    )
  }
  return (
    <Table.ScrollContainer minWidth={420}>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{colunas[0]}</Table.Th>
            <Table.Th ta="right" w={120}>
              {colunas[1]}
            </Table.Th>
            <Table.Th ta="right" w={120}>
              {colunas[2]}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {linhas.map((l) => (
            <Table.Tr key={l.chave}>
              <Table.Td>
                <Text size="sm" lineClamp={1} title={l.rotulo}>
                  {l.rotulo}
                </Text>
                <Paper h={4} mt={6} radius={0} bg="var(--stbp-dado-trilho)" aria-hidden>
                  <div style={{ width: `${(l.valor / maximo) * 100}%`, height: '100%', background: 'var(--stbp-dado)' }} />
                </Paper>
              </Table.Td>
              <Table.Td ta="right" fw={600}>
                {formatarNumero(l.valor)}
              </Table.Td>
              <Table.Td ta="right" c="dimmed">
                {formatarNumero(l.extra)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
