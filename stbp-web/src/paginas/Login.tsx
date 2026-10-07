import { Alert, Button, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconAlertCircle, IconArrowsExchange } from '@tabler/icons-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { mensagemDeErro } from '../componentes/util'
import { useSessao } from '../sessao/Sessao'
import classes from './Login.module.css'

export function Login() {
  const { usuario, entrar } = useSessao()
  const navegar = useNavigate()
  const local = useLocation()
  const voltarPara = (local.state as { voltarPara?: string } | null)?.voltarPara ?? '/transferencias'
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const form = useForm({
    initialValues: { usuario: '', senha: '' },
    validate: {
      usuario: (v) => (v.trim() ? null : 'Informe o usuário ou e-mail'),
      senha: (v) => (v ? null : 'Informe a senha'),
    },
  })

  if (usuario) return <Navigate to={voltarPara} replace />

  const enviar = form.onSubmit(async ({ usuario, senha }) => {
    setErro(null)
    setEnviando(true)
    try {
      await entrar(usuario, senha)
      navegar(voltarPara, { replace: true })
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  })

  return (
    <div className={classes.tela}>
      <aside className={classes.painel}>
        <div className={classes.marca}>
          <span className={classes.marcaSimbolo} aria-hidden>
            <IconArrowsExchange size={20} stroke={2} />
          </span>
          STBP
        </div>
        <div>
          <div className={classes.titulo}>Transferência de Bens Patrimoniais</div>
          <p className={classes.texto}>
            Registro dos termos de transferência entre unidades, com emissão do documento para assinatura e
            controle do setor de Patrimônio.
          </p>
        </div>
        <div>
          <p className={classes.aviso}>
            Acesso restrito a usuários autorizados. As operações realizadas no sistema são registradas com o usuário
            responsável.
          </p>
          <div className={classes.instituicoes}>FIES · SESI · SENAI</div>
        </div>
      </aside>

      <main className={classes.lado}>
        <form onSubmit={enviar} className={classes.formulario}>
          <Stack gap="lg">
            <div>
              <span className="stbp-sobretitulo">Acesso ao sistema</span>
              <Title order={1} mt={4}>
                Entrar
              </Title>
              <Text size="sm" c="dimmed" mt={6}>
                Use o mesmo usuário e senha do sistema anterior.
              </Text>
            </div>
            {erro && (
              <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />}>
                {erro}
              </Alert>
            )}
            <TextInput label="Usuário ou e-mail" size="md" autoComplete="username" autoFocus {...form.getInputProps('usuario')} />
            <PasswordInput label="Senha" size="md" autoComplete="current-password" {...form.getInputProps('senha')} />
            <Button type="submit" size="md" loading={enviando} fullWidth>
              Entrar
            </Button>
            <Text size="xs" c="dimmed">
              Esqueceu a senha? Peça a um administrador do sistema para redefini-la.
            </Text>
          </Stack>
        </form>
      </main>
    </div>
  )
}
