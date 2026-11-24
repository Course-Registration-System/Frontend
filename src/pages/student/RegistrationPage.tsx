// REG-01 검색 탭 + REG-02 장바구니 + REG-03 수강신청·취소를 한 화면에서
import { useState } from 'react'
import { studentApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { LectureSearch, LectureTable } from '../../components/LectureSearch'
import { useToast } from '../../components/Toast'
import { Badge, Empty, ErrorBox, Loading, Notice, PageHeader, Stat } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { formatDateTime, SCHD_TYPE_LABEL } from '../../lib/format'
import { studentActions } from '../../lib/period'

type Tab = 'CART' | 'ENROLLED'

export default function RegistrationPage() {
  const { period } = useAuth()
  const toast = useToast()
  const can = studentActions(period)
  const [tab, setTab] = useState<Tab>(period?.type === 'CART' ? 'CART' : 'ENROLLED')
  const [busy, setBusy] = useState<number | null>(null)
  // 담기·신청·취소 뒤 검색 결과의 잔여 인원도 다시 불러오게 한다
  const [version, setVersion] = useState(0)

  // 신청 대상 학기가 없으면 서버가 409 를 준다
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([studentApi.cart(), studentApi.enrollments()]),
    [version],
  )
  const [cart, enrolled] = data ?? [null, null]
  const cartLecNos = new Set(cart?.items.map((i) => i.lecNo))
  const enrolledLecNos = new Set(enrolled?.map((e) => e.lecNo))
  const enrolledCredits = enrolled?.reduce((s, e) => s + Number(e.crdt), 0) ?? 0

  const run = async (lecNo: number, fn: () => Promise<unknown>, ok: string) => {
    setBusy(lecNo)
    try {
      await fn()
      toast(ok)
      setVersion((v) => v + 1)
    } catch (e) {
      // 차단 사유는 서버가 준 문구를 그대로 보여준다
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const addCart = (l: { lecNo: number; crsNm: string }) =>
    run(l.lecNo, () => studentApi.addToCart(l.lecNo), `${l.crsNm}을(를) 담았습니다.`)
  const enroll = (l: { lecNo: number; crsNm: string }) =>
    run(l.lecNo, () => studentApi.enroll(l.lecNo), `${l.crsNm} 신청 완료`)

  return (
    <>
      <PageHeader title="장바구니·수강신청" />

      <Notice>
        {period?.type ? (
          <>
            지금은 <b>{SCHD_TYPE_LABEL[period.type]} 기간</b>입니다 (
            {formatDateTime(period.startDtm)} ~ {formatDateTime(period.endDtm)}).
          </>
        ) : (
          '지금은 장바구니·수강신청 기간이 아니라 조회만 할 수 있습니다.'
        )}
      </Notice>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {cart && (
        <div className="stats">
          <Stat label="담은 학점 (채플 제외)" value={`${cart.cartCredits}학점`} />
          <Stat label="신청 학점" value={`${enrolledCredits}학점`} />
          <Stat label="수강 가능 학점" value={`${cart.maxCredit}학점`} />
        </div>
      )}

      <section className="card">
        <h2>강의 검색</h2>
        <LectureSearch
          reloadKey={version}
          actions={(l) => (
            <>
              {can.cart && (
                <button
                  className="btn btn-sm"
                  disabled={busy === l.lecNo || cartLecNos.has(l.lecNo)}
                  onClick={() => addCart(l)}
                >
                  {cartLecNos.has(l.lecNo) ? '담김' : '담기'}
                </button>
              )}
              {can.enroll && (
                <button
                  className="btn btn-sm btn-primary"
                  disabled={busy === l.lecNo || enrolledLecNos.has(l.lecNo)}
                  onClick={() => enroll(l)}
                >
                  {enrolledLecNos.has(l.lecNo) ? '신청됨' : '신청'}
                </button>
              )}
            </>
          )}
        />
      </section>

      <nav className="tabs tabs-buttons">
        <button className={`tab ${tab === 'CART' ? 'active' : ''}`} onClick={() => setTab('CART')}>
          장바구니 {cart && <span className="count">{cart.items.length}</span>}
        </button>
        <button
          className={`tab ${tab === 'ENROLLED' ? 'active' : ''}`}
          onClick={() => setTab('ENROLLED')}
        >
          수강신청 내역 {enrolled && <span className="count">{enrolled.length}</span>}
        </button>
      </nav>

      {loading && !data && <Loading />}

      {tab === 'CART' &&
        cart &&
        (cart.items.length === 0 ? (
          <Empty>장바구니가 비어 있습니다.</Empty>
        ) : (
          <LectureTable
            rows={cart.items.map((i) => ({ ...i, remaining: i.cap - i.enrlCnt }))}
            extra={[{ head: '순서', num: true, cell: (_, i) => i + 1 }]}
            actions={(l) => (
              <>
                <span className="muted small">담은 인원 {l.cartCnt}</span>
                {can.cart && (
                  <button
                    className="btn btn-sm"
                    disabled={busy === l.lecNo}
                    onClick={() =>
                      run(
                        l.lecNo,
                        () => studentApi.removeFromCart(l.lecNo),
                        '장바구니에서 뺐습니다.',
                      )
                    }
                  >
                    삭제
                  </button>
                )}
                {can.enroll && (
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={busy === l.lecNo || enrolledLecNos.has(l.lecNo)}
                    onClick={() => enroll(l)}
                  >
                    {enrolledLecNos.has(l.lecNo) ? '신청됨' : '신청'}
                  </button>
                )}
              </>
            )}
          />
        ))}

      {tab === 'ENROLLED' &&
        enrolled &&
        (enrolled.length === 0 ? (
          <Empty>신청한 강의가 없습니다.</Empty>
        ) : (
          <LectureTable
            rows={enrolled}
            actions={(e) => (
              <>
                {e.retake && <Badge tone="amber">재수강</Badge>}
                {can.cancel && (
                  <button
                    className="btn btn-sm btn-danger"
                    disabled={busy === e.lecNo}
                    onClick={() =>
                      confirm(`${e.crsNm} 신청을 취소할까요?`) &&
                      run(e.lecNo, () => studentApi.cancel(e.lecNo), '신청을 취소했습니다.')
                    }
                  >
                    취소
                  </button>
                )}
              </>
            )}
          />
        ))}
    </>
  )
}
