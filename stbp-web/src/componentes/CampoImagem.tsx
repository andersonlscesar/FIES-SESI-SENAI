import { Box, Button, Center, FileButton, Group, Image, Input, Stack, Text } from '@mantine/core'
import { IconPhoto, IconTrash, IconUpload } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

const TIPOS = ['image/png', 'image/jpeg']

/** Valor do campo: imagem atual (url), nova imagem escolhida (arquivo) ou pedido de remoção. */
export interface ValorImagem {
  arquivo: File | null
  remover: boolean
}

/**
 * Campo de imagem para formulários (logo da instituição, foto da unidade): pré-visualiza a imagem atual ou a
 * escolhida, valida tipo e tamanho no navegador e só envia ao salvar o formulário.
 */
export function CampoImagem({
  rotulo,
  descricao,
  urlAtual,
  valor,
  aoAlterar,
  tamanhoMaximo,
  altura = 120,
  ajuste = 'contain',
}: {
  rotulo: string
  descricao: string
  urlAtual: string | null
  valor: ValorImagem
  aoAlterar: (valor: ValorImagem) => void
  tamanhoMaximo: number
  altura?: number
  /** "contain" para logos (sem cortar), "cover" para fotos. */
  ajuste?: 'contain' | 'cover'
}) {
  const [erro, setErro] = useState<string | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)

  // URL temporária da imagem escolhida (liberada ao trocar ou fechar)
  useEffect(() => {
    if (!valor.arquivo) {
      setPrevia(null)
      return
    }
    const url = URL.createObjectURL(valor.arquivo)
    setPrevia(url)
    return () => URL.revokeObjectURL(url)
  }, [valor.arquivo])

  const exibida = previa ?? (valor.remover ? null : urlAtual)

  const escolher = (arquivo: File | null) => {
    if (!arquivo) return
    if (!TIPOS.includes(arquivo.type)) {
      setErro('Escolha uma imagem PNG ou JPEG.')
      return
    }
    if (arquivo.size > tamanhoMaximo) {
      setErro(`A imagem deve ter no máximo ${Math.round(tamanhoMaximo / 1024 / 1024)} MB.`)
      return
    }
    setErro(null)
    aoAlterar({ arquivo, remover: false })
  }

  return (
    <Input.Wrapper label={rotulo} description={descricao} error={erro}>
      <Stack gap="xs" mt={6}>
        <Box
          h={altura}
          style={{ border: '1px solid var(--stbp-borda)', borderRadius: 'var(--mantine-radius-sm)', overflow: 'hidden' }}
          bg={ajuste === 'contain' ? 'var(--mantine-color-body)' : undefined}
        >
          {exibida ? (
            <Image src={exibida} alt={`Pré-visualização: ${rotulo}`} h={altura} w="100%" fit={ajuste} p={ajuste === 'contain' ? 'sm' : 0} />
          ) : (
            <Center h="100%" bg="var(--stbp-placeholder-fundo)" c="var(--stbp-placeholder-icone)">
              <Stack gap={4} align="center">
                <IconPhoto size={28} stroke={1.3} />
                <Text size="xs">Nenhuma imagem</Text>
              </Stack>
            </Center>
          )}
        </Box>
        <Group gap="xs">
          <FileButton accept={TIPOS.join(',')} onChange={escolher}>
            {(props) => (
              <Button variant="default" size="xs" leftSection={<IconUpload size={14} />} {...props}>
                {exibida ? 'Trocar imagem' : 'Escolher imagem'}
              </Button>
            )}
          </FileButton>
          {exibida && (
            <Button
              variant="subtle"
              color="red"
              size="xs"
              leftSection={<IconTrash size={14} />}
              onClick={() => aoAlterar({ arquivo: null, remover: urlAtual !== null })}
            >
              Remover
            </Button>
          )}
          {valor.arquivo && (
            <Text size="xs" c="dimmed" lineClamp={1} maw={220}>
              {valor.arquivo.name}
            </Text>
          )}
        </Group>
      </Stack>
    </Input.Wrapper>
  )
}
