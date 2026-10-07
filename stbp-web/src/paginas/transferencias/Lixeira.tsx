import { ActionIcon, Group, Pagination, Paper, Stack, Text, Tooltip } from '@mantine/core'
import { modals } from '@mantine/modals'
import { IconRestore, IconTrashX } from '@tabler/icons-react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { transferenciasApi } from '../../api/recursos'
import type { TransferenciaResumo } from '../../api/tipos'
import { CartoesTransferencias } from '../../componentes/CartoesTransferencias'
import { SeletorModo, useModoExibicao } from '../../componentes/ModoExibicao'
import { TabelaTransferencias } from '../../componentes/TabelaTransferencias'
import { notificarErro, notificarSucesso } from '../../componentes/util'
import { useSessao } from '../../sessao/Sessao'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'

export function Lixeira() {
  const { temPerfil } = useSessao()
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
      children: <Text size="sm">Esta ação não pode ser desfeita.</Text>,
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
    <Stack gap="md">
      <CabecalhoPagina
        titulo="Lixeira"
        descricao={
          temPerfil('ADMIN')
            ? 'Transferências de todos os usuários movidas para a lixeira. Restaure ou exclua definitivamente.'
            : 'Suas transferências movidas para a lixeira. Restaure ou exclua definitivamente.'
        }
      />
      <Paper withBorder p="md">
        <Group justify="flex-end" mb="sm">
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
    </Stack>
  )
}
