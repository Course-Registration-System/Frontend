// LEC-01 담당 강의 목록
import { useState } from 'react'
import { Link } from 'react-router'
import { teachingApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import {
  Badge,
  Empty,
  ErrorBox,
  GradeStatusBadge,
  LectureStatusBadge,
  Loading,
  PageHeader,
  SemesterSelect,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatRooms, formatTimes } from '../../lib/format'

export default function LectureListPage() {
  const { user } = useAuth()
  const [semesterId, setSemesterId] = useState('')
  const { data, error, loading, reload } = useAsync(
    () => (semesterId ? teachingApi.lectures(semesterId) : Promise.resolve(null)),
    [semesterId],
  )
  const isTA = user?.role === 'STUDENT'

  return (
    <>
      <PageHeader
        title="담당 강의 목록"
        desc={
          isTA
            ? '조교로 배정된 강의입니다.'
            : '담당하는 강의를 골라 수강생·계획서·조교·성적을 관리합니다.'
        }
        actions={<SemesterSelect value={semesterId} onChange={setSemesterId} />}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (data.length === 0 ? (
          <Empty>이 학기 담당 강의가 없습니다.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>과목명</th>
                  <th>분반</th>
                  <th>요일·시간</th>
                  <th>강의실</th>
                  <th className="num">정원</th>
                  <th className="num">수강 인원</th>
                  <th>강의상태</th>
                  <th>성적상태</th>
                </tr>
              </thead>
              <tbody>
                {data.map((l) => (
                  <tr key={l.lecNo} className={l.status === 'CLOSED' ? 'row-muted' : ''}>
                    <td>
                      {l.status === 'CLOSED' ? (
                        l.courseName
                      ) : (
                        <Link to={`/teaching/lectures/${l.lecNo}`}>{l.courseName}</Link>
                      )}{' '}
                      {l.gradingType === 'PF' && <Badge>P/F</Badge>}
                    </td>
                    <td>{l.section}</td>
                    <td>{formatTimes(l.times)}</td>
                    <td>{formatRooms(l.times)}</td>
                    <td className="num">{l.capacity}</td>
                    <td className="num">{l.enrolledCount}</td>
                    <td>
                      <LectureStatusBadge status={l.status} />
                    </td>
                    <td>{l.status === 'OPEN' && <GradeStatusBadge status={l.gradeStatus} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </>
  )
}
