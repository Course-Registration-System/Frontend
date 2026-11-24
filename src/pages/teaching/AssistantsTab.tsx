// LEC-04 조교 지정 (교수만)
import { useState } from 'react'
import type { FormEvent } from 'react'
import { teachingApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Empty, ErrorBox, Loading, Notice } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import type { RosterStudent } from '../../types'
import { useDetail } from './LectureDetailLayout'

export default function AssistantsTab() {
  const { detail } = useDetail()
  const toast = useToast()
  const lecNo = detail.lecture.lecNo
  const { data, error, loading, reload } = useAsync(() => teachingApi.assistants(lecNo), [lecNo])
  const [studentNo, setStudentNo] = useState('')
  const [found, setFound] = useState<RosterStudent | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (detail.myRole !== 'PROFESSOR') return <Notice>조교 관리는 담당 교수만 할 수 있습니다.</Notice>

  const search = async (e: FormEvent) => {
    e.preventDefault()
    setFound(null)
    setSearchError(null)
    if (!studentNo.trim()) return
    try {
      setFound(await teachingApi.findStudent(studentNo.trim()))
    } catch (err) {
      setSearchError(errorMessage(err))
    }
  }

  const add = async () => {
    if (!found) return
    setBusy(true)
    try {
      await teachingApi.addAssistant(lecNo, found.studentNo)
      toast(`${found.name} 학생을 조교로 지정했습니다.`)
      setFound(null)
      setStudentNo('')
      await reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (s: RosterStudent) => {
    if (!confirm(`${s.name} 학생을 조교에서 뺄까요?`)) return
    try {
      await teachingApi.removeAssistant(lecNo, s.studentNo)
      toast('조교를 삭제했습니다.')
      await reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>조교 추가</h2>
        <form className="inline-form" onSubmit={search}>
          <input
            placeholder="학번"
            value={studentNo}
            onChange={(e) => setStudentNo(e.target.value)}
          />
          <button className="btn">검색</button>
        </form>
        {searchError && <p className="form-error">{searchError}</p>}
        {found && (
          <div className="found">
            <span>
              <b>{found.name}</b> · {found.studentNo} · {found.deptName} {found.grade}학년
            </span>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={add}>
              추가
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>조교 목록</h2>
        {error && <ErrorBox message={error} onRetry={reload} />}
        {loading && !data && <Loading />}
        {data &&
          (data.length === 0 ? (
            <Empty>지정된 조교가 없습니다.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>학번</th>
                  <th>이름</th>
                  <th>학과</th>
                  <th>이메일</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.studentNo}>
                    <td className="mono">{s.studentNo}</td>
                    <td>{s.name}</td>
                    <td>{s.deptName}</td>
                    <td>{s.email}</td>
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
