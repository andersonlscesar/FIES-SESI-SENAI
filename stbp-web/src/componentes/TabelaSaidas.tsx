import { Table, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import type { SaidaResumo } from '../api/tipos'
import { Marcador } from './Marcador'
import { descreverTipoSaida, formatarData, TIPOS_SAIDA } from './util'

/** Tabela de saídas de materiais; a linha inteira abre o detalhe. {@code acoes} desenha a última coluna. */
export function TabelaSaidas({
  linhas,
  acoes,
  vazio = 'Nenhuma saída de materiais encontrada.',
}: {
  linhas: SaidaResumo[]
  acoes?: (s: SaidaResumo) => ReactNode
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
            <Table.Th>De → Para</Table.Th>
            <Table.Th>Tipo</Table.Th>
            <Table.Th>Portador</Table.Th>
            <Table.Th ta="right">Itens</Table.Th>
            <Table.Th>Registrada por</Table.Th>
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
          {linhas.map((s) => (
            <Table.Tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navegar(`/saidas/${s.id}`)}>
              <Table.Td fw={600} className="stbp-numero">{s.id}</Table.Td>
              <Table.Td className="stbp-numero">{formatarData(s.data)}</Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {s.origem.nome} → {s.nomeDestino}
                </Text>
                <Text size="xs" c="dimmed">
                  {s.instituicao.nome}
                  {s.destino === null ? ' · destino externo' : ''}
                </Text>
              </Table.Td>
              <Table.Td>
                <Marcador cor={TIPOS_SAIDA[s.tipo].cor} title={descreverTipoSaida(s.tipo, s.tipoOutro)}>
                  {descreverTipoSaida(s.tipo, s.tipoOutro)}
                </Marcador>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c={s.portador ? undefined : 'dimmed'}>
                  {s.portador ?? '—'}
                </Text>
              </Table.Td>
              <Table.Td ta="right">{s.quantidadeItens}</Table.Td>
              <Table.Td>
                <Text size="sm">{s.criadoPor.nome}</Text>
              </Table.Td>
              {acoes && <Table.Td onClick={(e) => e.stopPropagation()}>{acoes(s)}</Table.Td>}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
