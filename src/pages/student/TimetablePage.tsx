// REG-04 시간표 조회
import { useState } from 'react'
import { studentApi } from '../../api'
import { Timetable } from '../../components/Timetable'
import { ErrorBox, Loading, PageHeader, SemesterSelect, Stat } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatSlots } from '../../lib/format'

export default function TimetablePage() {
  // 처음에는 학기를 비워서 보낸다: 서버가 신청 대상 학기(없으면 현재 학기)로 정한다
  const [semNo, setSemNo] = useState<number | null>(null)
  const { data, error, loading, reload } = useAsync(
    () => studentApi.timetable(semNo ?? undefined),
    [semNo],
  )
  // 온라인 칸은 강의실이 없어 격자 아래에 따로 모아 보여 준다
  const online = (data?.lectures ?? [])
    .map((l) => ({ l, slots: l.timeSlots.filter((t) => t.clsType === 'ONLINE') }))
    .filter((x) => x.slots.length > 0)

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
            <Stat label="총 신청 학점" value={`${data.totalCredits}학점`} sub="채플 포함" />
          </div>
          <Timetable lectures={data.lectures} />
          {online.length > 0 && (
            <section className="card">
              <h2>온라인 수업</h2>
              <ul className="plain-list">
                {online.map(({ l, slots }) => (
                  <li key={l.lecNo}>
                    <b>{l.crsNm}</b> ({l.sectNo}분반) · {formatSlots(slots)} · {l.profNm}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  )
}
