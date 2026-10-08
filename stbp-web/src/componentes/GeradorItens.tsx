import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconAlertTriangle, IconListNumbers } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { descreverIntervalo, gerarPatrimonios, repetidos } from './sequencia'

export interface ItemGerado {
  descricao: string
  patrimonio: string
  observacao: string
  /** Só no Controle de Saída de Materiais ({@code comAreas}). */
  areaSaida?: string
  areaEntrada?: string
}

/**
 * Gera vários itens iguais com patrimônio sequencial (ex.: 100 computadores de 36102 a 36201).
 * {@code vagas} é quantos itens ainda cabem na transferência (limite de 500).
 */
export function GeradorItens({
  aberto,
  vagas,
  comAreas = false,
  comPatrimonio = true,
  descricao,
  patrimoniosExistentes,
  aoFechar,
  aoGerar,
}: {
  aberto: boolean
  vagas: number
  /** Pede também as áreas de saída e de entrada, repetidas em todos os itens (controle de saída). */
  comAreas?: boolean
  /** false = sem patrimônio (controle de saída): gera vários itens iguais, sem sequência. */
  comPatrimonio?: boolean
  /** Texto de apresentação (o padrão fala de lotes com patrimônio sequencial). */
  descricao?: ReactNode
  patrimoniosExistentes: string[]
  aoFechar: () => void
  aoGerar: (itens: ItemGerado[]) => void
}) {
  const form = useForm({
    initialValues: {
      descricao: '',
      patrimonioInicial: '',
      quantidade: 10 as number | string,
      observacao: '',
      areaSaida: '',
      areaEntrada: '',
    },
    validate: {
      descricao: (v) => (v.trim() ? null : 'Informe a descrição dos itens'),
      quantidade: (v) =>
        typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= vagas
          ? null
          : `Informe de 1 a ${vagas} ${vagas === 1 ? 'item' : 'itens'}`,
      patrimonioInicial: (v) =>
        !comPatrimonio || /\d\s*$/.test(v) ? null : 'Deve terminar em número (ex.: 36102 ou NB-0010)',
    },
  })

  const { quantidade, patrimonioInicial } = form.values
  const quantidadeValida = typeof quantidade === 'number' && quantidade >= 1 && quantidade <= vagas
  let previa: string[] = []
  try {
    if (comPatrimonio && quantidadeValida && patrimonioInicial.trim()) {
      previa = gerarPatrimonios(patrimonioInicial, quantidade)
    }
  } catch {
    previa = []
  }
  const conflitos = repetidos(previa, patrimoniosExistentes)

  const gerar = form.onSubmit((v) => {
    const n = Number(v.quantidade)
    const patrimonios = comPatrimonio ? gerarPatrimonios(v.patrimonioInicial, n) : Array<string>(n).fill('')
    const areas = comAreas ? { areaSaida: v.areaSaida.trim(), areaEntrada: v.areaEntrada.trim() } : {}
    aoGerar(
      patrimonios.map((patrimonio) => ({
        descricao: v.descricao.trim(),
        patrimonio,
        observacao: v.observacao.trim(),
        ...areas,
      })),
    )
    form.reset()
    aoFechar()
  })

  return (
    <Modal
      opened={aberto}
      onClose={aoFechar}
      title={comPatrimonio ? 'Gerar itens em sequência' : 'Adicionar vários itens iguais'}
      size="lg"
    >
      {/* O modal fica dentro do formulário da transferência na árvore do React: sem o stopPropagation,
          o envio deste formulário também enviaria (e validaria) o formulário da transferência */}
      <form
        onSubmit={(e) => {
          e.stopPropagation()
          gerar(e)
        }}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {descricao ??
              'Para lotes de bens iguais com patrimônio sequencial. Os itens são adicionados ao final da lista e podem ser ajustados um a um depois.'}
          </Text>
          <TextInput
            label="Descrição dos itens"
            placeholder="Ex.: Notebook Dell Latitude 3420"
            withAsterisk
            maxLength={200}
            data-autofocus
            {...form.getInputProps('descricao')}
          />
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            {comPatrimonio && (
              <TextInput
                label="Patrimônio inicial"
                placeholder="Ex.: 36102"
                description="Zeros à esquerda e prefixos são mantidos"
                withAsterisk
                maxLength={150}
                {...form.getInputProps('patrimonioInicial')}
              />
            )}
            <NumberInput
              label="Quantidade"
              description={`Cabem até ${vagas} ${vagas === 1 ? 'item' : 'itens'} na lista`}
              withAsterisk
              min={1}
              max={vagas}
              allowDecimal={false}
              allowNegative={false}
              {...form.getInputProps('quantidade')}
            />
          </SimpleGrid>
          {comAreas && (
            <SimpleGrid cols={{ base: 1, xs: 2 }}>
              <TextInput
                label="Área de saída (opcional)"
                placeholder="Setor, oficina ou laboratório"
                maxLength={150}
                {...form.getInputProps('areaSaida')}
              />
              <TextInput
                label="Área de entrada (opcional)"
                placeholder="Setor, oficina ou laboratório"
                maxLength={150}
                {...form.getInputProps('areaEntrada')}
              />
            </SimpleGrid>
          )}
          <Textarea
            label="Observação (opcional)"
            description="Repetida em todos os itens gerados"
            autosize
            minRows={1}
            maxRows={3}
            maxLength={5000}
            {...form.getInputProps('observacao')}
          />

          {comPatrimonio && (
            <Paper withBorder p="sm" bg="var(--stbp-fundo)">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <IconListNumbers size={20} stroke={1.6} style={{ flexShrink: 0, marginTop: 2 }} />
                {previa.length > 0 ? (
                  <div>
                    <Text size="sm" fw={600}>
                      {previa.length} {previa.length === 1 ? 'item' : 'itens'} · patrimônio{' '}
                      <span className="stbp-numero">{descreverIntervalo(previa)}</span>
                    </Text>
                    <Text size="xs" c="dimmed" className="stbp-numero" lineClamp={1}>
                      {previa.slice(0, 6).join(', ')}
                      {previa.length > 6 ? ', …' : ''}
                    </Text>
                  </div>
                ) : (
                  <Text size="sm" c="dimmed">
                    Informe o patrimônio inicial e a quantidade para ver a sequência.
                  </Text>
                )}
              </Group>
            </Paper>
          )}

          {conflitos.length > 0 && (
            <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />}>
              {conflitos.length === 1 ? 'O patrimônio' : `${conflitos.length} patrimônios`}{' '}
              <span className="stbp-numero">{conflitos.slice(0, 5).join(', ')}</span>
              {conflitos.length > 5 ? ', …' : ''} {conflitos.length === 1 ? 'já está' : 'já estão'} nesta transferência.
              Confira antes de gerar.
            </Alert>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={vagas < 1}>
              {gerarRotulo(comPatrimonio ? previa.length : quantidadeValida ? Number(quantidade) : 0)}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

const gerarRotulo = (n: number) => (n > 0 ? `Gerar ${n} ${n === 1 ? 'item' : 'itens'}` : 'Gerar itens')
