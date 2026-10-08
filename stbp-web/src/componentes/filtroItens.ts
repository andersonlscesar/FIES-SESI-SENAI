import type { Item } from '../api/tipos'

/** Minúsculas e sem acentos, para "AQUISIÇÃO" casar com "aquisicao". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/**
 * Filtro rápido dos itens de uma transferência.
 * Cada termo da busca precisa aparecer em algum campo: descrição, patrimônio (ou "S/P"), observação, áreas de
 * saída/entrada (controle de saída) ou o número do item ("7" e "07" acham o item 7).
 */
export function filtrarItens<
  T extends Pick<Item, 'ordem' | 'descricao' | 'observacao'> & {
    /** null = sem patrimônio (casa com "S/P"); ausente = a modalidade não tem patrimônio (controle de saída). */
    patrimonio?: string | null
    areaSaida?: string | null
    areaEntrada?: string | null
  },
>(itens: T[], busca: string): T[] {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean)
  if (termos.length === 0) return itens
  return itens.filter((item) => {
    const patrimonio = item.patrimonio === undefined ? null : (item.patrimonio ?? 's/p')
    const campos = [item.descricao, patrimonio, item.observacao, item.areaSaida, item.areaEntrada]
    const texto = normalizar(campos.filter(Boolean).join('\n'))
    return termos.every((termo) => texto.includes(termo) || (/^\d+$/.test(termo) && Number(termo) === item.ordem))
  })
}
