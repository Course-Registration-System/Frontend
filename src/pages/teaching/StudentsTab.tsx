// LEC-02 수강생 명단 (정정 기간 종료 후)
import { teachingApi } from '../../api'
import { Empty, ErrorBox, Loading, Notice } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useDetail } from './LectureDetailLayout'

export default function StudentsTab() {
  const { detail } = useDetail()
  const lecNo = detail.lecture.lecNo
  const { data, error, loading, reload } = useAsync(
    () => (detail.studentsViewable ? teachingApi.students(lecNo) : Promise.resolve(null)),
    [lecNo, detail.studentsViewable],
  )

  if (!detail.studentsViewable)
    return <Notice>수강생 명단은 정정 기간이 끝난 뒤에 볼 수 있습니다.</Notice>
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  if (!data) return null
  if (data.length === 0) return <Empty>수강생이 없습니다.</Empty>

  return (
    <>
      <p className="muted small">총 {data.length}명</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>학번</th>
              <th>이름</th>
              <th>학과</th>
              <th className="num">학년</th>
              <th>이메일</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.studentNo}>
                <td className="mono">{s.studentNo}</td>
                <td>{s.name}</td>
                <td>{s.deptName}</td>
                <td className="num">{s.grade}</td>
                <td>
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
