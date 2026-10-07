// Edição em lote dos itens selecionados no formulário da transferência (ex.: aplicar a mesma observação em 30 itens).

import { gerarPatrimonios } from './sequencia'

export interface ItemEditavel {
  chave: string
  descricao: string
  patrimonio: string
  observacao: string
}

export type ModoObservacao = 'substituir' | 'vazias' | 'acrescentar'

export interface AlteracoesLote {
  descricao?: string
  /** Numera em sequência, na ordem da lista, a partir de {@code inicial}; ou marca como sem patrimônio. */
  patrimonio?: { modo: 'sequencia'; inicial: string } | { modo: 'sp' }
  observacao?: { modo: ModoObservacao; texto: string }
}

/** Separador usado ao acrescentar texto a uma observação existente. */
export const SEPARADOR_OBSERVACAO = '; '

const semPatrimonio = (p: string) => !p.trim() || p.trim().toUpperCase() === 'S/P'

/** Seleções rápidas oferecidas no formulário. */
export const criterios = {
  semObservacao: (i: ItemEditavel) => !i.observacao.trim(),
  semPatrimonio: (i: ItemEditavel) => semPatrimonio(i.patrimonio),
  semDescricao: (i: ItemEditavel) => !i.descricao.trim(),
}

function novaObservacao(atual: string, { modo, texto }: { modo: ModoObservacao; texto: string }): string {
  const novo = texto.trim()
  switch (modo) {
    case 'substituir':
      return novo
    case 'vazias':
      return atual.trim() ? atual : novo
    case 'acrescentar':
      if (!novo) return atual
      return atual.trim() ? atual.trimEnd() + SEPARADOR_OBSERVACAO + novo : novo
  }
}

/**
 * Aplica as alterações aos itens selecionados, na ordem em que aparecem na lista.
 * Itens não selecionados (e selecionados que não mudaram) mantêm a mesma referência, para não redesenhar as linhas.
 *
 * @throws Error se o patrimônio inicial da sequência não terminar em número
 */
export function aplicarEmLote<T extends ItemEditavel>(itens: T[], selecionados: ReadonlySet<string>, alteracoes: AlteracoesLote): T[] {
  const alvos = itens.filter((i) => selecionados.has(i.chave))
  const patrimonios =
    alteracoes.patrimonio?.modo === 'sequencia' && alvos.length > 0
      ? gerarPatrimonios(alteracoes.patrimonio.inicial, alvos.length)
      : null
  let posicao = 0
  return itens.map((item) => {
    if (!selecionados.has(item.chave)) return item
    const novo = { ...item }
    if (alteracoes.descricao !== undefined) novo.descricao = alteracoes.descricao.trim()
    if (alteracoes.patrimonio) novo.patrimonio = patrimonios ? patrimonios[posicao] : 'S/P'
    if (alteracoes.observacao) novo.observacao = novaObservacao(item.observacao, alteracoes.observacao)
    posicao++
    const mudou = novo.descricao !== item.descricao || novo.patrimonio !== item.patrimonio || novo.observacao !== item.observacao
    return mudou ? novo : item
  })
}

/** Quantos dos itens selecionados seriam de fato alterados (para a pré-visualização do botão). */
export function contarAlterados<T extends ItemEditavel>(itens: T[], selecionados: ReadonlySet<string>, alteracoes: AlteracoesLote): number {
  try {
    const resultado = aplicarEmLote(itens, selecionados, alteracoes)
    return resultado.filter((item, i) => item !== itens[i]).length
  } catch {
    return 0
  }
}

/** Chaves entre {@code de} e {@code ate} (inclusive) na ordem exibida — seleção com Shift. */
export function intervalo(chaves: string[], de: string, ate: string): string[] {
  const a = chaves.indexOf(de)
  const b = chaves.indexOf(ate)
  if (a < 0 || b < 0) return [ate]
  return chaves.slice(Math.min(a, b), Math.max(a, b) + 1)
}
