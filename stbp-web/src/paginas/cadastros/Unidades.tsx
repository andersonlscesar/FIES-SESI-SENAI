import { ActionIcon, Box, Button, Group, Menu, Modal, MultiSelect, Paper, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { IconDots, IconEdit, IconLock, IconLockOpen, IconPlus, IconTrash } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { cadastrosApi } from '../../api/recursos'
import type { Instituicao, Unidade } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { CampoImagem, type ValorImagem } from '../../componentes/CampoImagem'
import { useInstituicoes, useUnidades } from '../../componentes/consultas'
import { FotoUnidade } from '../../componentes/FotoUnidade'
import { errosDeCampo, notificarErro, notificarSucesso } from '../../componentes/util'
import { Marcador } from '../../componentes/Marcador'

const FOTO_MAXIMA = 20 * 1024 * 1024

export function Unidades() {
  const unidades = useUnidades()
  const instituicoes = useInstituicoes()
  const queryClient = useQueryClient()
  const [editando, setEditando] = useState<Unidade | 'nova' | null>(null)
  /** Muda a cada envio de foto, para o navegador não mostrar a imagem antiga do cache. */
  const [versaoFoto, setVersaoFoto] = useState(0)

  const instituicaoPorId = (id: number) => instituicoes.data?.find((i) => i.id === id)

  const atualizar = async () => {
    setVersaoFoto((v) => v + 1)
    await queryClient.invalidateQueries({ queryKey: ['unidades'] })
    // os cartões de transferência mostram a foto da unidade
    await queryClient.invalidateQueries({ queryKey: ['transferencias'] })
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

  const bloquear = (u: Unidade) =>
    modals.openConfirmModal({
      title: `Bloquear a unidade ${u.nome}?`,
      children: (
        <Text size="sm">
          Ela deixa de aparecer como origem ou destino no formulário de novas transferências. As transferências já
          registradas, os filtros e os termos em PDF continuam funcionando. É possível desbloquear depois.
        </Text>
      ),
      labels: { confirm: 'Bloquear', cancel: 'Cancelar' },
      onConfirm: () => executar(() => cadastrosApi.bloquearUnidade(u.id), `${u.nome} bloqueada para novas transferências.`),
    })

  const excluir = (u: Unidade) =>
    modals.openConfirmModal({
      title: `Excluir a unidade ${u.nome}?`,
      children: <Text size="sm">Ela nunca foi origem nem destino de transferências.</Text>,
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => executar(() => cadastrosApi.excluirUnidade(u.id), 'Unidade excluída.'),
    })

  return (
    <Stack gap="md">
      <CabecalhoPagina
        titulo="Unidades"
        descricao="A foto é a capa dos cartões de transferência. Unidades já usadas em transferências ou saídas de materiais não são excluídas: são bloqueadas para novos usos."
        acoes={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditando('nova')}>
            Nova unidade
          </Button>
        }
      />

      <Paper withBorder>
        <Table.ScrollContainer minWidth={600}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={120}>Foto</Table.Th>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Instituições</Table.Th>
                <Table.Th>Situação</Table.Th>
                <Table.Th w={60} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {unidades.data?.map((u) => (
                <Table.Tr key={u.id} style={{ opacity: u.ativa ? 1 : 0.72 }}>
                  <Table.Td>
                    <Box w={96} style={{ borderRadius: 'var(--mantine-radius-sm)', overflow: 'hidden' }}>
                      <FotoUnidade url={u.imagemUrl} nome={u.nome} h={56} versao={versaoFoto} />
                    </Box>
                  </Table.Td>
                  <Table.Td fw={600}>{u.nome}</Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {u.instituicaoIds.map((id) => {
                        const instituicao = instituicaoPorId(id)
                        return (
                          <span key={id} className="stbp-etiqueta" style={{ opacity: instituicao?.ativa === false ? 0.6 : 1 }}>
                            {instituicao?.nome ?? `#${id}`}
                            {instituicao?.ativa === false && ' · bloqueada'}
                          </span>
                        )
                      })}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Marcador cor={u.ativa ? 'green' : 'gray'} contorno={!u.ativa}>
                      {u.ativa ? 'Ativa' : 'Bloqueada'}
                    </Marcador>
                    <Text size="xs" c="dimmed" mt={2}>
                      {u.emUso ? 'Possui movimentações' : 'Sem movimentações'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" aria-label={`Ações para ${u.nome}`}>
                          <IconDots size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setEditando(u)}>
                          Editar nome, foto e instituições
                        </Menu.Item>
                        {u.ativa ? (
                          <Menu.Item leftSection={<IconLock size={16} />} onClick={() => bloquear(u)}>
                            Bloquear para uso
                          </Menu.Item>
                        ) : (
                          <Menu.Item
                            leftSection={<IconLockOpen size={16} />}
                            onClick={() => executar(() => cadastrosApi.desbloquearUnidade(u.id), `${u.nome} desbloqueada.`)}
                          >
                            Desbloquear
                          </Menu.Item>
                        )}
                        <Menu.Divider />
                        <Tooltip label="Já usada em transferências ou saídas de materiais: bloqueie em vez de excluir" disabled={!u.emUso} position="left">
                          <Box>
                            <Menu.Item color="red" leftSection={<IconTrash size={16} />} disabled={u.emUso} onClick={() => excluir(u)}>
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
        <ModalUnidade
          unidade={editando === 'nova' ? null : editando}
          instituicoes={instituicoes.data ?? []}
          versaoFoto={versaoFoto}
          aoFechar={() => setEditando(null)}
          aoSalvar={atualizar}
        />
      )}
    </Stack>
  )
}

function ModalUnidade({
  unidade,
  instituicoes,
  versaoFoto,
  aoFechar,
  aoSalvar,
}: {
  unidade: Unidade | null
  instituicoes: Instituicao[]
  versaoFoto: number
  aoFechar: () => void
  aoSalvar: () => Promise<void>
}) {
  const [enviando, setEnviando] = useState(false)
  const [foto, setFoto] = useState<ValorImagem>({ arquivo: null, remover: false })
  const form = useForm({
    initialValues: { nome: unidade?.nome ?? '', instituicaoIds: (unidade?.instituicaoIds ?? []).map(String) },
    validate: {
      nome: (v) => (v.trim() ? null : 'Informe o nome'),
      instituicaoIds: (v) => (v.length > 0 ? null : 'Informe ao menos uma instituição'),
    },
  })

  const enviar = form.onSubmit(async ({ nome, instituicaoIds }) => {
    setEnviando(true)
    try {
      const ids = instituicaoIds.map(Number)
      const salva = unidade
        ? await cadastrosApi.atualizarUnidade(unidade.id, nome, ids)
        : await cadastrosApi.criarUnidade(nome, ids)
      if (foto.arquivo) await cadastrosApi.enviarFotoUnidade(salva.id, foto.arquivo)
      else if (foto.remover) await cadastrosApi.removerFotoUnidade(salva.id)
      notificarSucesso(unidade ? 'Unidade atualizada.' : 'Unidade criada.')
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
    <Modal opened onClose={aoFechar} title={unidade ? `Editar ${unidade.nome}` : 'Nova unidade'} size="md">
      <form onSubmit={enviar}>
        <Stack>
          <TextInput label="Nome" description="Gravado em maiúsculas" withAsterisk maxLength={100} {...form.getInputProps('nome')} />
          <MultiSelect
            label="Instituições"
            description="A unidade aparece no formulário de transferência dessas instituições."
            withAsterisk
            data={instituicoes.map((i) => ({ value: String(i.id), label: i.ativa ? i.nome : `${i.nome} (bloqueada)` }))}
            {...form.getInputProps('instituicaoIds')}
          />
          <CampoImagem
            rotulo="Foto"
            descricao="Capa dos cartões de transferência. PNG ou JPEG até 20 MB; é reduzida automaticamente."
            urlAtual={unidade?.imagemUrl ? `${unidade.imagemUrl}?v=${versaoFoto}` : null}
            valor={foto}
            aoAlterar={setFoto}
            tamanhoMaximo={FOTO_MAXIMA}
            altura={150}
            ajuste="cover"
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
