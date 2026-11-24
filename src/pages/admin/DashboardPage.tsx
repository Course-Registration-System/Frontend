// ACA-04 대시보드 조회 (조회 전용)
import { useState } from 'react'
import { Link } from 'react-router'
import { adminApi } from '../../api'
import { Empty, ErrorBox, Loading, PageHeader, SemesterSelect, Stat } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'

export default function DashboardPage() {
  // 처음에는 비워서 보낸다: 서버가 신청 대상 학기(없으면 현재 학기)로 정한다
  const [semNo, setSemNo] = useState<number | null>(null)
  const { data, error, loading, reload } = useAsync(
    () => adminApi.dashboard(semNo ?? undefined),
    [semNo],
  )
  return (
    <>
      <PageHeader
        title="대시보드"
        actions={data && <SemesterSelect value={semNo ?? data.semNo} onChange={setSemNo} />}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="stats">
            <Stat label="개설 강의" value={`${data.openLectureCount}개`} />
            <Stat label="정원 마감 강의" value={`${data.fullLectures.length}개`} />
            <Stat
              label="강의실 미배정 강의"
              value={
                <Link
                  to="/admin/lectures"
                  className={data.unassignedLectureCount ? 'text-warn' : ''}
                >
                  {data.unassignedLectureCount}개
                </Link>
              }
            />
            <Stat label="강의계획서 미제출" value={`${data.missingPlanLectures.length}개`} />
          </div>

          <div className="stack">
            <section className="card">
              <h2>정원 마감 강의</h2>
              {data.fullLectures.length === 0 ? (
                <Empty>정원이 마감된 강의가 없습니다.</Empty>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>과목명</th>
                        <th>분반</th>
                        <th>교수명</th>
                        <th className="num">정원</th>
                        <th className="num">신청</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.fullLectures.map((l) => (
                        <tr key={l.lecNo}>
                          <td>
                            <Link to={`/admin/enrollments?lecNo=${l.lecNo}`}>{l.crsNm}</Link>
                          </td>
                          <td>{l.sectNo}</td>
                          <td>{l.profNm}</td>
                          <td className="num">{l.cap}</td>
                          <td className="num">{l.enrlCnt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <h2>강의계획서 미제출 강의</h2>
              {data.missingPlanLectures.length === 0 ? (
                <Empty>미제출 강의가 없습니다.</Empty>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>과목명</th>
                        <th>분반</th>
                        <th>담당 교수</th>
                        <th>이메일</th>
                        <th>미제출 항목</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.missingPlanLectures.map((l) => (
                        <tr key={l.lecNo}>
                          <td>{l.crsNm}</td>
                          <td>{l.sectNo}</td>
                          <td>{l.profNm}</td>
                          <td>
                            {l.profEmail ? (
                              <a href={`mailto:${l.profEmail}`}>{l.profEmail}</a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="small">
                            {[l.noPlanFile && '계획서 파일', l.noWeights && '반영 비율']
                              .filter(Boolean)
                              .join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
