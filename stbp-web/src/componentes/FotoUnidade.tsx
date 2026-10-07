import { Center, Image } from '@mantine/core'
import { IconBuildingCommunity } from '@tabler/icons-react'
import { useState } from 'react'

/** Foto da unidade, com um marcador neutro quando a unidade não tem foto (ou ela falha ao carregar). */
export function FotoUnidade({
  url,
  nome,
  h,
  w = '100%',
  versao,
}: {
  url: string | null
  nome: string
  h: number
  w?: number | string
  /** Muda depois de um envio, para o navegador não usar a foto antiga do cache. */
  versao?: number
}) {
  const src = url ? (versao ? `${url}?v=${versao}` : url) : null
  const [falhou, setFalhou] = useState<string | null>(null)

  if (!src || falhou === src) {
    return (
      <Center
        h={h}
        w={w}
        bg="var(--stbp-placeholder-fundo)"
        c="var(--stbp-placeholder-icone)"
        style={{ flexShrink: 0 }}
        aria-label={`Unidade ${nome} sem foto`}
      >
        <IconBuildingCommunity size={Math.min(44, h / 2.2)} stroke={1.2} />
      </Center>
    )
  }
  return (
    <Image
      src={src}
      alt={`Foto da unidade ${nome}`}
      h={h}
      w={w}
      fit="cover"
      radius={0}
      loading="lazy"
      onError={() => setFalhou(src)}
      style={{ flexShrink: 0 }}
    />
  )
}
