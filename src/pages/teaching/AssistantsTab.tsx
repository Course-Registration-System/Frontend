// LEC-04 조교 지정 (교수만). 학번이 맞는지는 서버가 확인한다.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { teachingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Empty, ErrorBox, Loading, Notice } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import type { TeachingStudent } from '../../types'
import { useDetail } from './LectureDetailLayout'

export default function AssistantsTab() {
  const { lecNo, myRole } = useDetail()
  const toast = useToast()
  const { data, error, loading, reload, setData } = useAsync(
    () => teachingApi.assistants(lecNo),
    [lecNo],
  )
  const [stdNo, setStdNo] = useState('')
  const [busy, setBusy] = useState(false)

  if (myRole !== 'PROFESSOR') return <Notice>조교 관리는 담당 교수만 할 수 있습니다.</Notice>

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!stdNo.trim()) return
    setBusy(true)
    try {
      setData(await teachingApi.addAssistant(lecNo, stdNo.trim()))
      toast('조교를 지정했습니다.')
      setStdNo('')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (s: TeachingStudent) => {
    if (!confirm(`${s.usrNm} 학생을 조교에서 뺄까요?`)) return
    try {
      setData(await teachingApi.removeAssistant(lecNo, s.stdNo))
      toast('조교를 삭제했습니다.')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>조교 추가</h2>
        <form className="inline-form" onSubmit={add}>
          <input
            placeholder="학번"
            inputMode="numeric"
            value={stdNo}
            onChange={(e) => setStdNo(e.target.value)}
          />
          <button className="btn btn-primary" disabled={busy}>
            추가
          </button>
        </form>
      </section>

      <section className="card">
        <h2>조교 목록</h2>
        {error && <ErrorBox message={error} onRetry={reload} />}
        {loading && !data && <Loading />}
        {data &&
          (data.assistants.length === 0 ? (
            <Empty>지정된 조교가 없습니다.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>학번</th>
                  <th>이름</th>
                  <th>학과</th>
                  <th className="num">학년</th>
                  <th>이메일</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.assistants.map((s) => (
                  <tr key={s.stdNo}>
                    <td className="mono">{s.stdNo}</td>
                    <td>{s.usrNm}</td>
                    <td>{s.deptNm}</td>
                    <td className="num">{s.yrLvl}</td>
                    <td>{s.email ?? '-'}</td>
                    <td className="row-actions">
                      <button className="btn btn-sm btn-danger" onClick={() => remove(s)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </section>
    </div>
  )
}
