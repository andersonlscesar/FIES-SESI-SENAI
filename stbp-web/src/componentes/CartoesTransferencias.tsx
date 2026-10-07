import { Box, Card, Group, SimpleGrid, Text } from '@mantine/core'
import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import type { TransferenciaResumo } from '../api/tipos'
import classes from './CartoesTransferencias.module.css'
import { FotoUnidade } from './FotoUnidade'
import { formatarData, formatarDataHora, MOTIVOS } from './util'
import { Marcador } from './Marcador'

/**
 * Transferências em cartões, como no sistema antigo: a capa é a foto da unidade de destino,
 * com "ORIGEM → DESTINO" sobre ela. O cartão inteiro abre o detalhe; {@code acoes} fica no rodapé.
 */
export function CartoesTransferencias({
  linhas,
  acoes,
  vazio = 'Nenhuma transferência encontrada.',
}: {
  linhas: TransferenciaResumo[]
  acoes?: (t: TransferenciaResumo) => ReactNode
  vazio?: string
}) {
  const navegar = useNavigate()

  if (linhas.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {vazio}
      </Text>
    )
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
      {linhas.map((t) => (
        <Card
          key={t.id}
          withBorder
          padding={0}
          className={classes.cartao}
          onClick={() => navegar(`/transferencias/${t.id}`)}
        >
          <Box pos="relative">
            <div className={classes.foto}>
              <FotoUnidade url={t.destino.imagemUrl} nome={t.destino.nome} h={112} />
            </div>
            <div className={classes.veu} />
            <span className={`${classes.etiqueta} ${classes.numero}`}>Nº {t.id}</span>
            <span className={`${classes.etiqueta} ${classes.instituicao}`}>{t.instituicao.nome}</span>
            <div className={classes.rota}>
              <span className={classes.rotaOrigem}>{t.origem.nome}</span>
              <span className={classes.rotaDestino}>→ {t.destino.nome}</span>
            </div>
          </Box>

          <SimpleGrid cols={2} spacing="sm" verticalSpacing={10} p="sm" style={{ flexGrow: 1 }}>
            <Campo rotulo="Data">
              <span className="stbp-numero">{formatarData(t.data)}</span>
            </Campo>
            <Campo rotulo="Motivo">
              <Marcador cor={MOTIVOS[t.motivo].cor}>{MOTIVOS[t.motivo].curto}</Marcador>
            </Campo>
            <Campo rotulo="Envio">{t.responsavelEnvio}</Campo>
            <Campo rotulo="Recebimento">{t.responsavelRecebimento}</Campo>
            <Box style={{ gridColumn: '1 / -1' }}>
              <Campo rotulo="Emitido por">{t.criadoPor.nome}</Campo>
            </Box>
          </SimpleGrid>

          <Group justify="space-between" px="sm" py={8} wrap="nowrap" className={classes.rodape}>
            <Text size="xs" c="dimmed" lineClamp={1} title={formatarDataHora(t.excluidoEm ?? t.criadoEm)}>
              {t.quantidadeItens} {t.quantidadeItens === 1 ? 'item' : 'itens'} ·{' '}
              {t.excluidoEm ? `na lixeira ${dayjs(t.excluidoEm).fromNow()}` : dayjs(t.criadoEm).fromNow()}
            </Text>
            {acoes && <div onClick={(e) => e.stopPropagation()}>{acoes(t)}</div>}
          </Group>
        </Card>
      ))}
    </SimpleGrid>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className={classes.rotulo}>{rotulo}</div>
      <Text size="sm" lineClamp={1}>
        {children}
      </Text>
    </div>
  )
}
