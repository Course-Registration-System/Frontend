import { DAYS, DAY_LABEL, PERIODS, periodStart } from '../lib/format'
import type { Lecture } from '../types'

const COLORS = 8

/** 주간 시간표 격자. 과목명·강의실·교수명 표시 */
export function Timetable({ lectures }: { lectures: Lecture[] }) {
  const days = lectures.some((l) => l.times.some((t) => t.day === 'SAT')) ? DAYS : DAYS.slice(0, 5)
  const maxPeriod = Math.max(9, ...lectures.flatMap((l) => l.times.map((t) => t.endPeriod)))
  const periods = PERIODS.filter((p) => p <= maxPeriod)
  const colorOf = new Map(lectures.map((l, i) => [l.lecNo, i % COLORS]))

  return (
    <div className="tt-wrap">
      <div
        className="tt"
        style={{
          gridTemplateColumns: `56px repeat(${days.length}, minmax(96px, 1fr))`,
          gridTemplateRows: `32px repeat(${periods.length}, 56px)`,
        }}
      >
        <div className="tt-corner" />
        {days.map((d, i) => (
          <div key={d} className="tt-day" style={{ gridColumn: i + 2, gridRow: 1 }}>
            {DAY_LABEL[d]}
          </div>
        ))}
        {periods.map((p) => (
          <div key={p} className="tt-period" style={{ gridColumn: 1, gridRow: p + 1 }}>
            <b>{p}</b>
            <small>{periodStart(p)}</small>
          </div>
        ))}
        {periods.map((p) =>
          days.map((d, i) => (
            <div
              key={`${d}${p}`}
              className="tt-cell"
              style={{ gridColumn: i + 2, gridRow: p + 1 }}
            />
          )),
        )}
        {lectures.flatMap((l) =>
          l.times
            .filter((t) => days.includes(t.day))
            .map((t, k) => (
              <div
                key={`${l.lecNo}-${k}`}
                className={`tt-block c${colorOf.get(l.lecNo)}`}
                style={{
                  gridColumn: days.indexOf(t.day) + 2,
                  gridRow: `${t.startPeriod + 1} / ${t.endPeriod + 2}`,
                }}
                title={`${l.courseName} (${l.section}) ${t.room} ${l.professorName}`}
              >
                <b>{l.courseName}</b>
                <span>{t.room}</span>
                <span>{l.professorName}</span>
              </div>
            )),
        )}
      </div>
    </div>
  )
}
