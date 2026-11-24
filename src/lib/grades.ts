import type { GradingType, LetterGrade, Ratios, Scores } from '../types'

export const LETTERS: LetterGrade[] = ['A+', 'A0', 'B+', 'B0', 'C+', 'C0', 'D+', 'D0', 'F']

const POINT: Record<LetterGrade, number | null> = {
  'A+': 4.5,
  A0: 4.0,
  'B+': 3.5,
  B0: 3.0,
  'C+': 2.5,
  C0: 2.0,
  'D+': 1.5,
  D0: 1.0,
  F: 0,
  P: null,
}
export const pointOf = (l: LetterGrade, gradingType: GradingType = 'GRADE') =>
  gradingType === 'PF' ? null : POINT[l]

/** 등급 a 가 b 이상인지 */
export const gradeAtLeast = (a: LetterGrade, b: LetterGrade) => {
  if (a === 'P') return true
  return LETTERS.indexOf(a) <= LETTERS.indexOf(b)
}

export const totalScore = (s: Scores, r: Ratios): number | null => {
  if (s.midterm == null || s.final == null || s.assignment == null || s.attendance == null)
    return null
  const t =
    (s.midterm * r.midterm +
      s.final * r.final +
      s.assignment * r.assignment +
      s.attendance * r.attendance) /
    100
  return Math.round(t * 10) / 10
}

// 등급 구간 (가정: 95/90/85/80/75/70/65/60)
const CUTS: [number, LetterGrade][] = [
  [95, 'A+'],
  [90, 'A0'],
  [85, 'B+'],
  [80, 'B0'],
  [75, 'C+'],
  [70, 'C0'],
  [65, 'D+'],
  [60, 'D0'],
]
export const letterOf = (total: number): LetterGrade =>
  CUTS.find(([cut]) => total >= cut)?.[1] ?? 'F'

/** 상대평가 비율 상한 (가정: A 계열 30% 이하, A·B 계열 합 70% 이하) */
export const RELATIVE_LIMITS = { A: 30, AB: 70 }

export const relativeRatio = (letters: LetterGrade[]) => {
  const n = letters.length || 1
  const a = letters.filter((l) => l.startsWith('A')).length
  const ab = letters.filter((l) => l.startsWith('A') || l.startsWith('B')).length
  const aPct = Math.round((a / n) * 1000) / 10
  const abPct = Math.round((ab / n) * 1000) / 10
  return { aPct, abPct, ok: aPct <= RELATIVE_LIMITS.A && abPct <= RELATIVE_LIMITS.AB }
}

export const sumRatios = (r: Ratios) => r.midterm + r.final + r.assignment + r.attendance

/** 재수강 가능 상한 (가정: C+ 이하로 이수한 과목만 재수강 가능) */
export const RETAKE_MAX: LetterGrade = 'C+'
