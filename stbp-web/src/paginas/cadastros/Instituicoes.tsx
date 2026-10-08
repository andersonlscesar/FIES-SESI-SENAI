import { ActionIcon, Box, Button, Group, Image, Menu, Modal, Paper, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { IconDots, IconEdit, IconLock, IconLockOpen, IconPlus, IconTrash } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { cadastrosApi } from '../../api/recursos'
import type { Instituicao } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { CampoImagem, type ValorImagem } from '../../componentes/CampoImagem'
import { useInstituicoes } from '../../componentes/consultas'
import { errosDeCampo, notificarErro, notificarSucesso } from '../../componentes/util'
import { Marcador } from '../../componentes/Marcador'

const LOGO_MAXIMA = 1024 * 1024

export function Instituicoes() {
  const consulta = useInstituicoes()
  const queryClient = useQueryClient()
  const [editando, setEditando] = useState<Instituicao | 'nova' | null>(null)
  /** Muda a cada envio de logo, para o navegador não mostrar a imagem antiga do cache. */
  const [versaoLogo, setVersaoLogo] = useState(0)

  const atualizar = async () => {
    setVersaoLogo((v) => v + 1)
    await queryClient.invalidateQueries({ queryKey: ['instituicoes'] })
  }

  const executar = async (acao: () => Promise<unknown>, mensagem: string) => {
    try {
      await acao()
      notificarSucesso(mensagem)
      await atualizar()
    } catch (erro) {
      notificarErro(erro)
    }
  }

  const bloquear = (i: Instituicao) =>
    modals.openConfirmModal({
      title: `Bloquear a instituição ${i.nome}?`,
      children: (
        <Text size="sm">
          Ela deixa de aparecer no formulário de novas transferências. As transferências já registradas, os filtros e
          os termos em PDF continuam funcionando. É possível desbloquear depois.
        </Text>
      ),
      labels: { confirm: 'Bloquear', cancel: 'Cancelar' },
      onConfirm: () => executar(() => cadastrosApi.bloquearInstituicao(i.id), `${i.nome} bloqueada para novas transferências.`),
    })

  const excluir = (i: Instituicao) =>
    modals.openConfirmModal({
      title: `Excluir a instituição ${i.nome}?`,
      children: <Text size="sm">Ela nunca foi usada em transferências nem em saídas de materiais. Os vínculos com unidades serão removidos.</Text>,
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => executar(() => cadastrosApi.excluirInstituicao(i.id), 'Instituição excluída.'),
    })

  return (
    <Stack gap="md">
      <CabecalhoPagina
        titulo="Instituições"
        descricao="A logo sai no cabeçalho do Termo de Transferência. Instituições já usadas não são excluídas: são bloqueadas para novas transferências."
        acoes={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditando('nova')}>
            Nova instituição
          </Button>
        }
      />

      <Paper withBorder>
        <Table.ScrollContainer minWidth={640}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={180}>Logo</Table.Th>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Situação</Table.Th>
                <Table.Th>Uso</Table.Th>
                <Table.Th w={60} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {consulta.data?.map((i) => (
                <Table.Tr key={i.id} style={{ opacity: i.ativa ? 1 : 0.72 }}>
                  <Table.Td>
                    {i.logoUrl ? (
                      <Image src={`${i.logoUrl}?v=${versaoLogo}`} alt={`Logo ${i.nome}`} h={40} w={140} fit="contain" />
                    ) : (
                      <Text size="sm" c="dimmed">
                        sem logo
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td fw={600}>{i.nome}</Table.Td>
                  <Table.Td>
                    <Marcador cor={i.ativa ? 'green' : 'gray'} contorno={!i.ativa}>
                      {i.ativa ? 'Ativa' : 'Bloqueada'}
                    </Marcador>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {i.emUso ? 'Possui movimentações' : 'Sem movimentações'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" aria-label={`Ações para ${i.nome}`}>
                          <IconDots size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setEditando(i)}>
                          Editar nome e logo
                        </Menu.Item>
                        {i.ativa ? (
                          <Menu.Item leftSection={<IconLock size={16} />} onClick={() => bloquear(i)}>
                            Bloquear para uso
                          </Menu.Item>
                        ) : (
                          <Menu.Item
                            leftSection={<IconLockOpen size={16} />}
                            onClick={() => executar(() => cadastrosApi.desbloquearInstituicao(i.id), `${i.nome} desbloqueada.`)}
                          >
                            Desbloquear
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                        <Tooltip label="Já usada em transferências ou saídas de materiais: bloqueie em vez de excluir" disabled={!i.emUso} position="left">
                          <Box>
                            <Menu.Item color="red" leftSection={<IconTrash size={16} />} disabled={i.emUso} onClick={() => excluir(i)}>
                              Excluir
                            </Menu.Item>
                          </Box>
                        </Tooltip>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {editando && (
        <ModalInstituicao
          instituicao={editando === 'nova' ? null : editando}
          versaoLogo={versaoLogo}
          aoFechar={() => setEditando(null)}
          aoSalvar={atualizar}
        />
      )}
    </Stack>
  )
}

function ModalInstituicao({
  instituicao,
  versaoLogo,
  aoFechar,
  aoSalvar,
}: {
  instituicao: Instituicao | null
  versaoLogo: number
  aoFechar: () => void
  aoSalvar: () => Promise<void>
}) {
  const [enviando, setEnviando] = useState(false)
  const [logo, setLogo] = useState<ValorImagem>({ arquivo: null, remover: false })
  const form = useForm({
    initialValues: { nome: instituicao?.nome ?? '' },
    validate: { nome: (v) => (v.trim() ? null : 'Informe o nome') },
  })

  const enviar = form.onSubmit(async ({ nome }) => {
    setEnviando(true)
    try {
      const salva = instituicao
        ? await cadastrosApi.renomearInstituicao(instituicao.id, nome)
        : await cadastrosApi.criarInstituicao(nome)
      if (logo.arquivo) await cadastrosApi.enviarLogo(salva.id, logo.arquivo)
      else if (logo.remover) await cadastrosApi.removerLogo(salva.id)
      notificarSucesso(instituicao ? 'Instituição atualizada.' : 'Instituição criada.')
      await aoSalvar()
      aoFechar()
    } catch (erro) {
      form.setErrors(errosDeCampo(erro))
      notificarErro(erro)
    } finally {
      setEnviando(false)
    }
  })

  return (
    <Modal opened onClose={aoFechar} title={instituicao ? `Editar ${instituicao.nome}` : 'Nova instituição'} size="md">
      <form onSubmit={enviar}>
        <Stack>
          <TextInput label="Nome" description="Gravado em maiúsculas" withAsterisk maxLength={50} {...form.getInputProps('nome')} />
          <CampoImagem
            rotulo="Logo"
            descricao="Impressa no cabeçalho do Termo de Transferência. PNG ou JPEG, até 1 MB."
            urlAtual={instituicao?.logoUrl ? `${instituicao.logoUrl}?v=${versaoLogo}` : null}
            valor={logo}
            aoAlterar={setLogo}
            tamanhoMaximo={LOGO_MAXIMA}
            ajuste="contain"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" loading={enviando}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
