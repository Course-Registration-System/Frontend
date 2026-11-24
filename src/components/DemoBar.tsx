// 목 서버 모드에서만 보이는 데모 도구: 오늘 날짜를 바꿔 기간별 동작을 확인한다
import { useState } from 'react'
import { mockControl } from '../mock/server'
import { PERIOD_LABEL } from '../lib/format'

const mid = (a: string, b: string) => {
  const d = new Date((Date.parse(a) + Date.parse(b)) / 2)
  return d.toISOString().slice(0, 10)
}
const addDays = (s: string, n: number) => {
  const d = new Date(Date.parse(s) + n * 86400000)
  return d.toISOString().slice(0, 10)
}

export default function DemoBar() {
  const [today, setToday] = useState(mockControl.today())
  const presets: { label: string; date: string }[] = []
  for (const s of mockControl.schedules()) {
    presets.push({ label: PERIOD_LABEL[s.type], date: mid(s.startDate, s.endDate) })
    if (s.type === 'ADJUST')
      presets.push({ label: '정정 후 학기 중', date: addDays(s.endDate, 14) })
  }
  const apply = (d: string) => {
    mockControl.setToday(d)
    setToday(d)
    window.location.reload()
  }
  return (
    <div className="demobar">
      <span className="demobar-tag">목 서버</span>
      <label>
        오늘 날짜
        <input
          type="date"
          value={today}
          onChange={(e) => e.target.value && apply(e.target.value)}
        />
      </label>
      <span className="demobar-presets">
        {presets
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((p) => (
            <button
              key={p.label}
              className={`chip ${p.date === today ? 'on' : ''}`}
              onClick={() => apply(p.date)}
            >
              {p.label}
            </button>
          ))}
      </span>
      <button
        className="chip"
        onClick={() => {
          if (confirm('데모 데이터를 처음 상태로 되돌릴까요?')) {
            mockControl.reset()
            window.location.reload()
          }
        }}
      >
        데이터 초기화
      </button>
    </div>
  )
}
