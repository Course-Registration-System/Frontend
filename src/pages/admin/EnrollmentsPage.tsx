// REG-05 수강신청 현황, 직권 추가·취소
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import {
  Badge,
  Empty,
  ErrorBox,
  Loading,
  Notice,
  PageHeader,
  SemesterSelect,
  Stat,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatTimes } from '../../lib/format'

export default function AdminEnrollmentsPage() {
  const [semesterId, setSemesterId] = useState('')
  const [params, setParams] = useSearchParams()
  const lecNo = Number(params.get('lecNo')) || null
  const lectures = useAsync(
    () => (semesterId ? adminApi.lectures(semesterId) : Promise.resolve(null)),
    [semesterId],
  )
  const open = (lectures.data ?? []).filter((l) => l.status === 'OPEN')

  return (
    <>
      <PageHeader
        title="수강신청 현황"
        desc="강의를 골라 신청 현황을 보고, 정정 기간까지 직권으로 추가·취소합니다."
        actions={<SemesterSelect value={semesterId} onChange={setSemesterId} />}
      />
      <div className="filters">
        <label className="grow">
          강의
          <select
            value={lecNo ?? ''}
            onChange={(e) => setParams(e.target.value ? { lecNo: e.target.value } : {})}
          >
            <option value="">강의를 고르세요</option>
            {open.map((l) => (
              <option key={l.lecNo} value={l.lecNo}>
                {l.courseCode} {l.courseName} ({l.section}) · {l.professorName} · {l.enrolledCount}/
                {l.capacity}
              </option>
            ))}
          </select>
        </label>
      </div>
      {lectures.error && <ErrorBox message={lectures.error} onRetry={lectures.reload} />}
      {lecNo ? (
        <Status lecNo={lecNo} onChanged={lectures.reload} />
      ) : (
        <Empty>강의를 고르면 신청 현황이 보입니다.</Empty>
      )}
    </>
  )
}

function Status({ lecNo, onChanged }: { lecNo: number; onChanged: () => void }) {
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(() => adminApi.enrollmentStatus(lecNo), [lecNo])
  const [studentNo, setStudentNo] = useState('')
  const [busy, setBusy] = useState(false)

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  if (!data) return null
  const l = data.lecture

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast(ok)
      await reload()
      onChanged()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }
  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!studentNo.trim()) return
    act(() => adminApi.forceEnroll(lecNo, studentNo.trim()), '직권 추가했습니다.').then(() =>
      setStudentNo(''),
    )
  }

  return (
    <div className="stack">
      <div className="stats">
        <Stat
          label="강의"
          value={`${l.courseName} (${l.section})`}
          sub={`${l.professorName} · ${formatTimes(l.times)}`}
        />
        <Stat label="정원" value={l.capacity} />
        <Stat label="신청 인원" value={l.enrolledCount} />
        <Stat
          label="잔여 인원"
          value={
            l.capacity - l.enrolledCount <= 0 ? (
              <span className="text-danger">마감</span>
            ) : (
              l.capacity - l.enrolledCount
            )
          }
        />
      </div>
      {data.editable ? (
        <section className="card">
          <h2>직권 추가</h2>
          <p className="muted small">
            정원·시간 중복·최대학점 검사 없이 추가합니다. 같은 과목 중복과 재수강 조건은 검사합니다.
          </p>
          <form className="inline-form" onSubmit={add}>
            <input
              placeholder="학번"
              value={studentNo}
              onChange={(e) => setStudentNo(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy}>
              추가
            </button>
          </form>
        </section>
      ) : (
        <Notice>정정 기간이 끝나 조회만 할 수 있습니다.</Notice>
      )}
      {data.students.length === 0 ? (
        <Empty>신청한 학생이 없습니다.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>학번</th>
                <th>이름</th>
                <th>학과</th>
                <th className="num">학년</th>
                <th>비고</th>
                {data.editable && <th />}
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.enrollmentId}>
                  <td className="mono">{s.studentNo}</td>
                  <td>{s.name}</td>
                  <td>{s.deptName}</td>
                  <td className="num">{s.grade}</td>
                  <td>{s.isRetake && <Badge tone="amber">재수강</Badge>}</td>
                  {data.editable && (
                    <td className="row-actions">
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={busy}
                        onClick={() =>
                          confirm(`${s.name}(${s.studentNo})의 신청을 직권 취소할까요?`) &&
                          act(() => adminApi.forceCancel(s.enrollmentId), '직권 취소했습니다.')
                        }
                      >
                        취소
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
