import { Table, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import type { TransferenciaResumo } from '../api/tipos'
import { formatarData, MOTIVOS } from './util'
import { Marcador } from './Marcador'

/** Tabela de transferências; a linha inteira abre o detalhe. {@code acoes} desenha a última coluna. */
export function TabelaTransferencias({
  linhas,
  acoes,
  vazio = 'Nenhuma transferência encontrada.',
}: {
  linhas: TransferenciaResumo[]
  acoes?: (t: TransferenciaResumo) => ReactNode
  vazio?: string
}) {
  const navegar = useNavigate()

  return (
    <Table.ScrollContainer minWidth={820}>
      <Table highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nº</Table.Th>
            <Table.Th>Data</Table.Th>
            <Table.Th>Origem → Destino</Table.Th>
            <Table.Th>Motivo</Table.Th>
            <Table.Th>Responsáveis</Table.Th>
            <Table.Th ta="right">Itens</Table.Th>
            <Table.Th>Criada por</Table.Th>
            {acoes && <Table.Th />}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {linhas.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={acoes ? 8 : 7}>
                <Text c="dimmed" ta="center" py="lg">
                  {vazio}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {linhas.map((t) => (
            <Table.Tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navegar(`/transferencias/${t.id}`)}>
              <Table.Td fw={600} className="stbp-numero">{t.id}</Table.Td>
              <Table.Td className="stbp-numero">{formatarData(t.data)}</Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {t.origem.nome} → {t.destino.nome}
                </Text>
                <Text size="xs" c="dimmed">
                  {t.instituicao.nome}
                </Text>
              </Table.Td>
              <Table.Td>
                <Marcador cor={MOTIVOS[t.motivo].cor} title={MOTIVOS[t.motivo].nome}>
                  {MOTIVOS[t.motivo].curto}
                </Marcador>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{t.responsavelEnvio}</Text>
                <Text size="xs" c="dimmed">
                  {t.responsavelRecebimento}
                </Text>
              </Table.Td>
              <Table.Td ta="right">{t.quantidadeItens}</Table.Td>
              <Table.Td>
                <Text size="sm">{t.criadoPor.nome}</Text>
              </Table.Td>
              {acoes && <Table.Td onClick={(e) => e.stopPropagation()}>{acoes(t)}</Table.Td>}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
