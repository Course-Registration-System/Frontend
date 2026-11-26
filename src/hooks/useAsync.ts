import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, type ApiErrorCode, errorMessage } from '../api/client'

/** 비동기 조회 공통 훅. deps 가 바뀌면 다시 불러온다. errorCode 는 백엔드 오류 code (예: ROSTER_NOT_OPEN) */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const seq = useRef(0)

  const reload = useCallback(async () => {
    const my = ++seq.current
    setLoading(true)
    setError(null)
    setErrorCode(null)
    try {
      const d = await fnRef.current()
      if (my === seq.current) setData(d)
    } catch (e) {
      if (my === seq.current) {
        setError(errorMessage(e))
        setErrorCode(e instanceof ApiError ? (e.code ?? null) : null)
      }
    } finally {
      if (my === seq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, errorCode, loading, reload, setData }
}
