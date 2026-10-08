import { Alert, Box, Button, Center, Grid, Group, Loader, Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { IconArrowRight, IconEdit, IconFileTypePdf, IconMapPin, IconRestore, IconTrash, IconTrashX } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { saidasApi } from '../../api/recursos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { FotoUnidade } from '../../componentes/FotoUnidade'
import { ItensTransferidos } from '../../componentes/ItensTransferidos'
import { Marcador } from '../../componentes/Marcador'
import {
  abrirFormularioSaida,
  descreverTipoSaida,
  formatarData,
  formatarDataHora,
  mensagemDeErro,
  notificarErro,
  notificarSucesso,
  TIPOS_SAIDA,
} from '../../componentes/util'

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {rotulo}
      </Text>
      <Text size="sm" fw={500}>
        {children}
      </Text>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Stack gap="sm" px="md" py="md" style={{ borderBottom: '1px solid var(--stbp-borda)' }}>
      <span className="stbp-sobretitulo">{titulo}</span>
      {children}
    </Stack>
  )
}

/** Capa de origem/destino. Destino externo não tem foto: mostra um marcador de local. */
function Capa({ rotulo, nome, imagemUrl, externo = false }: { rotulo: string; nome: string; imagemUrl: string | null; externo?: boolean }) {
  return (
    <Box pos="relative">
      {externo ? (
        <Center h={180} bg="var(--stbp-placeholder-fundo)" c="var(--stbp-placeholder-icone)">
          <IconMapPin size={44} stroke={1.2} />
        </Center>
      ) : (
        <FotoUnidade url={imagemUrl} nome={nome} h={180} />
      )}
      <Box pos="absolute" inset={0} style={{ background: 'linear-gradient(to top, rgba(8,14,24,.82), rgba(8,14,24,0) 62%)' }} />
      <Box pos="absolute" bottom={12} left={16} right={16}>
        <Text size="xs" c="rgba(255,255,255,.7)" fw={600} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
          {rotulo}
        </Text>
        <Text c="white" fw={600} size="lg" lh={1.2}>
          {nome}
        </Text>
      </Box>
    </Box>
  )
}

