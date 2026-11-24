// ACA-04 대시보드 (조회 전용)
import { useState } from 'react'
import { Link } from 'react-router'
import { adminApi } from '../../api'
import { Empty, ErrorBox, Loading, PageHeader, SemesterSelect, Stat } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatTimes } from '../../lib/format'

export default function DashboardPage() {
  const [semesterId, setSemesterId] = useState('')
  const { data, error, loading, reload } = useAsync(
    () => (semesterId ? adminApi.dashboard(semesterId) : Promise.resolve(null)),
    [semesterId],
  )
  return (
    <>
      <PageHeader
        title="대시보드"
        actions={<SemesterSelect value={semesterId} onChange={setSemesterId} />}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="stats">
            <Stat
              label="개설 강의"
              value={`${data.openLectureCount}개`}
              sub={`폐강 ${data.closedLectureCount}개`}
            />
            <Stat label="총 수강신청" value={`${data.totalEnrollments}건`} />
            <Stat label="정원 마감 강의" value={`${data.fullLectures.length}개`} />
          </div>
          <section className="card">
            <h2>정원 마감 강의</h2>
            {data.fullLectures.length === 0 ? (
              <Empty>정원이 마감된 강의가 없습니다.</Empty>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>과목코드</th>
                    <th>과목명</th>
                    <th>분반</th>
                    <th>교수명</th>
                    <th>요일·시간</th>
                    <th className="num">정원</th>
                    <th className="num">신청</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fullLectures.map((l) => (
                    <tr key={l.lecNo}>
                      <td className="mono">{l.courseCode}</td>
                      <td>
                        <Link to={`/admin/enrollments?lecNo=${l.lecNo}`}>{l.courseName}</Link>
                      </td>
                      <td>{l.section}</td>
                      <td>{l.professorName}</td>
                      <td>{formatTimes(l.times)}</td>
                      <td className="num">{l.capacity}</td>
                      <td className="num">{l.enrolledCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  )
}
