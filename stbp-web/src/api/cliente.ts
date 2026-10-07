// Cliente HTTP da API: envia o token, converte erros (Problem Details, RFC 9457) em ApiErro.

const CHAVE_TOKEN = 'stbp.token'

export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function gravarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // armazenamento indisponível (ex.: navegação privada restrita): a sessão dura até recarregar a página
  }
}

export class ApiErro extends Error {
  readonly status: number
  readonly codigo?: string
  /** Mensagens por campo, quando a API recusa dados inválidos (400). */
  readonly campos: Record<string, string>

  constructor(status: number, mensagem: string, codigo?: string, campos: Record<string, string> = {}) {
    super(mensagem)
    this.status = status
    this.codigo = codigo
    this.campos = campos
  }
}

/** Avisado quando a API responde 401 (token expirado/inválido ou usuário bloqueado) ou exige troca de senha. */
type Ouvinte = (evento: 'nao-autenticado' | 'troca-de-senha') => void
let ouvinte: Ouvinte = () => {}
export function aoPerderSessao(fn: Ouvinte) {
  ouvinte = fn
}

const MENSAGENS_PADRAO: Record<number, string> = {
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Registro não encontrado.',
  413: 'Arquivo grande demais.',
  500: 'Erro inesperado no servidor. Tente novamente.',
  502: 'O servidor da aplicação está fora do ar. Tente novamente em instantes.',
  503: 'O servidor da aplicação está fora do ar. Tente novamente em instantes.',
  504: 'O servidor da aplicação não respondeu a tempo. Tente novamente.',
}

/** A API sempre responde erros com corpo JSON; um 500 sem corpo vem do proxy (Vite/nginx) sem conseguir alcançá-la. */
const API_INACESSIVEL = 'Não foi possível falar com a API. Verifique se ela está rodando.'

async function requisicao(metodo: string, caminho: string, corpo?: unknown): Promise<Response> {
  const cabecalhos: Record<string, string> = {}
  const token = lerToken()
  if (token) cabecalhos.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (corpo instanceof FormData) {
    body = corpo
  } else if (corpo !== undefined) {
    cabecalhos['Content-Type'] = 'application/json'
    body = JSON.stringify(corpo)
  }

  let resposta: Response
  try {
    resposta = await fetch(caminho, { method: metodo, headers: cabecalhos, body })
  } catch {
    throw new ApiErro(0, 'Não foi possível conectar ao servidor.')
  }
  if (resposta.ok) return resposta

  let problema: { detail?: string; codigo?: string; campos?: Record<string, string> } = {}
  let semCorpo = false
  try {
    problema = await resposta.json()
  } catch {
    // resposta sem corpo (ex.: 401 do filtro de segurança, ou proxy sem acesso à API)
    semCorpo = true
  }
  if (resposta.status === 500 && semCorpo) throw new ApiErro(500, API_INACESSIVEL)

  // O login devolve 401 para credenciais inválidas: isso não é "sessão perdida"
  const ehLogin = caminho === '/api/auth/login'
  if (resposta.status === 401 && !ehLogin) ouvinte('nao-autenticado')
  if (resposta.status === 403 && problema.codigo === 'TROCA_DE_SENHA_OBRIGATORIA') ouvinte('troca-de-senha')

  throw new ApiErro(
    resposta.status,
    problema.detail ?? MENSAGENS_PADRAO[resposta.status] ?? `Erro ${resposta.status}`,
    problema.codigo,
    problema.campos,
  )
}

export const api = {
  async get<T>(caminho: string): Promise<T> {
    return (await requisicao('GET', caminho)).json()
  },
  async post<T>(caminho: string, corpo?: unknown): Promise<T> {
    return conteudo(await requisicao('POST', caminho, corpo))
  },
  async put<T>(caminho: string, corpo?: unknown): Promise<T> {
    return conteudo(await requisicao('PUT', caminho, corpo))
  },
  async delete<T = void>(caminho: string): Promise<T> {
    return conteudo(await requisicao('DELETE', caminho))
  },
  async blob(caminho: string): Promise<Blob> {
    return (await requisicao('GET', caminho)).blob()
  },
}

async function conteudo<T>(resposta: Response): Promise<T> {
  return (resposta.status === 204 ? undefined : await resposta.json()) as T
}

/** Monta a query string ignorando valores vazios. */
export function query(parametros: object): string {
  const busca = new URLSearchParams()
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') busca.set(chave, String(valor))
  }
  const texto = busca.toString()
  return texto ? `?${texto}` : ''
}
