import { Anchor, Breadcrumbs, Text } from '@mantine/core'
import { Link, useLocation } from 'react-router'

interface Passo {
  rotulo: string
  para?: string
}

/** Trilha de navegação ("Patrimônio / Transferências / Nº 707"), derivada da rota atual. */
function passos(caminho: string): Passo[] {
  const transferencias = { rotulo: 'Transferências', para: '/transferencias' }
  const partes = caminho.split('/').filter(Boolean)
  switch (partes[0]) {
    case 'transferencias': {
      if (partes.length === 1) return [{ rotulo: 'Patrimônio' }, { rotulo: 'Transferências' }]
      if (partes[1] === 'nova') return [{ rotulo: 'Patrimônio' }, transferencias, { rotulo: 'Nova transferência' }]
      if (partes[1] === 'lixeira') return [{ rotulo: 'Patrimônio' }, transferencias, { rotulo: 'Lixeira' }]
      const numero = { rotulo: `Nº ${partes[1]}`, para: `/transferencias/${partes[1]}` }
      if (partes[2] === 'editar') return [{ rotulo: 'Patrimônio' }, transferencias, numero, { rotulo: 'Editar' }]
      return [{ rotulo: 'Patrimônio' }, transferencias, { rotulo: numero.rotulo }]
    }
    case 'saidas': {
      const saidas = { rotulo: 'Saídas de materiais', para: '/saidas' }
      if (partes.length === 1) return [{ rotulo: 'Patrimônio' }, { rotulo: 'Saídas de materiais' }]
      if (partes[1] === 'nova') return [{ rotulo: 'Patrimônio' }, saidas, { rotulo: 'Nova saída' }]
      const numero = { rotulo: `Nº ${partes[1]}`, para: `/saidas/${partes[1]}` }
      if (partes[2] === 'editar') return [{ rotulo: 'Patrimônio' }, saidas, numero, { rotulo: 'Editar' }]
      return [{ rotulo: 'Patrimônio' }, saidas, { rotulo: numero.rotulo }]
    }
    case 'painel':
      return [{ rotulo: 'Patrimônio' }, { rotulo: 'Painel' }]
    case 'instituicoes':
      return [{ rotulo: 'Administração' }, { rotulo: 'Instituições' }]
    case 'unidades':
      return [{ rotulo: 'Administração' }, { rotulo: 'Unidades' }]
    case 'usuarios':
      return [{ rotulo: 'Administração' }, { rotulo: 'Usuários' }]
    case 'trocar-senha':
      return [{ rotulo: 'Conta' }, { rotulo: 'Trocar senha' }]
    default:
      return []
  }
}

export function Trilha() {
  const { pathname } = useLocation()
  const lista = passos(pathname)
  return (
    <Breadcrumbs separator="/" separatorMargin={8} aria-label="Você está em" fz="sm">
      {lista.map((p, i) => {
        const ultimo = i === lista.length - 1
        if (p.para && !ultimo) {
          return (
            <Anchor key={p.rotulo} component={Link} to={p.para} size="sm" c="dimmed" underline="hover">
              {p.rotulo}
            </Anchor>
          )
        }
        return (
          <Text key={p.rotulo} size="sm" c={ultimo ? undefined : 'dimmed'} fw={ultimo ? 500 : 400} aria-current={ultimo ? 'page' : undefined}>
            {p.rotulo}
          </Text>
        )
      })}
    </Breadcrumbs>
  )
}
