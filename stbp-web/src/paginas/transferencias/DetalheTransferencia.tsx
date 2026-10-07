import { Alert, Box, Button, Center, Grid, Group, Loader, Menu, Paper, SimpleGrid, Stack, Table, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { IconArrowRight, IconChevronDown, IconEdit, IconFileTypePdf, IconRestore, IconTrash, IconTrashX } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { transferenciasApi } from '../../api/recursos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { FotoUnidade } from '../../componentes/FotoUnidade'
import { abrirTermo, formatarData, formatarDataHora, mensagemDeErro, MOTIVOS, notificarErro, notificarSucesso } from '../../componentes/util'
import { Marcador } from '../../componentes/Marcador'

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

export function DetalheTransferencia() {
  const id = Number(useParams().id)
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const consulta = useQuery({ queryKey: ['transferencia', id], queryFn: () => transferenciasApi.detalhar(id) })

  if (consulta.isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    )
  }
  if (consulta.isError) {
    return <Alert color="red">{mensagemDeErro(consulta.error)}</Alert>
  }

  const t = consulta.data
  const naLixeira = t.excluidoEm !== null
  const atualizarListas = () => queryClient.invalidateQueries({ queryKey: ['transferencias'] })

  const executar = async (acao: () => Promise<unknown>, mensagem: string, depois?: () => void) => {
    try {
      await acao()
      notificarSucesso(mensagem)
      await atualizarListas()
      await queryClient.invalidateQueries({ queryKey: ['transferencia', id] })
      depois?.()
    } catch (erro) {
      notificarErro(erro)
    }
  }

  const moverParaLixeira = () =>
    modals.openConfirmModal({
      title: `Mover a transferência nº ${t.id} para a lixeira?`,
      children: <Text size="sm">Ela some da listagem, mas pode ser restaurada pela lixeira.</Text>,
      labels: { confirm: 'Mover para a lixeira', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => executar(() => transferenciasApi.moverParaLixeira(t.id), 'Transferência movida para a lixeira.'),
    })

  const excluirDefinitivamente = () =>
    modals.openConfirmModal({
      title: `Excluir definitivamente a transferência nº ${t.id}?`,
      children: <Text size="sm">Esta ação não pode ser desfeita. O termo e todos os itens serão apagados.</Text>,
      labels: { confirm: 'Excluir definitivamente', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        executar(() => transferenciasApi.excluirDefinitivamente(t.id), 'Transferência excluída.', () =>
          navegar('/transferencias/lixeira', { replace: true }),
        ),
    })

  return (
    <Stack gap="md">
      <CabecalhoPagina
        titulo={
          <>
            Transferência nº <span className="stbp-numero">{t.id}</span>
          </>
        }
        marcadores={
          <>
            <Marcador cor={MOTIVOS[t.motivo].cor}>
              {MOTIVOS[t.motivo].nome}
              <Text span c="dimmed" size="sm">
                · {MOTIVOS[t.motivo].tipo.toLowerCase()}
              </Text>
            </Marcador>
          </>
        }
        acoes={
          <>
            <Menu position="bottom-end">
              <Menu.Target>
                <Button variant="default" leftSection={<IconFileTypePdf size={16} />} rightSection={<IconChevronDown size={14} />}>
                  Termo em PDF
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => abrirTermo(t.id, 'RETRATO')}>Retrato · 1 via por folha</Menu.Item>
                <Menu.Item onClick={() => abrirTermo(t.id, 'PAISAGEM')}>Paisagem · 2 vias por folha</Menu.Item>
              </Menu.Dropdown>
            </Menu>
            {t.podeAlterar && !naLixeira && (
              <>
                <Button component={Link} to={`/transferencias/${t.id}/editar`} leftSection={<IconEdit size={16} />}>
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
        <Alert color="orange" variant="light" title={`Na lixeira desde ${formatarDataHora(t.excluidoEm)}`}>
          <Text size="sm" mb="sm">
            Esta transferência não aparece na listagem. Restaure-a para editar ou exclua-a definitivamente.
          </Text>
          <Group gap="xs">
            <Button
              size="xs"
              leftSection={<IconRestore size={14} />}
              onClick={() => executar(() => transferenciasApi.restaurar(t.id), 'Transferência restaurada.')}
            >
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
                {[
                  { rotulo: 'Origem', unidade: t.origem },
                  { rotulo: 'Destino', unidade: t.destino },
                ].map(({ rotulo, unidade }) => (
                  <Box key={rotulo} pos="relative">
                    <FotoUnidade url={unidade.imagemUrl} nome={unidade.nome} h={180} />
                    <Box
                      pos="absolute"
                      inset={0}
                      style={{ background: 'linear-gradient(to top, rgba(8,14,24,.82), rgba(8,14,24,0) 62%)' }}
                    />
                    <Box pos="absolute" bottom={12} left={16} right={16}>
                      <Text size="xs" c="rgba(255,255,255,.7)" fw={600} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                        {rotulo}
                      </Text>
                      <Text c="white" fw={600} size="lg" lh={1.2}>
                        {unidade.nome}
                      </Text>
                    </Box>
                  </Box>
                ))}
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

            <Paper withBorder>
              <Group justify="space-between" px="md" py="sm" style={{ borderBottom: '1px solid var(--stbp-borda)' }}>
                <Text fw={600}>Itens transferidos</Text>
                <Text size="sm" c="dimmed">
                  {t.itens.length} {t.itens.length === 1 ? 'item' : 'itens'}
                </Text>
              </Group>
              <Table.ScrollContainer minWidth={600}>
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={64}>Item</Table.Th>
                      <Table.Th>Descrição do bem</Table.Th>
                      <Table.Th w={170}>Patrimônio</Table.Th>
                      <Table.Th>Observação</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {t.itens.map((item) => (
                      <Table.Tr key={item.id}>
                        <Table.Td className="stbp-numero" c="dimmed">
                          {String(item.ordem).padStart(2, '0')}
                        </Table.Td>
                        <Table.Td>{item.descricao}</Table.Td>
                        <Table.Td className="stbp-numero">{item.patrimonio ?? <Text c="dimmed" span>S/P</Text>}</Table.Td>
                        <Table.Td style={{ whiteSpace: 'pre-line' }}>{item.observacao}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Paper withBorder>
            <Text fw={600} px="md" py="sm" style={{ borderBottom: '1px solid var(--stbp-borda)' }}>
              Dados do termo
            </Text>
            <Stack gap={0}>
              <Secao titulo="Transferência">
                <Campo rotulo="Data">{formatarData(t.data)}</Campo>
                <Campo rotulo="Instituição">{t.instituicao.nome}</Campo>
                <Campo rotulo="Motivo">
                  {MOTIVOS[t.motivo].nome} ({MOTIVOS[t.motivo].tipo.toLowerCase()})
                </Campo>
              </Secao>
              <Secao titulo="Responsáveis">
                <Campo rotulo={`Envio · ${t.origem.nome}`}>{t.responsavelEnvio}</Campo>
                <Campo rotulo={`Recebimento · ${t.destino.nome}`}>{t.responsavelRecebimento}</Campo>
              </Secao>
              <Secao titulo="Registro">
                <Campo rotulo="Emitido por">{t.criadoPor.nome}</Campo>
                <Campo rotulo="Criado em">{formatarDataHora(t.criadoEm)}</Campo>
                <Campo rotulo="Última alteração">{formatarDataHora(t.atualizadoEm)}</Campo>
              </Secao>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
