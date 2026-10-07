import { Group, Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

/**
 * Cabeçalho padrão das telas: título, marcadores opcionais, descrição e ações à direita.
 * A localização ("Patrimônio / Transferências") fica na trilha do cabeçalho da aplicação (Trilha).
 */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  marcadores,
}: {
  titulo: ReactNode
  descricao?: ReactNode
  acoes?: ReactNode
  /** Informações ao lado do título (ex.: motivo da transferência). */
  marcadores?: ReactNode
}) {
  return (
    <Group justify="space-between" align="flex-end" gap="md" pb="md" mb="lg" wrap="wrap" style={{ borderBottom: '1px solid var(--stbp-borda)' }}>
      <Stack gap={6} style={{ minWidth: 0 }}>
        <Group gap="md" wrap="wrap" align="baseline">
          <Title order={2}>{titulo}</Title>
          {marcadores}
        </Group>
        {descricao && (
          <Text size="sm" c="dimmed" maw={760}>
            {descricao}
          </Text>
        )}
      </Stack>
      {acoes && (
        <Group gap="xs" wrap="wrap">
          {acoes}
        </Group>
      )}
    </Group>
  )
}
