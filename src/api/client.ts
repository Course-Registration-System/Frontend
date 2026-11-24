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

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
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
  // npm run dev:mock 일 때만 목 서버로 보낸다. 일반 빌드에서는 이 분기와 목 코드가 빠진다.
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { mockRequest } = await import('../mock/server')
    return mockRequest<T>(method, path, opts)
  }
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
  if (!res.ok) {
    let message = `요청에 실패했습니다 (HTTP ${res.status})`
    try {
      // 백엔드는 ProblemDetail 로 보낸다: { status, detail, code }
      const data = await res.json()
      if (data?.detail) message = data.detail
      else if (data?.message) message = data.message
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** 파일 받기 (인증 헤더가 필요해서 a href 로 열 수 없다) */
export async function requestBlob(path: string): Promise<Blob> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { mockBlob } = await import('../mock/server')
    return mockBlob(path)
  }
  const token = tokenStore.get()
  let res: Response
  try {
    res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다.')
  }
  if (!res.ok) {
    let message = `파일을 받지 못했습니다 (HTTP ${res.status})`
    try {
      const data = await res.json()
      if (data?.detail) message = data.detail
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, message)
  }
  return res.blob()
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
