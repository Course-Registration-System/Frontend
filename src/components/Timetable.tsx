import { DOW_LABEL, DOWS, hm, placeOf } from '../lib/format'
import type { EnrollmentResponse } from '../types'

const COLORS = 8
const SLOT = 30 // 분 단위 한 칸

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
const fmt = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** REG-04 주간 시간표 격자. 과목명·장소(온라인·미배정 표시)·교수명 */
export function Timetable({ lectures }: { lectures: EnrollmentResponse[] }) {
  const all = lectures.flatMap((l) => l.timeSlots)
  const days = DOWS.filter(
    (d, i) => i < 5 || all.some((t) => t.dow === d), // 토·일은 수업이 있을 때만
  )
  const start = Math.min(9 * 60, ...all.map((t) => Math.floor(toMin(t.startTm) / 60) * 60))
  const end = Math.max(18 * 60, ...all.map((t) => Math.ceil(toMin(t.endTm) / 60) * 60))
  const slots = (end - start) / SLOT
  const colorOf = new Map(lectures.map((l, i) => [l.lecNo, i % COLORS]))
  const row = (min: number) => Math.round((min - start) / SLOT) + 2

  return (
    <div className="tt-wrap">
      <div
        className="tt"
        style={{
          gridTemplateColumns: `56px repeat(${days.length}, minmax(96px, 1fr))`,
          gridTemplateRows: `32px repeat(${slots}, 26px)`,
        }}
      >
        <div className="tt-corner" />
        {days.map((d, i) => (
          <div key={d} className="tt-day" style={{ gridColumn: i + 2, gridRow: 1 }}>
            {DOW_LABEL[d]}
          </div>
        ))}
        {Array.from({ length: slots }, (_, s) => {
          const min = start + s * SLOT
          return (
            <div key={s} className="tt-period" style={{ gridColumn: 1, gridRow: s + 2 }}>
              {min % 60 === 0 && <small>{fmt(min)}</small>}
            </div>
          )
        })}
        {Array.from({ length: slots }, (_, s) =>
          days.map((d, i) => (
            <div
              key={`${d}${s}`}
              className={`tt-cell ${s % 2 ? 'half' : ''}`}
              style={{ gridColumn: i + 2, gridRow: s + 2 }}
            />
          )),
        )}
        {lectures.flatMap((l) =>
          l.timeSlots
            .filter((t) => days.includes(t.dow))
            .map((t, k) => (
              <div
                key={`${l.lecNo}-${k}`}
                className={`tt-block c${colorOf.get(l.lecNo)}`}
                style={{
                  gridColumn: days.indexOf(t.dow) + 2,
                  gridRow: `${row(toMin(t.startTm))} / ${row(toMin(t.endTm))}`,
                }}
                title={`${l.crsNm} (${l.sectNo}) ${hm(t.startTm)}-${hm(t.endTm)} ${placeOf(t)} ${l.profNm}`}
              >
                <b>{l.crsNm}</b>
                <span>{placeOf(t)}</span>
                <span>{l.profNm}</span>
              </div>
            )),
        )}
      </div>
    </div>
  )
}
