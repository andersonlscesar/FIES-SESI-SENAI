import { Paper, Text } from '@mantine/core'
import { IconArrowDownRight, IconArrowRight, IconArrowUpRight } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import classes from './painel.module.css'

const numero = new Intl.NumberFormat('pt-BR')
export const formatarNumero = (n: number) => numero.format(n)

/** Cartão de seção do painel: título (e ação opcional) numa faixa, conteúdo abaixo. */
export function CartaoPainel({ titulo, descricao, acao, children }: { titulo: string; descricao?: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <Paper withBorder className={classes.cartao}>
      <div className={classes.cartaoCabecalho}>
        <div>
          <Text fw={600} size="sm">
            {titulo}
          </Text>
          {descricao && (
            <Text size="xs" c="dimmed">
              {descricao}
            </Text>
          )}
        </div>
        {acao}
      </div>
      <div className={classes.cartaoCorpo}>{children}</div>
    </Paper>
  )
}

/**
 * Indicador (stat tile): rótulo, valor e variação contra o período anterior.
 * A variação usa tom neutro: mais transferências não é "bom" nem "ruim", então não leva cor de status.
 */
export function Indicador({
  rotulo,
  valor,
  atual,
  anterior,
  complemento,
}: {
  rotulo: string
  valor: string
  /** Para a variação: valor atual e do período anterior (omitir quando não houver comparação). */
  atual?: number
  anterior?: number
  complemento?: string
}) {
  let variacao: ReactNode = complemento
  if (atual !== undefined && anterior !== undefined) {
    if (anterior === 0) {
      variacao = atual === 0 ? 'sem movimento no período anterior' : 'sem base no período anterior'
    } else {
      const pct = ((atual - anterior) / anterior) * 100
      const Icone = pct > 0.5 ? IconArrowUpRight : pct < -0.5 ? IconArrowDownRight : IconArrowRight
      const sinal = pct > 0 ? '+' : ''
      variacao = (
        <>
          <Icone size={14} aria-hidden />
          <span>
            {sinal}
            {pct.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% vs. período anterior ({formatarNumero(anterior)})
          </span>
        </>
      )
    }
  }
  return (
    <Paper withBorder p="md" h="100%">
      <div className={classes.indicadorRotulo}>{rotulo}</div>
      <div className={classes.indicadorValor}>{valor}</div>
      {variacao && <div className={classes.indicadorComplemento}>{variacao}</div>}
    </Paper>
  )
}

export interface LinhaBarra {
  chave: string
  rotulo: ReactNode
  /** Texto do rótulo para leitores de tela e dica (title). */
  rotuloTexto: string
  valor: number
}

/**
 * Barras horizontais com rótulo e valor sempre visíveis (a própria lista é a versão em tabela).
 * Uma cor só (--stbp-dado): o comprimento já mostra a grandeza.
 */
export function ListaBarras({ linhas, unidade, total, vazio = 'Sem dados no período.' }: {
  linhas: LinhaBarra[]
  /** Ex.: "transferências" (para o rótulo acessível). */
  unidade: string
  /** Se informado, mostra também o percentual sobre este total. */
  total?: number
  vazio?: string
}) {
  const maximo = Math.max(1, ...linhas.map((l) => l.valor))
  if (linhas.length === 0 || linhas.every((l) => l.valor === 0)) {
    return (
      <Text size="sm" c="dimmed">
        {vazio}
      </Text>
    )
  }
  return (
    <ul className={classes.lista}>
      {linhas.map((l) => (
        <li key={l.chave} className={classes.linha} aria-label={`${l.rotuloTexto}: ${formatarNumero(l.valor)} ${unidade}`}>
          <span className={classes.rotuloLinha} title={l.rotuloTexto}>
            {l.rotulo}
          </span>
          <span className={classes.trilho} aria-hidden>
            <span className={classes.barra} style={{ width: `${(l.valor / maximo) * 100}%`, display: l.valor > 0 ? 'block' : 'none' }} />
          </span>
          <span className={classes.valor}>
            {formatarNumero(l.valor)}
            {total ? (
              <span className={classes.percentual}>{((l.valor / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}
