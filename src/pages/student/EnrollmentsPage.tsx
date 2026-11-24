// REG-03 수강신청 내역
import { useState } from 'react'
import { studentApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import {
  Badge,
  Empty,
  ErrorBox,
  Loading,
  PageHeader,
  SemesterSelect,
  Stat,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatRooms, formatTimes } from '../../lib/format'
import { studentActions } from '../../lib/period'

export default function EnrollmentsPage() {
  const { period } = useAuth()
  const toast = useToast()
  const [semesterId, setSemesterId] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const { data, error, loading, reload } = useAsync(
    () => (semesterId ? studentApi.enrollments(semesterId) : Promise.resolve(null)),
    [semesterId],
  )
  const isCurrent = semesterId === period?.semesterId
  const canCancel = isCurrent && studentActions(period).cancel

  const cancel = async (id: number, name: string) => {
    if (!confirm(`${name} 신청을 취소할까요?`)) return
    setBusy(id)
    try {
      await studentApi.cancel(id)
      toast('신청을 취소했습니다.')
      await reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const list = data ?? []
  return (
    <>
      <PageHeader
        title="수강신청 내역"
        desc="신청한 강의 목록입니다. 수강신청·정정 기간에만 취소할 수 있습니다."
        actions={<SemesterSelect value={semesterId} onChange={setSemesterId} />}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="stats">
            <Stat label="신청 강의" value={`${list.length}개`} />
            <Stat
              label="신청 학점"
              value={`${list.reduce((s, e) => s + e.lecture.credits, 0)}학점`}
            />
          </div>
          {list.length === 0 ? (
            <Empty>신청한 강의가 없습니다.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>과목코드</th>
                    <th>과목명</th>
                    <th>분반</th>
                    <th className="num">학점</th>
                    <th>이수구분</th>
                    <th>교수명</th>
                    <th>요일·시간</th>
                    <th>강의실</th>
                    <th>비고</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ enrollmentId, lecture: l, isRetake }) => (
                    <tr key={enrollmentId}>
                      <td className="mono">{l.courseCode}</td>
                      <td>{l.courseName}</td>
                      <td>{l.section}</td>
                      <td className="num">{l.credits}</td>
                      <td>{l.category}</td>
                      <td>{l.professorName}</td>
                      <td>{formatTimes(l.times)}</td>
                      <td>{formatRooms(l.times)}</td>
                      <td>{isRetake && <Badge tone="amber">재수강</Badge>}</td>
                      <td className="row-actions">
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={!canCancel || busy === enrollmentId}
                          onClick={() => cancel(enrollmentId, l.courseName)}
                        >
                          취소
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
