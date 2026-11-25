// 백엔드 호출 공통 함수. /api 요청은 vite 프록시로 백엔드에 전달된다.

const TOKEN_KEY = 'crs.token'

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* 저장소를 쓸 수 없는 환경 */
    }
  },
}

/** 백엔드 오류. code 는 ProblemDetail 의 code (API-명세서 21절). 연결 실패면 status 0 */
export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function readError(res: Response, fallback: string): Promise<ApiError> {
  let message = fallback
  let code: string | undefined
  try {
    // 백엔드는 ProblemDetail 로 보낸다: { status, detail, code }
    const data = await res.json()
    if (data?.detail) message = data.detail
    else if (data?.message) message = data.message
    if (typeof data?.code === 'string') code = data.code
  } catch {
    /* 본문 없음 */
  }
  return new ApiError(res.status, message, code)
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type Query = Record<string, string | number | boolean | undefined | null>

const withQuery = (path: string, query?: Query) => {
  if (!query) return path
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `${path}?${s}` : path
}

export async function request<T>(
  method: Method,
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const token = tokenStore.get()
  const isForm = opts.body instanceof FormData
  let res: Response
  try {
    res = await fetch(withQuery(path, opts.query), {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      },
      body:
        opts.body === undefined
          ? undefined
          : isForm
            ? (opts.body as FormData)
            : JSON.stringify(opts.body),
    })
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다.')
  }
  if (!res.ok) throw await readError(res, `요청에 실패했습니다 (HTTP ${res.status})`)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** 파일 받기 (인증 헤더가 필요해서 a href 로 열 수 없다) */
export async function requestBlob(path: string): Promise<Blob> {
  const token = tokenStore.get()
  let res: Response
  try {
    res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다.')
  }
  if (!res.ok) throw await readError(res, `파일을 받지 못했습니다 (HTTP ${res.status})`)
  return res.blob()
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