export function DetalheSaida() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const consulta = useQuery({ queryKey: ['saida', id], queryFn: () => saidasApi.detalhar(id) })

  if (consulta.isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    )
  }
  if (consulta.isError) return <Alert color="red">{mensagemDeErro(consulta.error)}</Alert>

  const s = consulta.data
  const naLixeira = s.excluidoEm !== null
  const quantos = s.itens.length === 1 ? 'o seu item' : `os seus ${s.itens.length} itens`

  const executar = async (acao: () => Promise<unknown>, mensagem: string, depois?: () => void) => {
    try {
      await acao()
      notificarSucesso(mensagem)
      await queryClient.invalidateQueries({ queryKey: ['saidas'] })
      await queryClient.invalidateQueries({ queryKey: ['saida', id] })
      depois?.()
    } catch (erro) {
      notificarErro(erro)
    }
  }

  const moverParaLixeira = () =>
    modals.openConfirmModal({
      title: `Mover a saída nº ${s.id} para a lixeira?`,
      children: (
        <Text size="sm">
          Ela e {quantos} saem da listagem e das buscas. Pode ser restaurada pela lixeira.
        </Text>
      ),
      labels: { confirm: 'Mover para a lixeira', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => executar(() => saidasApi.moverParaLixeira(s.id), 'Saída movida para a lixeira.'),
    })

  const excluirDefinitivamente = () =>
    modals.openConfirmModal({
      title: `Excluir definitivamente a saída nº ${s.id}?`,
      children: (
        <Text size="sm">
          O registro e {quantos} serão apagados. Esta ação não pode ser desfeita.
        </Text>
      ),
      labels: { confirm: 'Excluir definitivamente', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        executar(() => saidasApi.excluirDefinitivamente(s.id), 'Saída excluída.', () =>
          navegar('/transferencias/lixeira?tipo=saidas', { replace: true }),
        ),
    })

  return (
    <Stack gap="md">
      <CabecalhoPagina
        titulo={
          <>
            Saída de materiais nº <span className="stbp-numero">{s.id}</span>
          </>
        }
        marcadores={<Marcador cor={TIPOS_SAIDA[s.tipo].cor}>{descreverTipoSaida(s.tipo, s.tipoOutro)}</Marcador>}
        acoes={
          <>
            <Button variant="default" leftSection={<IconFileTypePdf size={16} />} onClick={() => abrirFormularioSaida(s.id)}>
              Formulário em PDF
            </Button>
            {s.podeAlterar && !naLixeira && (
              <>
                <Button component={Link} to={`/saidas/${s.id}/editar`} leftSection={<IconEdit size={16} />}>
                  Editar
                </Button>
                <Button color="red" variant="subtle" leftSection={<IconTrash size={16} />} onClick={moverParaLixeira}>
                  Mover para a lixeira
                </Button>
              </>
            )}
          </>
        }
      />

      {naLixeira && (
        <Alert color="orange" variant="light" title={`Na lixeira desde ${formatarDataHora(s.excluidoEm)}`}>
          <Text size="sm" mb="sm">
            Esta saída não aparece na listagem. Restaure-a para editar ou exclua-a definitivamente.
          </Text>
          <Group gap="xs">
            <Button size="xs" leftSection={<IconRestore size={14} />} onClick={() => executar(() => saidasApi.restaurar(s.id), 'Saída restaurada.')}>
              Restaurar
            </Button>
            <Button size="xs" color="red" variant="default" leftSection={<IconTrashX size={14} />} onClick={excluirDefinitivamente}>
              Excluir definitivamente
            </Button>
          </Group>
        </Alert>
      )}

      <Grid gap="md" align="flex-start">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            <Paper withBorder style={{ overflow: 'hidden' }} pos="relative">
              <SimpleGrid cols={2} spacing={0}>
                <Capa rotulo="De" nome={s.origem.nome} imagemUrl={s.origem.imagemUrl} />
                <Capa
                  rotulo={s.destino ? 'Para' : 'Para · destino externo'}
                  nome={s.nomeDestino}
                  imagemUrl={s.destino?.imagemUrl ?? null}
                  externo={!s.destino}
                />
              </SimpleGrid>
              <Center
                pos="absolute"
                top="50%"
                left="50%"
                w={34}
                h={34}
                bg="var(--mantine-color-body)"
                style={{ borderRadius: 3, transform: 'translate(-50%, -50%)', border: '1px solid var(--stbp-borda)' }}
              >
                <IconArrowRight size={18} />
              </Center>
            </Paper>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Paper withBorder>
            <Text fw={600} px="md" py="sm" style={{ borderBottom: '1px solid var(--stbp-borda)' }}>
              Dados da saída
            </Text>
            <Stack gap={0}>
              <Secao titulo="Saída">
                <Campo rotulo="Data">{formatarData(s.data)}</Campo>
                <Campo rotulo="Instituição">{s.instituicao.nome}</Campo>
                <Campo rotulo="Tipo">{descreverTipoSaida(s.tipo, s.tipoOutro)}</Campo>
                <Campo rotulo="Portador do equipamento">{s.portador ?? <Text span c="dimmed">Não informado</Text>}</Campo>
              </Secao>
              <Secao titulo="Registro">
                <Campo rotulo="Registrada por">{s.criadoPor.nome}</Campo>
                <Campo rotulo="Criada em">{formatarDataHora(s.criadoEm)}</Campo>
                <Campo rotulo="Última alteração">{formatarDataHora(s.atualizadoEm)}</Campo>
              </Secao>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Largura total: o formulário tem seis colunas (com as áreas de saída e entrada) */}
      <ItensTransferidos itens={s.itens} titulo="Materiais" comAreas comPatrimonio={false} />
    </Stack>
  )
}
