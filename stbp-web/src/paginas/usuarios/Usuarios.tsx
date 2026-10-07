import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Pagination,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { IconDots, IconEdit, IconKey, IconLock, IconLockOpen, IconPlus, IconRestore, IconSearch, IconTrash } from '@tabler/icons-react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { usuariosApi } from '../../api/recursos'
import { NOMES_PERFIL, NOMES_STATUS, ORDEM_PERFIS, type Perfil, type Usuario } from '../../api/tipos'
import { errosDeCampo, notificarErro, notificarSucesso } from '../../componentes/util'
import { useSessao } from '../../sessao/Sessao'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { Marcador } from '../../componentes/Marcador'

const COR_STATUS = { ATIVO: 'green', BLOQUEADO: 'orange', EXCLUIDO: 'gray' } as const

export function Usuarios() {
  const { usuario: eu } = useSessao()
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [buscaAtrasada] = useDebouncedValue(busca, 400)
  const [perfil, setPerfil] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [pagina, setPagina] = useState(0)
  const [editando, setEditando] = useState<Usuario | 'novo' | null>(null)
  const [redefinindo, setRedefinindo] = useState<Usuario | null>(null)

  const consulta = useQuery({
    queryKey: ['usuarios', buscaAtrasada, perfil, status, pagina],
    queryFn: () =>
      usuariosApi.listar({ busca: buscaAtrasada, perfil: perfil ?? undefined, status: status ?? undefined, page: pagina }),
    placeholderData: keepPreviousData,
  })

  const souSuper = eu?.perfil === 'SUPERADMIN'
  /** Regras da API: ADMIN não mexe em SUPERADMIN; ninguém bloqueia/exclui a si mesmo. */
  const podeAlterar = (u: Usuario) => souSuper || u.perfil !== 'SUPERADMIN'
  const ehEu = (u: Usuario) => u.id === eu?.id

  const executar = async (acao: () => Promise<unknown>, mensagem: string) => {
    try {
      await acao()
      notificarSucesso(mensagem)
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    } catch (erro) {
      notificarErro(erro)
    }
  }

  const confirmar = (titulo: string, texto: string, acao: () => Promise<unknown>, mensagem: string) =>
    modals.openConfirmModal({
      title: titulo,
      children: <Text size="sm">{texto}</Text>,
      labels: { confirm: 'Confirmar', cancel: 'Cancelar' },
      onConfirm: () => executar(acao, mensagem),
    })

  return (
    <Stack gap="md">
      <CabecalhoPagina
        titulo="Usuários"
        descricao="Acesso ao sistema e níveis de permissão. Usuários excluídos podem ser restaurados."
        acoes={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditando('novo')}>
            Novo usuário
          </Button>
        }
      />

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="md">
          <TextInput
            placeholder="Buscar por nome, login ou e-mail"
            leftSection={<IconSearch size={16} />}
            value={busca}
            onChange={(e) => {
              setBusca(e.currentTarget.value)
              setPagina(0)
            }}
          />
          <Select
            placeholder="Perfil"
            clearable
            data={ORDEM_PERFIS.map((p) => ({ value: p, label: NOMES_PERFIL[p] }))}
            value={perfil}
            onChange={(v) => {
              setPerfil(v)
              setPagina(0)
            }}
          />
          <Select
            placeholder="Situação: ativos e bloqueados"
            clearable
            data={Object.entries(NOMES_STATUS).map(([value, label]) => ({ value, label }))}
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPagina(0)
            }}
          />
        </SimpleGrid>

        <Table.ScrollContainer minWidth={700}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Login</Table.Th>
                <Table.Th>E-mail</Table.Th>
                <Table.Th>Perfil</Table.Th>
                <Table.Th>Situação</Table.Th>
                <Table.Th w={50} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {consulta.data?.conteudo.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="lg">
                      Nenhum usuário encontrado.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {consulta.data?.conteudo.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    {u.nome} {ehEu(u) && <span className="stbp-etiqueta">você</span>}
                  </Table.Td>
                  <Table.Td>{u.login}</Table.Td>
                  <Table.Td>{u.email}</Table.Td>
                  <Table.Td>{NOMES_PERFIL[u.perfil]}</Table.Td>
                  <Table.Td>
                    <Marcador cor={COR_STATUS[u.status]} contorno={u.status !== 'ATIVO'}>
                      {NOMES_STATUS[u.status]}
                    </Marcador>
                    {u.trocarSenha && u.status === 'ATIVO' && (
                      <Text size="xs" c="dimmed">
                        troca de senha pendente
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {podeAlterar(u) && (
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" aria-label={`Ações para ${u.nome}`}>
                            <IconDots size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setEditando(u)}>
                            Editar
                          </Menu.Item>
                          <Menu.Item leftSection={<IconKey size={16} />} onClick={() => setRedefinindo(u)}>
                            Redefinir senha
                          </Menu.Item>
                          {!ehEu(u) && u.status === 'ATIVO' && (
                            <Menu.Item
                              leftSection={<IconLock size={16} />}
                              onClick={() =>
                                confirmar(`Bloquear ${u.nome}?`, 'O usuário perde o acesso imediatamente.',
                                  () => usuariosApi.acao(u.id, 'bloquear'), 'Usuário bloqueado.')
                              }
                            >
                              Bloquear
                            </Menu.Item>
                          )}
                          {!ehEu(u) && u.status === 'BLOQUEADO' && (
                            <Menu.Item
                              leftSection={<IconLockOpen size={16} />}
                              onClick={() => executar(() => usuariosApi.acao(u.id, 'desbloquear'), 'Usuário desbloqueado.')}
                            >
                              Desbloquear
                            </Menu.Item>
                          )}
                          {!ehEu(u) && u.status === 'EXCLUIDO' && (
                            <Menu.Item
                              leftSection={<IconRestore size={16} />}
                              onClick={() => executar(() => usuariosApi.acao(u.id, 'restaurar'), 'Usuário restaurado.')}
                            >
                              Restaurar
                            </Menu.Item>
                          )}
                          {!ehEu(u) && u.status !== 'EXCLUIDO' && (
                            <>
                              <Menu.Divider />
                              <Tooltip
                                label="Possui transferências: bloqueie em vez de excluir"
                                disabled={!u.emUso}
                                position="left"
                              >
                                <Box>
                                  <Menu.Item
                                    color="red"
                                    leftSection={<IconTrash size={16} />}
                                    disabled={u.emUso}
                                    onClick={() =>
                                      confirmar(
                                        `Excluir ${u.nome}?`,
                                        'O usuário nunca criou transferências. Ele vai para a lixeira e pode ser restaurado depois.',
                                        () => usuariosApi.excluir(u.id),
                                        'Usuário excluído.',
                                      )
                                    }
                                  >
                                    Excluir
                                  </Menu.Item>
                                </Box>
                              </Tooltip>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {consulta.data && consulta.data.totalPaginas > 1 && (
          <Group justify="center" mt="md">
            <Pagination total={consulta.data.totalPaginas} value={pagina + 1} onChange={(p) => setPagina(p - 1)} />
          </Group>
        )}
      </Paper>

      {editando && (
        <ModalUsuario
          usuario={editando === 'novo' ? null : editando}
          perfisPermitidos={ORDEM_PERFIS.filter((p) => souSuper || p !== 'SUPERADMIN')}
          proprioUsuario={editando !== 'novo' && ehEu(editando)}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => queryClient.invalidateQueries({ queryKey: ['usuarios'] })}
        />
      )}
      {redefinindo && <ModalRedefinirSenha usuario={redefinindo} aoFechar={() => setRedefinindo(null)} />}
    </Stack>
  )
}

function ModalUsuario({
  usuario,
  perfisPermitidos,
  proprioUsuario,
  aoFechar,
  aoSalvar,
}: {
  usuario: Usuario | null
  perfisPermitidos: Perfil[]
  proprioUsuario: boolean
  aoFechar: () => void
  aoSalvar: () => void
}) {
  const novo = usuario === null
  const [enviando, setEnviando] = useState(false)
  const form = useForm({
    initialValues: {
      nome: usuario?.nome ?? '',
      login: usuario?.login ?? '',
      email: usuario?.email ?? '',
      perfil: usuario?.perfil ?? 'TECNICO',
      senha: '',
    },
    validate: {
      nome: (v) => (v.trim() ? null : 'Informe o nome'),
      login: (v) => (/^[A-Za-z0-9._-]+$/.test(v.trim()) ? null : 'Use apenas letras, números, ponto, hífen ou sublinhado'),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : 'E-mail inválido'),
      senha: (v) => (!novo || (v.length >= 8 && v.length <= 72) ? null : 'A senha deve ter entre 8 e 72 caracteres'),
    },
  })

  const enviar = form.onSubmit(async (v) => {
    setEnviando(true)
    try {
      const pedido = { nome: v.nome, login: v.login, email: v.email, perfil: v.perfil as Perfil }
      if (novo) await usuariosApi.criar({ ...pedido, senha: v.senha })
      else await usuariosApi.atualizar(usuario.id, pedido)
      notificarSucesso(novo ? 'Usuário criado. Ele deverá trocar a senha no primeiro acesso.' : 'Usuário atualizado.')
      aoSalvar()
      aoFechar()
    } catch (erro) {
      form.setErrors(errosDeCampo(erro))
      notificarErro(erro)
    } finally {
      setEnviando(false)
    }
  })

  return (
    <Modal opened onClose={aoFechar} title={novo ? 'Novo usuário' : `Editar ${usuario.nome}`}>
      <form onSubmit={enviar}>
        <Stack>
          <TextInput label="Nome" withAsterisk maxLength={150} {...form.getInputProps('nome')} />
          <TextInput label="Login" withAsterisk maxLength={100} {...form.getInputProps('login')} />
          <TextInput label="E-mail" withAsterisk maxLength={150} {...form.getInputProps('email')} />
          <Select
            label="Perfil"
            withAsterisk
            allowDeselect={false}
            disabled={proprioUsuario}
            description={proprioUsuario ? 'Você não pode alterar o próprio perfil.' : undefined}
            data={perfisPermitidos.map((p) => ({ value: p, label: NOMES_PERFIL[p] }))}
            {...form.getInputProps('perfil')}
          />
          {novo && (
            <PasswordInput
              label="Senha inicial"
              description="O usuário deverá trocá-la no primeiro acesso."
              withAsterisk
              {...form.getInputProps('senha')}
            />
          )}
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

function ModalRedefinirSenha({ usuario, aoFechar }: { usuario: Usuario; aoFechar: () => void }) {
  const [enviando, setEnviando] = useState(false)
  const form = useForm({
    initialValues: { novaSenha: '' },
    validate: { novaSenha: (v) => (v.length >= 8 && v.length <= 72 ? null : 'A senha deve ter entre 8 e 72 caracteres') },
  })

  const enviar = form.onSubmit(async ({ novaSenha }) => {
    setEnviando(true)
    try {
      await usuariosApi.redefinirSenha(usuario.id, novaSenha)
      notificarSucesso('Senha redefinida. O usuário deverá trocá-la no próximo acesso.')
      aoFechar()
    } catch (erro) {
      notificarErro(erro)
    } finally {
      setEnviando(false)
    }
  })

  return (
    <Modal opened onClose={aoFechar} title={`Redefinir senha de ${usuario.nome}`}>
      <form onSubmit={enviar}>
        <Stack>
          <PasswordInput
            label="Nova senha temporária"
            description="Informe ao usuário; ele deverá trocá-la no próximo acesso."
            withAsterisk
            {...form.getInputProps('novaSenha')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" loading={enviando}>
              Redefinir
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
