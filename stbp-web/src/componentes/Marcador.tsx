import type { CSSProperties, ReactNode } from 'react'

/**
 * Marcador de categoria ou situação: um quadrado de 8 px na cor da categoria + texto em tom normal.
 * Substitui as etiquetas coloridas: a cor vira um sinal discreto, não um bloco que compete com o conteúdo.
 * {@code cor} é uma paleta do Mantine (ex.: "marinho", "red"); usa tom escuro no tema claro e médio no escuro.
 */
export function Marcador({
  cor,
  contorno = false,
  title,
  children,
}: {
  cor: string
  /** Quadrado vazado: para situações "inativas" (ex.: bloqueada). */
  contorno?: boolean
  title?: string
  children: ReactNode
}) {
  const estilo = {
    '--stbp-marcador-cor-claro': `var(--mantine-color-${cor}-8)`,
    '--stbp-marcador-cor-escuro': `var(--mantine-color-${cor}-5)`,
  } as CSSProperties
  return (
    <span className="stbp-marcador" data-contorno={contorno} style={estilo} title={title}>
      {children}
    </span>
  )
}
