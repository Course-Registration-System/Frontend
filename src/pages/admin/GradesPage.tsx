// GRD-02 성적 확정
import { useState } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import {
  Empty,
  ErrorBox,
  GradeStatusBadge,
  Loading,
  PageHeader,
  SemesterSelect,
  Stat,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import type { GradeStatus } from '../../types'

const FILTERS: { key: GradeStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'NOT_ENTERED', label: '미입력' },
  { key: 'IN_PROGRESS', label: '입력중' },
  { key: 'SUBMITTED', label: '제출' },
  { key: 'CONFIRMED', label: '확정' },
]

export default function AdminGradesPage() {
  const toast = useToast()
  const [semesterId, setSemesterId] = useState('')
  const [filter, setFilter] = useState<GradeStatus | 'ALL'>('ALL')
  const [busy, setBusy] = useState<number | null>(null)
  const { data, error, loading, reload } = useAsync(
    () => (semesterId ? adminApi.lectures(semesterId) : Promise.resolve(null)),
    [semesterId],
  )
  const open = (data ?? []).filter((l) => l.status === 'OPEN')
  const count = (s: GradeStatus) => open.filter((l) => l.gradeStatus === s).length
  const shown = open.filter((l) => filter === 'ALL' || l.gradeStatus === filter)

  const confirmGrades = async (lecNo: number, name: string) => {
    if (!confirm(`${name} 성적을 확정할까요? 확정 후에는 교수도 수정할 수 없습니다.`)) return
    setBusy(lecNo)
    try {
      await adminApi.confirmGrades(lecNo)
      toast('확정했습니다.')
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        title="성적 확정"
        desc="교수가 제출한 강의의 성적을 확정합니다. 확정된 성적만 학생에게 보입니다."
        actions={<SemesterSelect value={semesterId} onChange={setSemesterId} />}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="stats">
            <Stat label="미입력" value={count('NOT_ENTERED')} />
            <Stat label="입력중" value={count('IN_PROGRESS')} />
            <Stat label="제출 (확정 대기)" value={count('SUBMITTED')} />
            <Stat label="확정" value={count('CONFIRMED')} />
          </div>
          <div className="seg seg-lg">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={filter === f.key ? 'on' : ''}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <Empty>해당하는 강의가 없습니다.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>과목코드</th>
                    <th>과목명</th>
                    <th>분반</th>
                    <th>교수명</th>
                    <th className="num">수강 인원</th>
                    <th>성적상태</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((l) => (
                    <tr key={l.lecNo}>
                      <td className="mono">{l.courseCode}</td>
                      <td>{l.courseName}</td>
                      <td>{l.section}</td>
                      <td>{l.professorName}</td>
                      <td className="num">{l.enrolledCount}</td>
                      <td>
                        <GradeStatusBadge status={l.gradeStatus} />
                      </td>
                      <td className="row-actions">
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={l.gradeStatus !== 'SUBMITTED' || busy === l.lecNo}
                          onClick={() => confirmGrades(l.lecNo, `${l.courseName}(${l.section})`)}
                        >
                          확정
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
