import { Center, SegmentedControl } from '@mantine/core'
import { IconLayoutGrid, IconList } from '@tabler/icons-react'
import { useState } from 'react'

export type Modo = 'cartoes' | 'tabela'

const CHAVE = 'stbp.modoExibicao'

function lerModo(): Modo {
  try {
    return localStorage.getItem(CHAVE) === 'tabela' ? 'tabela' : 'cartoes'
  } catch {
    return 'cartoes'
  }
}

/** Cartões (padrão, como no sistema antigo) ou tabela; a escolha fica lembrada neste navegador. */
export function useModoExibicao(): [Modo, (m: Modo) => void] {
  const [modo, setModo] = useState<Modo>(lerModo)
  const alterar = (m: Modo) => {
    setModo(m)
    try {
      localStorage.setItem(CHAVE, m)
    } catch {
      // sem armazenamento: vale só nesta visita
    }
  }
  return [modo, alterar]
}

export function SeletorModo({ modo, aoAlterar }: { modo: Modo; aoAlterar: (m: Modo) => void }) {
  return (
    <SegmentedControl
      size="xs"
      value={modo}
      onChange={(v) => aoAlterar(v as Modo)}
      data={[
        {
          value: 'cartoes',
          label: (
            <Center style={{ gap: 6 }}>
              <IconLayoutGrid size={14} /> Cartões
            </Center>
          ),
        },
        {
          value: 'tabela',
          label: (
            <Center style={{ gap: 6 }}>
              <IconList size={14} /> Tabela
            </Center>
          ),
        },
      ]}
    />
  )
}
