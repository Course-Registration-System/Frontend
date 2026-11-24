// REG-02 장바구니, REG-03 장바구니에서 신청
import { useState } from 'react'
import { Link } from 'react-router'
import { studentApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/Toast'
import { Badge, Empty, ErrorBox, Loading, Notice, PageHeader, Stat } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatRooms, formatTimes } from '../../lib/format'
import { studentActions } from '../../lib/period'
import type { Lecture } from '../../types'

const overlap = (a: Lecture, b: Lecture) =>
  a.times.some((x) =>
    b.times.some(
      (y) => x.day === y.day && x.startPeriod <= y.endPeriod && y.startPeriod <= x.endPeriod,
    ),
  )

export default function CartPage() {
  const { period } = useAuth()
  const toast = useToast()
  const can = studentActions(period)
  const [busy, setBusy] = useState<number | null>(null)
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([studentApi.cart(), studentApi.maxCredits(), studentApi.enrollments()]),
    [],
  )

  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  if (!data) return null
  const [cart, { maxCredits }, enrolled] = data

  // 예상 학점 = 이미 신청한 강의 + 장바구니 (채플 제외)
  const enrolledLectures = enrolled.map((e) => e.lecture)
  const creditOf = (ls: Lecture[]) =>
    ls.filter((l) => l.category !== '채플').reduce((s, l) => s + l.credits, 0)
  const expected = creditOf(cart) + creditOf(enrolledLectures)
  const over = maxCredits != null && expected > maxCredits

  // 시간 중복 경고: 장바구니끼리, 또는 이미 신청한 강의와
  const clashes = new Map<number, string[]>()
  const all = [...cart, ...enrolledLectures]
  for (const a of cart)
    for (const b of all)
      if (a.lecNo !== b.lecNo && overlap(a, b))
        clashes.set(a.lecNo, [...(clashes.get(a.lecNo) ?? []), `${b.courseName}(${b.section})`])

  const act = async (lecNo: number, fn: () => Promise<unknown>, ok: string) => {
    setBusy(lecNo)
    try {
      await fn()
      toast(ok)
      await reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader title="장바구니" desc="담아 둔 강의를 확인하고 수강신청 기간에 신청합니다." />
      <div className="stats">
        <Stat
          label="예상 학점 (채플 제외)"
          value={<span className={over ? 'text-danger' : ''}>{expected}학점</span>}
          sub={`장바구니 ${creditOf(cart)} + 신청 완료 ${creditOf(enrolledLectures)}`}
        />
        <Stat label="최대 신청 학점" value={maxCredits != null ? `${maxCredits}학점` : '미산정'} />
        <Stat label="담은 강의" value={`${cart.length}개`} />
      </div>
      {over && (
        <Notice kind="warn">
          예상 학점이 최대 신청 학점({maxCredits}학점)을 넘습니다. 모두 신청할 수는 없습니다.
        </Notice>
      )}
      {clashes.size > 0 && (
        <Notice kind="warn">
          시간이 겹치는 강의가 있습니다. 같은 시간대는 하나만 신청할 수 있습니다.
        </Notice>
      )}
      {!can.cartEnroll && !can.cartRemove && (
        <Notice>지금은 장바구니·수강신청 기간이 아니라 조회만 할 수 있습니다.</Notice>
      )}

      {cart.length === 0 ? (
        <Empty>
          장바구니가 비어 있습니다. <Link to="/student/lectures">강의 검색</Link>에서 담아 보세요.
        </Empty>
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
                <th className="num">잔여</th>
                <th>경고</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cart.map((l) => {
                const left = l.capacity - l.enrolledCount
                return (
                  <tr key={l.lecNo} className={clashes.has(l.lecNo) ? 'row-warn' : ''}>
                    <td className="mono">{l.courseCode}</td>
                    <td>{l.courseName}</td>
                    <td>{l.section}</td>
                    <td className="num">{l.credits}</td>
                    <td>{l.category}</td>
                    <td>{l.professorName}</td>
                    <td>{formatTimes(l.times)}</td>
                    <td>{formatRooms(l.times)}</td>
                    <td className="num">{left <= 0 ? <Badge tone="red">마감</Badge> : left}</td>
                    <td className="small">
                      {clashes.has(l.lecNo) && (
                        <span className="text-warn">
                          시간 중복: {clashes.get(l.lecNo)!.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="row-actions">
                      <button
                        className="btn btn-sm"
                        disabled={!can.cartRemove || busy === l.lecNo}
                        onClick={() =>
                          act(
                            l.lecNo,
                            () => studentApi.removeFromCart(l.lecNo),
                            '장바구니에서 뺐습니다.',
                          )
                        }
                      >
                        삭제
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={!can.cartEnroll || busy === l.lecNo}
                        onClick={() =>
                          act(
                            l.lecNo,
                            () => studentApi.enroll(l.lecNo),
                            `${l.courseName} 신청 완료`,
                          )
                        }
                      >
                        신청
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
