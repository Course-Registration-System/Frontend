// REG-01 강의 검색 (학생): 장바구니 기간에는 담기, 정정 기간에는 바로 신청
import { useState } from 'react'
import { studentApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { LectureSearch } from '../../components/LectureSearch'
import { useToast } from '../../components/Toast'
import { Notice, PageHeader } from '../../components/ui'
import { PERIOD_LABEL } from '../../lib/format'
import { studentActions } from '../../lib/period'

export default function LectureSearchPage() {
  const { period } = useAuth()
  const toast = useToast()
  const can = studentActions(period)
  const [busy, setBusy] = useState<number | null>(null)

  const run = async (lecNo: number, fn: () => Promise<unknown>, ok: string, reload: () => void) => {
    setBusy(lecNo)
    try {
      await fn()
      toast(ok)
      reload()
    } catch (e) {
      // 차단 사유는 서버가 준 문구를 그대로 보여준다
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader title="강의 검색" desc="조건을 골라 이번 학기 개설 강의를 찾습니다." />
      <Notice>
        {period?.type ? (
          <>
            지금은 <b>{PERIOD_LABEL[period.type]} 기간</b>입니다 ({period.startDate} ~{' '}
            {period.endDate}). {can.searchAddCart && '검색 결과에서 장바구니에 담을 수 있습니다.'}
            {period.type === 'REGISTER' && '수강신청은 장바구니 화면에서 합니다.'}
            {can.searchEnroll && '검색 결과에서 바로 신청할 수 있습니다.'}
          </>
        ) : (
          '지금은 장바구니·수강신청 기간이 아니라 조회만 할 수 있습니다.'
        )}
      </Notice>
      <LectureSearch
        actions={(l, reload) => (
          <>
            <button
              className="btn btn-sm"
              disabled={!can.searchAddCart || busy === l.lecNo}
              onClick={() =>
                run(
                  l.lecNo,
                  () => studentApi.addToCart(l.lecNo),
                  `${l.courseName}을(를) 담았습니다.`,
                  reload,
                )
              }
            >
              담기
            </button>
            <button
              className="btn btn-sm btn-primary"
              disabled={!can.searchEnroll || busy === l.lecNo}
              onClick={() =>
                run(l.lecNo, () => studentApi.enroll(l.lecNo), `${l.courseName} 신청 완료`, reload)
              }
            >
              신청
            </button>
          </>
        )}
      />
    </>
  )
}
