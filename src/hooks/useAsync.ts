import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../api/client'

/** 비동기 조회 공통 훅. deps 가 바뀌면 다시 불러온다 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const seq = useRef(0)

  const reload = useCallback(async () => {
    const my = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const d = await fnRef.current()
      if (my === seq.current) setData(d)
    } catch (e) {
      if (my === seq.current) setError(errorMessage(e))
    } finally {
      if (my === seq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, reload, setData }
}
