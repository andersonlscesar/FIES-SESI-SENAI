import { Center, Loader } from '@mantine/core'
import { Navigate, Outlet, useLocation } from 'react-router'

import type { Perfil } from '../api/tipos'
import { useSessao } from './Sessao'

/**
 * Exige usuário logado (e, opcionalmente, um perfil mínimo). Enquanto houver troca de senha pendente,
 * só a tela de troca de senha fica acessível, como na API.
 */
export function RotaProtegida({ perfil }: { perfil?: Perfil }) {
  const { usuario, carregando, temPerfil } = useSessao()
  const local = useLocation()

  if (carregando) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }
  if (!usuario) return <Navigate to="/login" replace state={{ voltarPara: local.pathname + local.search }} />
  if (usuario.trocarSenha && local.pathname !== '/trocar-senha') return <Navigate to="/trocar-senha" replace />
  if (perfil && !temPerfil(perfil)) return <Navigate to="/transferencias" replace />
  return <Outlet />
}
