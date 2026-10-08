import { CloseButton, Group, Paper, Table, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconSearch } from '@tabler/icons-react'
import { useMemo, useState, type ReactNode } from 'react'

import type { Item } from '../api/tipos'
import { filtrarItens, normalizar } from './filtroItens'

/** Abaixo disso a lista cabe na tela e o filtro só ocupa espaço. */
const MINIMO_PARA_FILTRO = 6

/** Destaca no texto original os trechos que casam com os termos, sem diferenciar acentos e maiúsculas. */
function Destaque({ texto, termos }: { texto: string; termos: string[] }) {
  if (termos.length === 0) return texto
  // Normaliza caractere a caractere para manter as posições alinhadas com o texto original
  const caracteres = Array.from(texto)
  const normalizado = caracteres.map((c) => normalizar(c) || c).join('')
  if (normalizado.length !== caracteres.length) return texto
  const marcado = new Array<boolean>(caracteres.length).fill(false)
  for (const termo of termos) {
    for (let i = normalizado.indexOf(termo); i >= 0; i = normalizado.indexOf(termo, i + 1)) {
      marcado.fill(true, i, i + termo.length)
    }
  }
  const partes: ReactNode[] = []
  let inicio = 0
  for (let i = 1; i <= caracteres.length; i++) {
    if (i === caracteres.length || marcado[i] !== marcado[inicio]) {
      const trecho = caracteres.slice(inicio, i).join('')
      partes.push(marcado[inicio] ? <mark key={inicio} className="stbp-destaque">{trecho}</mark> : trecho)
      inicio = i
    }
  }
  return <>{partes}</>
}

type ItemDetalhe = Omit<Item, 'patrimonio'> & {
  patrimonio?: string | null
  areaSaida?: string | null
  areaEntrada?: string | null
}

/**
 * Tabela de itens do detalhe (transferência ou saída de materiais), com busca rápida quando a lista é longa.
 * {@code comAreas} mostra as colunas de área de saída e de entrada do controle de saída.
 */
export function ItensTransferidos({
  itens,
  titulo = 'Itens transferidos',
  comAreas = false,
  comPatrimonio = true,
}: {
  itens: ItemDetalhe[]
  titulo?: string
  comAreas?: boolean
  /** false = itens sem patrimônio (controle de saída). */
  comPatrimonio?: boolean
}) {
  const [busca, setBusca] = useState('')
  const [buscaAplicada] = useDebouncedValue(busca, 120)
  const filtrados = useMemo(() => filtrarItens(itens, buscaAplicada), [itens, buscaAplicada])
  const termos = useMemo(() => normalizar(buscaAplicada).split(/\s+/).filter(Boolean), [buscaAplicada])
  const comFiltro = itens.length >= MINIMO_PARA_FILTRO
  const total = `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`

  return (
    <Paper withBorder>
      <Group justify="space-between" px="md" py="sm" gap="sm" style={{ borderBottom: '1px solid var(--stbp-borda)' }}>
        <Text fw={600}>{titulo}</Text>
        <Group gap="md" wrap="nowrap">
          {comFiltro && (
            <TextInput
              aria-label="Filtrar itens"
              placeholder={comPatrimonio ? 'Filtrar por descrição, patrimônio ou nº' : 'Filtrar por descrição, área ou nº'}
              size="xs"
              w={300}
              leftSection={<IconSearch size={14} />}
              value={busca}
              onChange={(e) => setBusca(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Escape' && setBusca('')}
              rightSection={busca && <CloseButton size="sm" aria-label="Limpar filtro" onClick={() => setBusca('')} />}
            />
          )}
          <Text size="sm" c="dimmed" aria-live="polite" style={{ whiteSpace: 'nowrap' }}>
            {termos.length > 0 ? `${filtrados.length} de ${total}` : total}
          </Text>
        </Group>
      </Group>
      <Table.ScrollContainer minWidth={comAreas ? 900 : 600}>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={64}>Item</Table.Th>
              <Table.Th>{comAreas ? 'Descrição do material' : 'Descrição do bem'}</Table.Th>
              {comPatrimonio && <Table.Th w={170}>Patrimônio</Table.Th>}
              {comAreas && <Table.Th>Área de saída</Table.Th>}
              {comAreas && <Table.Th>Área de entrada</Table.Th>}
              <Table.Th>Observação</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtrados.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td className="stbp-numero" c="dimmed">
                  {String(item.ordem).padStart(2, '0')}
                </Table.Td>
                <Table.Td>
                  <Destaque texto={item.descricao} termos={termos} />
                </Table.Td>
                {comPatrimonio && (
                  <Table.Td className="stbp-numero">
                    {item.patrimonio ? <Destaque texto={item.patrimonio} termos={termos} /> : <Text c="dimmed" span>S/P</Text>}
                  </Table.Td>
                )}
                {comAreas && <Table.Td>{item.areaSaida && <Destaque texto={item.areaSaida} termos={termos} />}</Table.Td>}
                {comAreas && <Table.Td>{item.areaEntrada && <Destaque texto={item.areaEntrada} termos={termos} />}</Table.Td>}
                <Table.Td style={{ whiteSpace: 'pre-line' }}>
                  {item.observacao && <Destaque texto={item.observacao} termos={termos} />}
                </Table.Td>
              </Table.Tr>
            ))}
            {filtrados.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={3 + (comPatrimonio ? 1 : 0) + (comAreas ? 2 : 0)}>
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    Nenhum item corresponde a “{buscaAplicada.trim()}”.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  )
}
