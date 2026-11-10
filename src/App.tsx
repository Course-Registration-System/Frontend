import { useEffect, useState } from 'react'

type Health = { status: string; time: string }

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: Health) => setHealth(data))
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <main style={{ padding: '2rem' }}>
      <h1>수강신청 및 성적 관리 시스템</h1>
      <p>프론트엔드 초기 설정입니다.</p>
      <section>
        <h2>백엔드 연결 확인</h2>
        {health && (
          <p>
            상태: {health.status} / 서버 시각: {health.time}
          </p>
        )}
        {error && <p>연결 실패: {error} (백엔드가 8080 포트에서 실행 중인지 확인하세요)</p>}
        {!health && !error && <p>확인 중...</p>}
      </section>
    </main>
  )
}

export default App
