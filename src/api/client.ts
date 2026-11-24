// 백엔드 호출 공통 함수.
// VITE_USE_MOCK 이 'false' 가 아니면 src/mock 의 인메모리 서버가 같은 경로를 처리한다.

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

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
type Query = Record<string, string | number | undefined | null>

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
  const url = withQuery(path, opts.query)
  const token = tokenStore.get()

  if (USE_MOCK) {
    const { mockFetch } = await import('../mock/server')
    return mockFetch<T>(method, url, opts.body, token)
  }

  const isForm = opts.body instanceof FormData
  const res = await fetch(url, {
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
  if (!res.ok) {
    let message = `요청에 실패했습니다 (HTTP ${res.status})`
    try {
      const data = await res.json()
      if (data?.message) message = data.message
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
