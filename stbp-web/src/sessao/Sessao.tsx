import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { aoPerderSessao, gravarToken, lerToken } from '../api/cliente'
import { authApi } from '../api/recursos'
import { ORDEM_PERFIS, type Perfil, type Usuario } from '../api/tipos'

interface ContextoSessao {
  usuario: Usuario | null
  carregando: boolean
  entrar: (usuario: string, senha: string) => Promise<void>
  sair: () => void
  /** Relê o usuário logado (ex.: depois de trocar a senha). */
  recarregar: () => Promise<void>
  /** Perfis são cumulativos: SUPERADMIN > ADMIN > TECNICO > LEITOR. */
  temPerfil: (minimo: Perfil) => boolean
}

const Contexto = createContext<ContextoSessao | null>(null)

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(() => lerToken() !== null)
  const queryClient = useQueryClient()

  const sair = useCallback(() => {
    gravarToken(null)
    setUsuario(null)
    queryClient.clear()
  }, [queryClient])

  const recarregar = useCallback(async () => {
    try {
      setUsuario(await authApi.eu())
    } catch {
      sair()
    }
  }, [sair])

  // Restaura a sessão salva ao abrir a aplicação
  useEffect(() => {
    if (lerToken() === null) return
    recarregar().finally(() => setCarregando(false))
  }, [recarregar])

  useEffect(() => {
    aoPerderSessao((evento) => {
      if (evento === 'nao-autenticado') {
        sair()
        notifications.show({ color: 'yellow', message: 'Sua sessão terminou. Entre novamente.' })
      } else {
        void recarregar()
      }
    })
  }, [sair, recarregar])

  const entrar = useCallback(async (identificador: string, senha: string) => {
    const resposta = await authApi.login(identificador, senha)
    gravarToken(resposta.token)
    setUsuario(resposta.usuario)
  }, [])

  const temPerfil = useCallback(
    (minimo: Perfil) => usuario !== null && ORDEM_PERFIS.indexOf(usuario.perfil) >= ORDEM_PERFIS.indexOf(minimo),
    [usuario],
  )

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, sair, recarregar, temPerfil }),
    [usuario, carregando, entrar, sair, recarregar, temPerfil],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSessao(): ContextoSessao {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useSessao fora do SessaoProvider')
  return contexto
}
