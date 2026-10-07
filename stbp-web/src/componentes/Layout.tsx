import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Burger,
  Group,
  Menu,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconArrowsExchange,
  IconBuilding,
  IconBuildingCommunity,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconDeviceDesktop,
  IconFilePlus,
  IconKey,
  IconListDetails,
  IconLogout,
  IconMoon,
  IconSun,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { NavLink as RouterNavLink, Outlet, useNavigate } from 'react-router'

import { NOMES_PERFIL, type Perfil } from '../api/tipos'
import { useSessao } from '../sessao/Sessao'
import { Trilha } from './Trilha'
import classes from './Layout.module.css'

interface ItemMenu {
  rotulo: string
  para: string
  icone: ReactNode
  perfil: Perfil
  /** Marca o item só na rota exata (evita marcar "Transferências" em "/transferencias/nova"). */
  exato?: boolean
}

const ICONE = { size: 18, stroke: 1.6 }

const MENU: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: 'Patrimônio',
    itens: [
      { rotulo: 'Painel', para: '/painel', icone: <IconChartBar {...ICONE} />, perfil: 'LEITOR' },
      { rotulo: 'Transferências', para: '/transferencias', icone: <IconListDetails {...ICONE} />, perfil: 'LEITOR', exato: true },
      { rotulo: 'Nova transferência', para: '/transferencias/nova', icone: <IconFilePlus {...ICONE} />, perfil: 'TECNICO' },
      { rotulo: 'Lixeira', para: '/transferencias/lixeira', icone: <IconTrash {...ICONE} />, perfil: 'TECNICO' },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { rotulo: 'Instituições', para: '/instituicoes', icone: <IconBuilding {...ICONE} />, perfil: 'ADMIN' },
      { rotulo: 'Unidades', para: '/unidades', icone: <IconBuildingCommunity {...ICONE} />, perfil: 'ADMIN' },
      { rotulo: 'Usuários', para: '/usuarios', icone: <IconUsers {...ICONE} />, perfil: 'ADMIN' },
    ],
  },
]

function iniciais(nome: string | undefined) {
  if (!nome) return ''
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

/** Alterna claro/escuro; o menu do usuário também permite voltar a seguir o sistema. */
function BotaoTema() {
  const { setColorScheme } = useMantineColorScheme()
  const atual = useComputedColorScheme('light', { getInitialValueInEffect: false })
  const proximo = atual === 'dark' ? 'light' : 'dark'
  return (
    <Tooltip label={proximo === 'dark' ? 'Tema escuro' : 'Tema claro'}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        aria-label={proximo === 'dark' ? 'Usar tema escuro' : 'Usar tema claro'}
        onClick={() => setColorScheme(proximo)}
      >
        {atual === 'dark' ? <IconSun {...ICONE} /> : <IconMoon {...ICONE} />}
      </ActionIcon>
    </Tooltip>
  )
}

export function Layout() {
  const [aberto, { toggle, close }] = useDisclosure()
  const { usuario, sair, temPerfil } = useSessao()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const navegar = useNavigate()

  const opcaoTema = (valor: 'light' | 'dark' | 'auto', rotulo: string, icone: ReactNode) => (
    <Menu.Item
      leftSection={icone}
      rightSection={colorScheme === valor ? <IconCheck size={14} /> : null}
      onClick={() => setColorScheme(valor)}
    >
      {rotulo}
    </Menu.Item>
  )

  return (
    <AppShell
      layout="alt"
      header={{ height: 64 }}
      navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: !aberto } }}
      padding={{ base: 'md', md: 'xl' }}
    >
      <AppShell.Header className={classes.cabecalho}>
        <Group h="100%" px={{ base: 'md', md: 'xl' }} justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={aberto} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Abrir menu" />
            <Box visibleFrom="sm">
              <Trilha />
            </Box>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <BotaoTema />
            <Menu position="bottom-end" width={240}>
              <Menu.Target>
                <UnstyledButton aria-label="Menu do usuário" px={6} py={4}>
                  <Group gap={10} wrap="nowrap">
                    <Avatar size={32} color="marinho" variant="filled">
                      {iniciais(usuario?.nome)}
                    </Avatar>
                    <div style={{ lineHeight: 1.15 }}>
                      <Text size="sm" fw={500} visibleFrom="xs">
                        {usuario?.nome}
                      </Text>
                      <Text size="xs" c="dimmed" visibleFrom="xs">
                        {usuario && NOMES_PERFIL[usuario.perfil]}
                      </Text>
                    </div>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Aparência</Menu.Label>
                {opcaoTema('light', 'Claro', <IconSun size={16} />)}
                {opcaoTema('dark', 'Escuro', <IconMoon size={16} />)}
                {opcaoTema('auto', 'Seguir o sistema', <IconDeviceDesktop size={16} />)}
                <Menu.Divider />
                <Menu.Label>Conta</Menu.Label>
                <Menu.Item leftSection={<IconKey size={16} />} onClick={() => navegar('/trocar-senha')}>
                  Trocar senha
                </Menu.Item>
                <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={sair}>
                  Sair
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className={classes.lateral} withBorder={false}>
        <div className={classes.marca}>
          <div className={classes.marcaSimbolo} aria-hidden>
            <IconArrowsExchange size={18} stroke={2} />
          </div>
          <div>
            <div className={classes.marcaNome}>STBP</div>
            <div className={classes.marcaDescricao}>Bens patrimoniais</div>
          </div>
        </div>

        <nav aria-label="Menu principal">
          {MENU.map((grupo) => {
            const visiveis = grupo.itens.filter((item) => temPerfil(item.perfil))
            if (visiveis.length === 0) return null
            return (
              <div key={grupo.titulo}>
                <div className={classes.secao}>{grupo.titulo}</div>
                {visiveis.map((item) => (
                  <RouterNavLink key={item.para} to={item.para} end={item.exato} onClick={close} style={{ textDecoration: 'none' }}>
                    {({ isActive }) => (
                      <span className={classes.link} data-ativo={isActive}>
                        {item.icone}
                        {item.rotulo}
                      </span>
                    )}
                  </RouterNavLink>
                ))}
              </div>
            )
          })}
        </nav>

        <div className={classes.rodapeLateral}>FIES · SESI · SENAI</div>
      </AppShell.Navbar>

      <AppShell.Main className={classes.principal}>
        <div className={classes.conteudo}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  )
}
