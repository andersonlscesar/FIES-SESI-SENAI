// Geração de números de patrimônio em sequência (ex.: lote de 100 computadores).

export const MAXIMO_ITENS = 500

/**
 * Gera {@code quantidade} patrimônios a partir de {@code inicial}, incrementando a parte numérica do final.
 * Mantém prefixo e zeros à esquerda: "022658" → "022659"; "NB-0010" → "NB-0011". Se o número crescer além
 * da largura original, a largura aumenta ("999" → "1000").
 *
 * @throws Error se o patrimônio inicial não terminar em número ou a quantidade for inválida
 */
export function gerarPatrimonios(inicial: string, quantidade: number): string[] {
  const texto = inicial.trim()
  const partes = /^(.*?)(\d+)$/.exec(texto)
  if (!partes) {
    throw new Error('O patrimônio inicial deve terminar em número (ex.: 36102 ou NB-0010).')
  }
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new Error('Informe uma quantidade de pelo menos 1 item.')
  }
  const [, prefixo, digitos] = partes
  const largura = digitos.length
  const base = BigInt(digitos) // BigInt: patrimônios longos (números de série) não perdem precisão
  return Array.from({ length: quantidade }, (_, i) => prefixo + (base + BigInt(i)).toString().padStart(largura, '0'))
}

/** Descreve o intervalo gerado para a pré-visualização: "36102 a 36201". */
export function descreverIntervalo(patrimonios: string[]): string {
  if (patrimonios.length === 0) return ''
  if (patrimonios.length === 1) return patrimonios[0]
  return `${patrimonios[0]} a ${patrimonios[patrimonios.length - 1]}`
}

/** Patrimônios gerados que já estão na lista (comparação sem diferenciar maiúsculas e espaços). */
export function repetidos(gerados: string[], existentes: string[]): string[] {
  const normalizar = (p: string) => p.trim().toUpperCase()
  const atuais = new Set(existentes.map(normalizar).filter((p) => p && p !== 'S/P'))
  return gerados.filter((p) => atuais.has(normalizar(p)))
}
