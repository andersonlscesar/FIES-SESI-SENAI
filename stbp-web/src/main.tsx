import '@fontsource-variable/ibm-plex-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@mantine/core/styles.css'
import '@mantine/charts/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import './estilos.css'

import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import relativeTime from 'dayjs/plugin/relativeTime'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { ApiErro } from './api/cliente'
import { Layout } from './componentes/Layout'
import { Instituicoes } from './paginas/cadastros/Instituicoes'
import { Unidades } from './paginas/cadastros/Unidades'
import { Login } from './paginas/Login'
import { Painel } from './paginas/Painel'
import { DetalheSaida } from './paginas/saidas/DetalheSaida'
import { FormularioSaida } from './paginas/saidas/FormularioSaida'
import { ListaSaidas } from './paginas/saidas/ListaSaidas'
import { TrocarSenha } from './paginas/TrocarSenha'
import { DetalheTransferencia } from './paginas/transferencias/DetalheTransferencia'
import { FormularioTransferencia } from './paginas/transferencias/FormularioTransferencia'
import { ListaTransferencias } from './paginas/transferencias/ListaTransferencias'
import { Lixeira } from './paginas/transferencias/Lixeira'
import { Usuarios } from './paginas/usuarios/Usuarios'
import { RotaProtegida } from './sessao/RotaProtegida'
import { SessaoProvider } from './sessao/Sessao'
import { tema } from './tema'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

/** Claro, escuro ou automático (segue o sistema); a mesma chave é lida no index.html para evitar o "piscar". */
const gerenciadorTema = localStorageColorSchemeManager({ key: 'stbp-tema' })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Não insiste em erros de permissão/inexistência
      retry: (tentativas, erro) => !(erro instanceof ApiErro && erro.status >= 400 && erro.status < 500) && tentativas < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={tema} colorSchemeManager={gerenciadorTema} defaultColorScheme="auto">
      <DatesProvider settings={{ locale: 'pt-br' }}>
        <ModalsProvider labels={{ confirm: 'Confirmar', cancel: 'Cancelar' }}>
          <Notifications position="top-right" />
          <QueryClientProvider client={queryClient}>
            <SessaoProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route element={<RotaProtegida />}>
                    <Route element={<Layout />}>
                      <Route path="/trocar-senha" element={<TrocarSenha />} />
                      <Route path="/painel" element={<Painel />} />
                      <Route path="/transferencias" element={<ListaTransferencias />} />
                      <Route path="/transferencias/:id" element={<DetalheTransferencia />} />
                      <Route path="/saidas" element={<ListaSaidas />} />
                      <Route path="/saidas/:id" element={<DetalheSaida />} />
                      <Route element={<RotaProtegida perfil="TECNICO" />}>
                        <Route path="/transferencias/nova" element={<FormularioTransferencia />} />
                        <Route path="/transferencias/:id/editar" element={<FormularioTransferencia />} />
                        <Route path="/transferencias/lixeira" element={<Lixeira />} />
                        <Route path="/saidas/nova" element={<FormularioSaida />} />
                        <Route path="/saidas/:id/editar" element={<FormularioSaida />} />
                      </Route>
                      <Route element={<RotaProtegida perfil="ADMIN" />}>
                        <Route path="/instituicoes" element={<Instituicoes />} />
                        <Route path="/unidades" element={<Unidades />} />
                        <Route path="/usuarios" element={<Usuarios />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/transferencias" replace />} />
                </Routes>
              </BrowserRouter>
            </SessaoProvider>
          </QueryClientProvider>
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
