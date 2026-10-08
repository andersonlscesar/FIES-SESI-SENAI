import { ActionIcon, Button, Group, Pagination, Paper, Select, SimpleGrid, Stack, Switch, Text, TextInput, Tooltip } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useDebouncedCallback } from '@mantine/hooks'
import { IconFileTypePdf, IconFilterOff, IconPlus, IconSearch } from '@tabler/icons-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { saidasApi } from '../../api/recursos'
import type { FiltroSaida } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { opcoes, useAutoresSaidas, useInstituicoes, useUnidades } from '../../componentes/consultas'
import { TabelaSaidas } from '../../componentes/TabelaSaidas'
import { abrirFormularioSaida, TIPOS_SAIDA } from '../../componentes/util'
import { useSessao } from '../../sessao/Sessao'

const CAMPOS: (keyof FiltroSaida)[] = [
  'busca', 'instituicaoId', 'origemId', 'destinoId', 'criadoPorId', 'tipo', 'dataInicial', 'dataFinal', 'minhas', 'page',
]

export function ListaSaidas() {
  const { temPerfil } = useSessao()
  const [parametros, setParametros] = useSearchParams()
  const filtro: FiltroSaida = Object.fromEntries(CAMPOS.map((c) => [c, parametros.get(c) ?? undefined])) as FiltroSaida

  const [busca, setBusca] = useState(filtro.busca ?? '')
  const instituicoes = useInstituicoes()
  const unidades = useUnidades()
  const autores = useAutoresSaidas()

  const consulta = useQuery({
    queryKey: ['saidas', filtro],
    queryFn: () => saidasApi.listar(filtro),
    placeholderData: keepPreviousData,
  })

  /** Altera filtros na URL (a partir da URL atual, ver ListaTransferencias); filtro novo volta à primeira página. */
  const alterar = (mudancas: Partial<FiltroSaida>) =>
    setParametros(
      () => {
        const novo = new URLSearchParams(window.location.search)
        for (const [chave, valor] of Object.entries(mudancas)) {
          if (valor) novo.set(chave, valor)
          else novo.delete(chave)
        }
        if (!('page' in mudancas)) novo.delete('page')
        return novo
      },
      { replace: true },
    )
  const alterarBusca = useDebouncedCallback((valor: string) => alterar({ busca: valor.trim() }), 400)
  const temFiltro = CAMPOS.some((c) => c !== 'page' && filtro[c])
  const opcoesUnidades = (unidades.data ?? []).map((u) => ({ value: String(u.id), label: u.ativa ? u.nome : `${u.nome} (bloqueada)` }))

  const pagina = consulta.data
  return (
    <Stack gap="md">
      <CabecalhoPagina
        titulo="Saídas de materiais"
        descricao="Controle de saída de materiais da unidade (formulário FM-072-UOP-04): movimentações mais simples, permanentes ou temporárias."
        acoes={
          temPerfil('TECNICO') && (
            <Button component={Link} to="/saidas/nova" leftSection={<IconPlus size={16} />}>
              Nova saída
            </Button>
          )
        }
      />

      <Paper withBorder p="md">
        <Stack gap="sm">
          <TextInput
            placeholder="Buscar por número, unidade, destino externo, portador, material ou área…"
            leftSection={<IconSearch size={16} />}
            value={busca}
            onChange={(e) => {
              setBusca(e.currentTarget.value)
              alterarBusca(e.currentTarget.value)
            }}
          />
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
            <Select
              placeholder="Instituição"
              clearable
              data={(instituicoes.data ?? []).map((i) => ({ value: String(i.id), label: i.ativa ? i.nome : `${i.nome} (bloqueada)` }))}
              value={filtro.instituicaoId ?? null}
              onChange={(v) => alterar({ instituicaoId: v ?? '' })}
            />
            <Select
              placeholder="De (origem)"
              clearable
              searchable
              data={opcoesUnidades}
              value={filtro.origemId ?? null}
              onChange={(v) => alterar({ origemId: v ?? '' })}
            />
            <Select
              placeholder="Para (unidade de destino)"
              clearable
              searchable
              data={opcoesUnidades}
              value={filtro.destinoId ?? null}
              onChange={(v) => alterar({ destinoId: v ?? '' })}
            />
            <Select
              placeholder="Tipo de saída"
              clearable
              data={Object.entries(TIPOS_SAIDA).map(([value, t]) => ({ value, label: t.nome }))}
              value={filtro.tipo ?? null}
              onChange={(v) => alterar({ tipo: v ?? '' })}
            />
            <Select
              placeholder="Registrada por"
              clearable
              searchable
              data={opcoes(autores.data)}
              value={filtro.criadoPorId ?? null}
              onChange={(v) => alterar({ criadoPorId: v ?? '' })}
            />
            <DatePickerInput
              type="range"
              placeholder="Período"
              clearable
              valueFormat="DD/MM/YYYY"
              value={[filtro.dataInicial ?? null, filtro.dataFinal ?? null]}
              onChange={([inicio, fim]) => alterar({ dataInicial: inicio ?? '', dataFinal: fim ?? '' })}
            />
            <Group>
              <Switch
                label="Somente as minhas"
                checked={filtro.minhas === 'true'}
                onChange={(e) => alterar({ minhas: e.currentTarget.checked ? 'true' : '' })}
              />
            </Group>
            <Group justify="flex-end">
              {temFiltro && (
                <Button
                  variant="subtle"
                  leftSection={<IconFilterOff size={16} />}
                  onClick={() => {
                    setBusca('')
                    setParametros(new URLSearchParams(), { replace: true })
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </Group>
          </SimpleGrid>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Text size="sm" c="dimmed" mb="sm">
          {pagina ? `${pagina.totalElementos.toLocaleString('pt-BR')} saída(s)` : 'Carregando…'}
        </Text>
        <TabelaSaidas
          linhas={pagina?.conteudo ?? []}
          acoes={(s) => (
            <Tooltip label="Formulário em PDF">
              <ActionIcon variant="subtle" aria-label="Formulário em PDF" onClick={() => abrirFormularioSaida(s.id)}>
                <IconFileTypePdf size={18} />
              </ActionIcon>
            </Tooltip>
          )}
        />
        {pagina && pagina.totalPaginas > 1 && (
          <Group justify="center" mt="md">
            <Pagination total={pagina.totalPaginas} value={pagina.pagina + 1} onChange={(p) => alterar({ page: String(p - 1) })} />
          </Group>
        )}
      </Paper>
    </Stack>
  )
}
