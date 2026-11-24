import type { CurrentPeriod } from '../types'

/** 화면흐름도 4장: 기간별 학생 버튼 상태 */
export function studentActions(period: CurrentPeriod | null) {
  const t = period?.type ?? null
  return {
    searchAddCart: t === 'CART',
    searchEnroll: t === 'ADJUST',
    cartRemove: t === 'CART',
    cartEnroll: t === 'REGISTER' || t === 'ADJUST',
    cancel: t === 'REGISTER' || t === 'ADJUST',
  }
}
