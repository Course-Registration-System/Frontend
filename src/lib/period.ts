import type { CurrentPeriod, ScheduleResponse, SemesterResponse } from '../types'

/**
 * 학사일정과 서버 시각으로 지금 기간을 고른다 (버튼을 보여줄지 정하는 용도).
 * 시작 포함·종료 제외는 백엔드와 같다. 실제 허용 여부는 서버가 판단하고, 거절되면 사유를 그대로 보여준다.
 */
export function pickPeriod(
  semNo: number,
  schedules: ScheduleResponse[],
  now: Date,
  semesters: SemesterResponse[] = [],
  currentSchedules: ScheduleResponse[] = [],
): CurrentPeriod {
  const t = now.getTime()
  const inRange = (x: ScheduleResponse) =>
    new Date(x.startDtm).getTime() <= t && t < new Date(x.endDtm).getTime()
  const sem = semesters.find((x) => x.semNo === semNo)
  const s = schedules.find((x) => x.schdType !== 'GRADE' && inRange(x))
  // 현재 학기(신청 대상 학기와 다를 때)의 성적입력 기간도 함께 알려 준다
  const cur = semesters.find((x) => x.current && x.semNo !== semNo)
  const grading =
    cur &&
    currentSchedules.some((x) => x.semNo === cur.semNo && x.schdType === 'GRADE' && inRange(x))
  return {
    semNo,
    semester: sem ? { yr: sem.yr, semType: sem.semType } : undefined,
    gradeSemester: grading ? { yr: cur.yr, semType: cur.semType } : undefined,
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
