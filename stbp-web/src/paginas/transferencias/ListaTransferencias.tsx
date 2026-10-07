import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useDebouncedCallback } from '@mantine/hooks'
import { IconFileTypePdf, IconFilterOff, IconPlus, IconSearch } from '@tabler/icons-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { transferenciasApi } from '../../api/recursos'
import type { FiltroTransferencia, TransferenciaResumo } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { CartoesTransferencias } from '../../componentes/CartoesTransferencias'
import { opcoes, useAutores, useInstituicoes, useUnidades } from '../../componentes/consultas'
import { SeletorModo, useModoExibicao } from '../../componentes/ModoExibicao'
import { TabelaTransferencias } from '../../componentes/TabelaTransferencias'
import { abrirTermo, MOTIVOS } from '../../componentes/util'
import { useSessao } from '../../sessao/Sessao'

const CAMPOS: (keyof FiltroTransferencia)[] = [
  'busca', 'instituicaoId', 'origemId', 'destinoId', 'criadoPorId', 'motivo', 'dataInicial', 'dataFinal', 'minhas', 'page',
]

export function ListaTransferencias() {
  const { temPerfil } = useSessao()
  const [parametros, setParametros] = useSearchParams()
  const filtro: FiltroTransferencia = Object.fromEntries(
    CAMPOS.map((c) => [c, parametros.get(c) ?? undefined]),
  ) as FiltroTransferencia

  const [busca, setBusca] = useState(filtro.busca ?? '')
  const instituicoes = useInstituicoes()
  const unidades = useUnidades()
  const autores = useAutores()

  const consulta = useQuery({
    queryKey: ['transferencias', filtro],
    queryFn: () => transferenciasApi.listar(filtro),
    placeholderData: keepPreviousData,
  })

  /** Altera filtros na URL; qualquer mudança de filtro volta para a primeira página. */
  // Parte da URL atual do navegador, e não dos parâmetros deste render: componentes como o Select do Mantine podem
  // chamar uma versão antiga desta função, e mudanças seguidas de filtro se sobrescreveriam
  const alterar = (mudancas: Partial<FiltroTransferencia>) =>
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

  const [modo, setModo] = useModoExibicao()
  const menuPdf = (t: TransferenciaResumo) => (
    <Menu position="bottom-end">
      <Menu.Target>
        <Tooltip label="Termo em PDF">
          <ActionIcon variant="subtle" aria-label="Termo em PDF">
            <IconFileTypePdf size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={() => abrirTermo(t.id, 'RETRATO')}>Retrato (1 via)</Menu.Item>
        <Menu.Item onClick={() => abrirTermo(t.id, 'PAISAGEM')}>Paisagem (2 vias)</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )

  const pagina = consulta.data
  return (
    <Stack gap="md">
      <CabecalhoPagina
        titulo="Transferências"
        descricao="Termos de transferência de bens entre as unidades do SESI e do SENAI."
        acoes={
          temPerfil('TECNICO') && (
            <Button component={Link} to="/transferencias/nova" leftSection={<IconPlus size={16} />}>
              Nova transferência
            </Button>
          )
        }
      />

      <Paper withBorder p="md">
        <Stack gap="sm">
          <TextInput
            placeholder="Buscar por número, unidade, responsável, descrição ou patrimônio do item…"
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
              placeholder="Origem"
              clearable
              searchable
              data={(unidades.data ?? []).map((u) => ({ value: String(u.id), label: u.ativa ? u.nome : `${u.nome} (bloqueada)` }))}
              value={filtro.origemId ?? null}
              onChange={(v) => alterar({ origemId: v ?? '' })}
            />
            <Select
              placeholder="Destino"
              clearable
              searchable
              data={(unidades.data ?? []).map((u) => ({ value: String(u.id), label: u.ativa ? u.nome : `${u.nome} (bloqueada)` }))}
              value={filtro.destinoId ?? null}
              onChange={(v) => alterar({ destinoId: v ?? '' })}
            />
            <Select
              placeholder="Motivo"
              clearable
              data={Object.entries(MOTIVOS).map(([value, m]) => ({ value, label: m.nome }))}
              value={filtro.motivo ?? null}
              onChange={(v) => alterar({ motivo: v ?? '' })}
            />
            <Select
              placeholder="Criada por"
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
        <Group justify="space-between" mb="sm">
          <Text size="sm" c="dimmed">
            {pagina ? `${pagina.totalElementos.toLocaleString('pt-BR')} transferência(s)` : 'Carregando…'}
          </Text>
          <SeletorModo modo={modo} aoAlterar={setModo} />
        </Group>
        {modo === 'cartoes' ? (
          <CartoesTransferencias linhas={pagina?.conteudo ?? []} acoes={menuPdf} />
        ) : (
          <TabelaTransferencias linhas={pagina?.conteudo ?? []} acoes={menuPdf} />
        )}
        {pagina && pagina.totalPaginas > 1 && (
          <Group justify="center" mt="md">
            <Pagination
              total={pagina.totalPaginas}
              value={pagina.pagina + 1}
              onChange={(p) => alterar({ page: String(p - 1) })}
            />
          </Group>
        )}
      </Paper>
    </Stack>
  )
}
