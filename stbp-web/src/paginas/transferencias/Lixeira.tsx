import { ActionIcon, Group, Pagination, Paper, SegmentedControl, Stack, Text, Tooltip } from '@mantine/core'
import { modals } from '@mantine/modals'
import { IconRestore, IconTrashX } from '@tabler/icons-react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'

import { saidasApi, transferenciasApi } from '../../api/recursos'
import type { SaidaResumo, TransferenciaResumo } from '../../api/tipos'
import { CartoesTransferencias } from '../../componentes/CartoesTransferencias'
import { SeletorModo, useModoExibicao } from '../../componentes/ModoExibicao'
import { TabelaSaidas } from '../../componentes/TabelaSaidas'
import { TabelaTransferencias } from '../../componentes/TabelaTransferencias'
import { notificarErro, notificarSucesso } from '../../componentes/util'
import { useSessao } from '../../sessao/Sessao'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'

type Aba = 'transferencias' | 'saidas'

/** Lixeira de transferências e de saídas de materiais; a aba fica na URL (?tipo=saidas). */
export function Lixeira() {
  const { temPerfil } = useSessao()
  const [parametros, setParametros] = useSearchParams()
  const aba: Aba = parametros.get('tipo') === 'saidas' ? 'saidas' : 'transferencias'
  const seletor = (
    <SegmentedControl
      aria-label="O que mostrar na lixeira"
      value={aba}
      onChange={(v) => setParametros(v === 'saidas' ? { tipo: 'saidas' } : {}, { replace: true })}
      data={[
        { value: 'transferencias', label: 'Transferências' },
        { value: 'saidas', label: 'Saídas de materiais' },
      ]}
    />
  )
  return (
    <Stack gap="md">
      <CabecalhoPagina
        titulo="Lixeira"
        descricao={
          temPerfil('ADMIN')
            ? 'Registros de todos os usuários movidos para a lixeira. Restaure ou exclua definitivamente.'
            : 'Seus registros movidos para a lixeira. Restaure ou exclua definitivamente.'
        }
      />
      {aba === 'saidas' ? <LixeiraSaidas seletor={seletor} /> : <LixeiraTransferencias seletor={seletor} />}
    </Stack>
  )
}

function LixeiraTransferencias({ seletor }: { seletor: ReactNode }) {
  const queryClient = useQueryClient()
  const [pagina, setPagina] = useState(0)
  const [modo, setModo] = useModoExibicao()
  const consulta = useQuery({
    queryKey: ['transferencias', 'lixeira', pagina],
    queryFn: () => transferenciasApi.lixeira(pagina),
    placeholderData: keepPreviousData,
  })

  const executar = async (acao: () => Promise<unknown>, mensagem: string) => {
    try {
      await acao()
      notificarSucesso(mensagem)
      await queryClient.invalidateQueries({ queryKey: ['transferencias'] })
    } catch (erro) {
      notificarErro(erro)
    }
  }

  const excluir = (t: TransferenciaResumo) =>
    modals.openConfirmModal({
      title: `Excluir definitivamente a transferência nº ${t.id}?`,
      children: (
        <Text size="sm">
          O termo e {t.quantidadeItens === 1 ? 'o seu item serão apagados' : `os seus ${t.quantidadeItens} itens serão apagados`}.
          Esta ação não pode ser desfeita.
        </Text>
      ),
      labels: { confirm: 'Excluir definitivamente', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => executar(() => transferenciasApi.excluirDefinitivamente(t.id), 'Transferência excluída.'),
    })
  
  const acoes = (t: TransferenciaResumo) => (
    <Group gap={4} wrap="nowrap">
      <Tooltip label="Restaurar">
        <ActionIcon
          variant="subtle"
          aria-label="Restaurar"
          onClick={() => executar(() => transferenciasApi.restaurar(t.id), `Transferência nº ${t.id} restaurada.`)}
        >
          <IconRestore size={18} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Excluir definitivamente">
        <ActionIcon variant="subtle" color="red" aria-label="Excluir definitivamente" onClick={() => excluir(t)}>
          <IconTrashX size={18} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="sm">
        {seletor}
        <SeletorModo modo={modo} aoAlterar={setModo} />
      </Group>
      {modo === 'cartoes' ? (
        <CartoesTransferencias linhas={consulta.data?.conteudo ?? []} vazio="A lixeira está vazia." acoes={acoes} />
      ) : (
        <TabelaTransferencias linhas={consulta.data?.conteudo ?? []} vazio="A lixeira está vazia." acoes={acoes} />
      )}
      {consulta.data && consulta.data.totalPaginas > 1 && (
        <Group justify="center" mt="md">
          <Pagination total={consulta.data.totalPaginas} value={pagina + 1} onChange={(p) => setPagina(p - 1)} />
        </Group>
      )}
    </Paper>
  )
}

function LixeiraSaidas({ seletor }: { seletor: ReactNode }) {
  const queryClient = useQueryClient()
  const [pagina, setPagina] = useState(0)
  const consulta = useQuery({
    queryKey: ['saidas', 'lixeira', pagina],
    queryFn: () => saidasApi.lixeira(pagina),
    placeholderData: keepPreviousData,
  })

  const executar = async (acao: () => Promise<unknown>, mensagem: string) => {
    try {
      await acao()
      notificarSucesso(mensagem)
      await queryClient.invalidateQueries({ queryKey: ['saidas'] })
    } catch (erro) {
      notificarErro(erro)
    }
  }

  const excluir = (s: SaidaResumo) =>
    modals.openConfirmModal({
      title: `Excluir definitivamente a saída nº ${s.id}?`,
      children: (
        <Text size="sm">
          O registro e {s.quantidadeItens === 1 ? 'o seu item serão apagados' : `os seus ${s.quantidadeItens} itens serão apagados`}.
          Esta ação não pode ser desfeita.
        </Text>
      ),
      labels: { confirm: 'Excluir definitivamente', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => executar(() => saidasApi.excluirDefinitivamente(s.id), 'Saída excluída.'),
    })

  return (
    <Paper withBorder p="md">
      <Group mb="sm">{seletor}</Group>
      <TabelaSaidas
        linhas={consulta.data?.conteudo ?? []}
        vazio="Não há saídas de materiais na lixeira."
        acoes={(s) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Restaurar">
              <ActionIcon variant="subtle" aria-label="Restaurar" onClick={() => executar(() => saidasApi.restaurar(s.id), `Saída nº ${s.id} restaurada.`)}>
                <IconRestore size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Excluir definitivamente">
              <ActionIcon variant="subtle" color="red" aria-label="Excluir definitivamente" onClick={() => excluir(s)}>
                <IconTrashX size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
      />
      {consulta.data && consulta.data.totalPaginas > 1 && (
        <Group justify="center" mt="md">
          <Pagination total={consulta.data.totalPaginas} value={pagina + 1} onChange={(p) => setPagina(p - 1)} />
        </Group>
      )}
    </Paper>
  )
}
