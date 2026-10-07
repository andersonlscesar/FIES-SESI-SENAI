// Design system do STBP: institucional e sóbrio. Ver docs/design.md.
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  createTheme,
  Menu,
  Modal,
  Notification,
  Pagination,
  Paper,
  SegmentedControl,
  Table,
  Tooltip,
  type MantineColorsTuple,
} from '@mantine/core'

/** Azul-marinho institucional, escuro e pouco saturado (cor principal). */
const marinho: MantineColorsTuple = [
  '#eef1f5',
  '#d9dfe8',
  '#b3bfcf',
  '#8a9cb4',
  '#69809e',
  '#536d90',
  '#476289',
  '#385277',
  '#2b4466',
  '#1e3352',
]

/** Ardósia para o tema escuro (Mantine usa "dark" para fundos, superfícies e texto no modo escuro). */
const ardosia: MantineColorsTuple = [
  '#d5dae2',
  '#b2b9c5',
  '#8b94a4',
  '#646e7f',
  '#3b4352',
  '#2b323e',
  '#222833',
  '#191e27',
  '#12161d',
  '#0b0e13',
]

export const tema = createTheme({
  primaryColor: 'marinho',
  primaryShade: { light: 8, dark: 6 },
  black: '#111823',
  colors: { marinho, dark: ardosia },

  fontFamily: '"IBM Plex Sans Variable", "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  headings: {
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '1.75rem', lineHeight: '1.25' },
      h2: { fontSize: '1.25rem', lineHeight: '1.3' },
      h3: { fontSize: '1.125rem', lineHeight: '1.35' },
      h4: { fontSize: '1rem', lineHeight: '1.4' },
    },
  },

  // Cantos quase retos: seriedade em vez de "fofura"
  radius: { xs: '2px', sm: '2px', md: '3px', lg: '4px', xl: '6px' },
  defaultRadius: 'sm',
  shadows: {
    xs: '0 1px 1px rgba(16, 24, 40, .04)',
    sm: '0 1px 2px rgba(16, 24, 40, .06)',
    md: '0 4px 14px rgba(16, 24, 40, .12)',
    lg: '0 8px 24px rgba(16, 24, 40, .14)',
    xl: '0 16px 40px rgba(16, 24, 40, .18)',
  },
  cursorType: 'pointer',
  focusRing: 'auto',

  components: {
    Button: Button.extend({ defaultProps: { radius: 'sm' }, styles: { root: { fontWeight: 500 } } }),
    ActionIcon: ActionIcon.extend({ defaultProps: { radius: 'sm' } }),
    Badge: Badge.extend({
      defaultProps: { radius: 'xs', variant: 'light' },
      styles: { root: { letterSpacing: '0.03em', fontWeight: 600 } },
    }),
    Paper: Paper.extend({ defaultProps: { radius: 'sm' } }),
    Card: Card.extend({ defaultProps: { radius: 'sm' } }),
    Avatar: Avatar.extend({ defaultProps: { radius: 'sm' } }),
    Tooltip: Tooltip.extend({ defaultProps: { radius: 'xs', openDelay: 300, withArrow: false } }),
    Menu: Menu.extend({ defaultProps: { radius: 'sm', shadow: 'md' } }),
    Modal: Modal.extend({ defaultProps: { radius: 'sm', overlayProps: { backgroundOpacity: 0.55 } } }),
    Notification: Notification.extend({ defaultProps: { radius: 'sm' } }),
    SegmentedControl: SegmentedControl.extend({ defaultProps: { radius: 'sm' } }),
    Pagination: Pagination.extend({ defaultProps: { radius: 'sm' } }),
    Table: Table.extend({
      defaultProps: { verticalSpacing: 'sm', horizontalSpacing: 'md' },
      classNames: { th: 'stbp-th', table: 'stbp-tabela' },
    }),
  },
})
