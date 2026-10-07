import { describe, expect, it } from 'vitest'

import { descreverIntervalo, gerarPatrimonios, repetidos } from './sequencia'

describe('gerarPatrimonios', () => {
  it('incrementa números simples', () => {
    expect(gerarPatrimonios('36102', 3)).toEqual(['36102', '36103', '36104'])
  })

  it('mantém zeros à esquerda', () => {
    expect(gerarPatrimonios('022658', 3)).toEqual(['022658', '022659', '022660'])
    expect(gerarPatrimonios('0099', 3)).toEqual(['0099', '0100', '0101'])
  })

  it('aumenta a largura quando o número transborda', () => {
    expect(gerarPatrimonios('999', 2)).toEqual(['999', '1000'])
    expect(gerarPatrimonios('0999', 2)).toEqual(['0999', '1000'])
  })

  it('mantém o prefixo e incrementa só o número final', () => {
    expect(gerarPatrimonios('NB-0010', 3)).toEqual(['NB-0010', 'NB-0011', 'NB-0012'])
    expect(gerarPatrimonios('26508/23258', 2)).toEqual(['26508/23258', '26508/23259'])
  })

  it('não perde precisão em números longos (números de série)', () => {
    expect(gerarPatrimonios('201048000000004423', 2)).toEqual(['201048000000004423', '201048000000004424'])
  })

  it('ignora espaços nas pontas', () => {
    expect(gerarPatrimonios('  36102 ', 2)).toEqual(['36102', '36103'])
  })

  it('gera 100 itens com o intervalo esperado', () => {
    const lote = gerarPatrimonios('36102', 100)
    expect(lote).toHaveLength(100)
    expect(descreverIntervalo(lote)).toBe('36102 a 36201')
  })

  it('recusa patrimônio que não termina em número e quantidade inválida', () => {
    expect(() => gerarPatrimonios('S/P', 3)).toThrow('deve terminar em número')
    expect(() => gerarPatrimonios('', 3)).toThrow('deve terminar em número')
    expect(() => gerarPatrimonios('100', 0)).toThrow('pelo menos 1')
    expect(() => gerarPatrimonios('100', 2.5)).toThrow('pelo menos 1')
  })
})

describe('repetidos', () => {
  it('aponta patrimônios gerados que já estão na lista, ignorando S/P e vazios', () => {
    expect(repetidos(['100', '101', '102'], ['101', 's/p', '', ' 102 '])).toEqual(['101', '102'])
    expect(repetidos(['NB-01'], ['nb-01'])).toEqual(['NB-01'])
  })
})
