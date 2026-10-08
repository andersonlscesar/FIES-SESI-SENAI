import { Alert, Button, Checkbox, Group, Modal, Paper, SegmentedControl, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useState, type ReactNode } from 'react'

import { contarAlterados, type AlteracoesLote, type CampoTexto, type ItemEditavel, type ModoObservacao } from './edicaoLote'
import { descreverIntervalo, gerarPatrimonios, repetidos } from './sequencia'

/** Um campo opcional da edição em lote: só é aplicado se estiver marcado. */
function Bloco({ rotulo, ativo, aoAlternar, children }: { rotulo: string; ativo: boolean; aoAlternar: (v: boolean) => void; children: ReactNode }) {
  return (
    <Paper withBorder p="sm" bg={ativo ? undefined : 'var(--stbp-fundo)'}>
      <Stack gap="sm">
        <Checkbox label={rotulo} checked={ativo} onChange={(e) => aoAlternar(e.currentTarget.checked)} fw={500} />
        {ativo && children}
      </Stack>
    </Paper>
  )
}

/**
 * Edita de uma vez os itens selecionados: descrição, patrimônio (sequência ou S/P) e observação.
 * Montado de novo a cada abertura (key no formulário), então começa sempre limpo.
 */
export function EdicaoItensLote({
  aberto,
  itens,
  selecionados,
  camposTexto,
  permitePatrimonio = true,
  aoFechar,
  aoAplicar,
}: {
  aberto: boolean
  itens: ItemEditavel[]
  selecionados: ReadonlySet<string>
  /** Campos de texto livre oferecidos (descrição e, no controle de saída, as áreas). */
  camposTexto: { campo: CampoTexto; rotulo: string; maxLength: number; placeholder?: string }[]
  /** false = itens sem patrimônio (controle de saída): o bloco de patrimônio não aparece. */
  permitePatrimonio?: boolean
  aoFechar: () => void
  aoAplicar: (alteracoes: AlteracoesLote) => void
}) {
  // Cada campo de texto só é aplicado se estiver marcado
  const [textos, setTextos] = useState<Partial<Record<CampoTexto, string>>>({})
  const alternarTexto = (campo: CampoTexto, ativo: boolean) =>
    setTextos((atual) => {
      const novo = { ...atual }
      if (ativo) novo[campo] = ''
      else delete novo[campo]
      return novo
    })
  const [comPatrimonio, setComPatrimonio] = useState(false)
  const [modoPatrimonio, setModoPatrimonio] = useState<'sequencia' | 'sp'>('sequencia')
  const [inicial, setInicial] = useState('')
  const [comObservacao, setComObservacao] = useState(true)
  const [modoObservacao, setModoObservacao] = useState<ModoObservacao>('vazias')
  const [observacao, setObservacao] = useState('')

  const quantidade = selecionados.size
  const alteracoes: AlteracoesLote = {
    textos: Object.keys(textos).length > 0 ? textos : undefined,
    patrimonio: comPatrimonio ? (modoPatrimonio === 'sp' ? { modo: 'sp' } : { modo: 'sequencia', inicial }) : undefined,
    observacao: comObservacao ? { modo: modoObservacao, texto: observacao } : undefined,
  }

  let sequencia: string[] = []
  const sequenciaValida = /\d\s*$/.test(inicial)
  if (comPatrimonio && modoPatrimonio === 'sequencia' && sequenciaValida) {
    try {
      sequencia = gerarPatrimonios(inicial, quantidade)
    } catch {
      sequencia = []
    }
  }
  const conflitos = repetidos(
    sequencia,
    itens.filter((i) => !selecionados.has(i.chave)).map((i) => i.patrimonio),
  )

  const erroDescricao = textos.descricao !== undefined && !textos.descricao.trim() ? 'Informe a descrição' : null
  const erroSequencia =
    comPatrimonio && modoPatrimonio === 'sequencia' && !sequenciaValida ? 'Deve terminar em número (ex.: 36102 ou NB-0010)' : null
  const algumCampo = Object.keys(textos).length > 0 || comPatrimonio || comObservacao
  const alterados = algumCampo && !erroDescricao && !erroSequencia ? contarAlterados(itens, selecionados, alteracoes) : 0
  const semObservacao = itens.filter((i) => selecionados.has(i.chave) && !i.observacao.trim()).length

  const aplicar = () => {
    if (alterados === 0) return
    aoAplicar(alteracoes)
    aoFechar()
  }

  return (
    <Modal opened={aberto} onClose={aoFechar} title={`Editar ${quantidade} ${quantidade === 1 ? 'item selecionado' : 'itens selecionados'}`} size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          Marque o que deseja alterar. O que não estiver marcado continua como está em cada item. Nada é gravado até
          você salvar a transferência.
        </Text>

        <Bloco rotulo="Observação" ativo={comObservacao} aoAlternar={setComObservacao}>
          <SegmentedControl
            fullWidth
            size="xs"
            value={modoObservacao}
            onChange={(v) => setModoObservacao(v as ModoObservacao)}
            data={[
              { value: 'vazias', label: `Só nos sem observação (${semObservacao})` },
              { value: 'substituir', label: 'Substituir em todos' },
              { value: 'acrescentar', label: 'Acrescentar ao final' },
            ]}
          />
          <Textarea
            aria-label="Texto da observação"
            placeholder={modoObservacao === 'substituir' ? 'Deixe em branco para apagar as observações' : 'Ex.: Lab 16'}
            autosize
            minRows={1}
            maxRows={3}
            maxLength={5000}
            data-autofocus
            value={observacao}
            onChange={(e) => setObservacao(e.currentTarget.value)}
          />
        </Bloco>

        {camposTexto.map(({ campo, rotulo, maxLength, placeholder }) => (
          <Bloco key={campo} rotulo={rotulo} ativo={textos[campo] !== undefined} aoAlternar={(v) => alternarTexto(campo, v)}>
            <TextInput
              aria-label={`Novo valor de ${rotulo.toLowerCase()}`}
              placeholder={campo === 'descricao' ? placeholder : `${placeholder ?? ''} (em branco apaga)`.trim()}
              maxLength={maxLength}
              value={textos[campo] ?? ''}
              error={campo === 'descricao' ? erroDescricao : null}
              onChange={(e) => {
                const valor = e.currentTarget.value
                setTextos((atual) => ({ ...atual, [campo]: valor }))
              }}
            />
          </Bloco>
        ))}

        {permitePatrimonio && (
          <Bloco rotulo="Patrimônio" ativo={comPatrimonio} aoAlternar={setComPatrimonio}>
            <SegmentedControl
              fullWidth
              size="xs"
              value={modoPatrimonio}
              onChange={(v) => setModoPatrimonio(v as 'sequencia' | 'sp')}
              data={[
                { value: 'sequencia', label: 'Numerar em sequência' },
                { value: 'sp', label: 'Sem patrimônio (S/P)' },
              ]}
            />
            {modoPatrimonio === 'sequencia' && (
              <TextInput
                aria-label="Patrimônio inicial"
                placeholder="Patrimônio inicial, ex.: 36102"
                description={
                  sequencia.length > 0 ? (
                    <>
                      Na ordem da lista: <span className="stbp-numero">{descreverIntervalo(sequencia)}</span>
                    </>
                  ) : (
                    'Zeros à esquerda e prefixos são mantidos'
                  )
                }
                maxLength={150}
                classNames={{ input: 'stbp-numero' }}
                value={inicial}
                error={inicial ? erroSequencia : null}
                onChange={(e) => setInicial(e.currentTarget.value)}
              />
            )}
            {conflitos.length > 0 && (
              <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />}>
                {conflitos.length === 1 ? 'O patrimônio' : `${conflitos.length} patrimônios`}{' '}
                <span className="stbp-numero">{conflitos.slice(0, 5).join(', ')}</span>
                {conflitos.length > 5 ? ', …' : ''} {conflitos.length === 1 ? 'já está' : 'já estão'} em outros itens.
              </Alert>
            )}
          </Bloco>
        )}

        <Group justify="space-between">
          <Text size="sm" c="dimmed" aria-live="polite">
            {algumCampo && alterados < quantidade && !erroDescricao && !erroSequencia
              ? `${alterados} de ${quantidade} ${quantidade === 1 ? 'item muda' : 'itens mudam'}`
              : ''}
          </Text>
          <Group>
            <Button variant="default" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button onClick={aplicar} disabled={alterados === 0}>
              {alterados > 0 ? `Aplicar a ${alterados} ${alterados === 1 ? 'item' : 'itens'}` : 'Aplicar'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
