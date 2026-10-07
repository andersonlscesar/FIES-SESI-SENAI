import { Alert, Button, Paper, PasswordInput, Stack } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { authApi } from '../api/recursos'
import { errosDeCampo, notificarErro, notificarSucesso } from '../componentes/util'
import { useSessao } from '../sessao/Sessao'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina'

export function TrocarSenha() {
  const { usuario, recarregar } = useSessao()
  const navegar = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const obrigatoria = usuario?.trocarSenha ?? false

  const form = useForm({
    initialValues: { senhaAtual: '', novaSenha: '', confirmacao: '' },
    validate: {
      senhaAtual: (v) => (v ? null : 'Informe a senha atual'),
      novaSenha: (v) => (v.length >= 8 && v.length <= 72 ? null : 'A nova senha deve ter entre 8 e 72 caracteres'),
      confirmacao: (v, valores) => (v === valores.novaSenha ? null : 'As senhas não conferem'),
    },
  })

  const enviar = form.onSubmit(async ({ senhaAtual, novaSenha }) => {
    setEnviando(true)
    try {
      await authApi.trocarSenha(senhaAtual, novaSenha)
      await recarregar()
      notificarSucesso('Senha alterada com sucesso.')
      navegar('/transferencias', { replace: true })
    } catch (e) {
      form.setErrors(errosDeCampo(e))
      notificarErro(e)
    } finally {
      setEnviando(false)
    }
  })

  return (
    <>
      <CabecalhoPagina titulo="Trocar senha" />
      <Paper withBorder p="lg" maw={480}>
        <form onSubmit={enviar}>
          <Stack>
            {obrigatoria && (
              <Alert color="azul" variant="light" icon={<IconInfoCircle size={18} />}>
                Por segurança, defina uma nova senha antes de continuar. Isso acontece no primeiro acesso e quando
                um administrador redefine sua senha.
              </Alert>
            )}
            <PasswordInput label="Senha atual" autoComplete="current-password" {...form.getInputProps('senhaAtual')} />
            <PasswordInput
              label="Nova senha"
              description="Mínimo de 8 caracteres"
              autoComplete="new-password"
              {...form.getInputProps('novaSenha')}
            />
            <PasswordInput label="Confirme a nova senha" autoComplete="new-password" {...form.getInputProps('confirmacao')} />
            <Button type="submit" loading={enviando}>
              Salvar nova senha
            </Button>
          </Stack>
        </form>
      </Paper>
    </>
  )
}
