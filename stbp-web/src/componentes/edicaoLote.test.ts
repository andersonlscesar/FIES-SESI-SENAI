import { describe, expect, it } from 'vitest'

import { aplicarEmLote, contarAlterados, criterios, intervalo } from './edicaoLote'

const itens = [
  { chave: 'a', descricao: 'Notebook', patrimonio: '36102', observacao: '' },
  { chave: 'b', descricao: 'Notebook', patrimonio: '36103', observacao: 'Com fonte' },
  { chave: 'c', descricao: 'Monitor', patrimonio: '', observacao: '' },
  { chave: 'd', descricao: 'Mouse', patrimonio: 'S/P', observacao: '  ' },
]
const todos = new Set(['a', 'b', 'c', 'd'])

describe('aplicarEmLote', () => {
  it('substitui a observação só nos selecionados e preserva os demais objetos', () => {
    const resultado = aplicarEmLote(itens, new Set(['a', 'c']), { observacao: { modo: 'substituir', texto: ' Lab 16 ' } })
    expect(resultado.map((i) => i.observacao)).toEqual(['Lab 16', 'Com fonte', 'Lab 16', '  '])
    expect(resultado[1]).toBe(itens[1])
    expect(resultado[3]).toBe(itens[3])
  })

  it('preenche só as observações vazias', () => {
    const resultado = aplicarEmLote(itens, todos, { observacao: { modo: 'vazias', texto: 'Lab 16' } })
    expect(resultado.map((i) => i.observacao)).toEqual(['Lab 16', 'Com fonte', 'Lab 16', 'Lab 16'])
    expect(resultado[1]).toBe(itens[1])
  })

  it('acrescenta ao final da observação existente', () => {
    const resultado = aplicarEmLote(itens, new Set(['a', 'b']), { observacao: { modo: 'acrescentar', texto: 'Lab 16' } })
    expect(resultado.map((i) => i.observacao)).toEqual(['Lab 16', 'Com fonte; Lab 16', '', '  '])
  })

  it('substituir por vazio limpa a observação', () => {
    const resultado = aplicarEmLote(itens, new Set(['b']), { observacao: { modo: 'substituir', texto: '' } })
    expect(resultado[1].observacao).toBe('')
  })

  it('numera o patrimônio em sequência na ordem da lista', () => {
    const resultado = aplicarEmLote(itens, new Set(['d', 'b', 'c']), { patrimonio: { modo: 'sequencia', inicial: '0500' } })
    expect(resultado.map((i) => i.patrimonio)).toEqual(['36102', '0500', '0501', '0502'])
  })

  it('marca como sem patrimônio e troca a descrição', () => {
    const resultado = aplicarEmLote(itens, new Set(['a']), { textos: { descricao: ' Notebook Dell ' }, patrimonio: { modo: 'sp' } })
    expect(resultado[0]).toMatchObject({ descricao: 'Notebook Dell', patrimonio: 'S/P' })
  })

  it('preenche as áreas de saída e entrada (controle de saída)', () => {
    const comAreas = itens.map((i) => ({ ...i, areaSaida: '', areaEntrada: 'Sala 2' }))
    const resultado = aplicarEmLote(comAreas, new Set(['a', 'b']), { textos: { areaSaida: 'Lab. 16', areaEntrada: '' } })
    expect(resultado.map((i) => [i.areaSaida, i.areaEntrada])).toEqual([
      ['Lab. 16', ''],
      ['Lab. 16', ''],
      ['', 'Sala 2'],
      ['', 'Sala 2'],
    ])
    expect(resultado[2]).toBe(comAreas[2])
  })

  it('recusa sequência que não termina em número', () => {
    expect(() => aplicarEmLote(itens, todos, { patrimonio: { modo: 'sequencia', inicial: 'ABC' } })).toThrow()
  })
})

describe('contarAlterados', () => {
  it('conta só os itens que mudam de fato', () => {
    expect(contarAlterados(itens, todos, { observacao: { modo: 'vazias', texto: 'Lab 16' } })).toBe(3)
    expect(contarAlterados(itens, todos, { observacao: { modo: 'vazias', texto: '' } })).toBe(1)
    expect(contarAlterados(itens, todos, { patrimonio: { modo: 'sequencia', inicial: 'x' } })).toBe(0)
  })
})

describe('critérios de seleção', () => {
  it('identifica itens sem observação e sem patrimônio', () => {
    expect(itens.filter(criterios.semObservacao).map((i) => i.chave)).toEqual(['a', 'c', 'd'])
    expect(itens.filter(criterios.semPatrimonio).map((i) => i.chave)).toEqual(['c', 'd'])
  })
})

describe('intervalo', () => {
  it('seleciona do âncora até o clicado, em qualquer direção', () => {
    expect(intervalo(['a', 'b', 'c', 'd'], 'b', 'd')).toEqual(['b', 'c', 'd'])
    expect(intervalo(['a', 'b', 'c', 'd'], 'c', 'a')).toEqual(['a', 'b', 'c'])
    expect(intervalo(['a', 'b'], 'x', 'b')).toEqual(['b'])
  })
})
