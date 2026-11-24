// REG-04 시간표 조회
import { useState } from 'react'
import { studentApi } from '../../api'
import { Timetable } from '../../components/Timetable'
import { ErrorBox, Loading, PageHeader, SemesterSelect, Stat } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'

export default function TimetablePage() {
  // 처음에는 학기를 비워서 보낸다: 서버가 신청 대상 학기(없으면 현재 학기)로 정한다
  const [semNo, setSemNo] = useState<number | null>(null)
  const { data, error, loading, reload } = useAsync(
    () => studentApi.timetable(semNo ?? undefined),
    [semNo],
  )

  return (
    <>
      <PageHeader
        title="시간표"
        actions={data && <SemesterSelect value={semNo ?? data.semNo} onChange={setSemNo} />}
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="stats">
            <Stat label="신청 강의" value={`${data.lectures.length}개`} />
            <Stat label="총 신청 학점" value={`${data.totalCredits}학점`} />
          </div>
          <Timetable lectures={data.lectures} />
        </>
      )}
    </>
  )
}
