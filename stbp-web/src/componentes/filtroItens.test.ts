import { describe, expect, it } from 'vitest'

import { filtrarItens } from './filtroItens'

const itens = [
  { ordem: 1, descricao: 'Notebook Dell Latitude', patrimonio: '36102', observacao: 'Com fonte' },
  { ordem: 2, descricao: 'Monitor LG 24"', patrimonio: null, observacao: null },
  { ordem: 7, descricao: 'Cadeira giratória', patrimonio: '022658', observacao: 'Encosto avariado' },
  { ordem: 12, descricao: 'NOTEBOOK LENOVO', patrimonio: '40017', observacao: null },
]
const ordens = (busca: string) => filtrarItens(itens, busca).map((i) => i.ordem)

describe('filtrarItens', () => {
  it('sem busca devolve todos', () => {
    expect(ordens('')).toEqual([1, 2, 7, 12])
    expect(ordens('   ')).toEqual([1, 2, 7, 12])
  })

  it('ignora maiúsculas e acentos', () => {
    expect(ordens('notebook')).toEqual([1, 12])
    expect(ordens('GIRATORIA')).toEqual([7])
  })

  it('busca por parte do patrimônio e pela observação', () => {
    expect(ordens('2265')).toEqual([7])
    expect(ordens('avariado')).toEqual([7])
  })

  it('acha itens sem patrimônio por S/P', () => {
    expect(ordens('s/p')).toEqual([2])
  })

  it('acha pelo número do item, com ou sem zero à esquerda', () => {
    expect(ordens('07')).toEqual([7])
    expect(ordens('12')).toEqual([12])
  })

  it('exige todos os termos', () => {
    expect(ordens('notebook lenovo')).toEqual([12])
    expect(ordens('notebook fonte')).toEqual([1])
    expect(ordens('notebook cadeira')).toEqual([])
  })
})
