import type { CurrentPeriod, ScheduleResponse } from '../types'

/**
 * 학사일정과 서버 시각으로 지금 기간을 고른다 (버튼을 보여줄지 정하는 용도).
 * 시작 포함·종료 제외는 백엔드와 같다. 실제 허용 여부는 서버가 판단하고, 거절되면 사유를 그대로 보여준다.
 */
export function pickPeriod(semNo: number, schedules: ScheduleResponse[], now: Date): CurrentPeriod {
  const t = now.getTime()
  const s = schedules.find(
    (x) =>
      x.schdType !== 'GRADE' &&
      new Date(x.startDtm).getTime() <= t &&
      t < new Date(x.endDtm).getTime(),
  )
  return {
    semNo,
    type: (s?.schdType as CurrentPeriod['type']) ?? null,
    startDtm: s?.startDtm,
    endDtm: s?.endDtm,
  }
}

/** 지금 기간에 학생 화면에서 보여줄 버튼 (REG-02, REG-03) */
export function studentActions(period: CurrentPeriod | null) {
  const t = period?.type ?? null
  const enrollOpen = t === 'ENROLL' || t === 'ADJUST'
  return { cart: t === 'CART', enroll: enrollOpen, cancel: enrollOpen }
}
