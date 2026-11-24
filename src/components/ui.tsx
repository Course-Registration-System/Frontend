// 작은 공용 UI 조각들
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAsync } from '../hooks/useAsync'
import { commonApi } from '../api'
import { DEPARTMENTS } from '../lib/codes'
import { GRD_STAT_LABEL, semLabel } from '../lib/format'
import type { GrdStat, LecStat } from '../types'

export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string
  desc?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {desc && <p className="muted">{desc}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Loading() {
  return <p className="muted">불러오는 중…</p>
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice notice-error">
      {message}
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}

export function Notice({
  children,
  kind = 'info',
}: {
  children: ReactNode
  kind?: 'info' | 'warn' | 'error'
}) {
  return <div className={`notice notice-${kind}`}>{children}</div>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Badge({
  children,
  tone = 'gray',
}: {
  children: ReactNode
  tone?: 'gray' | 'blue' | 'green' | 'red' | 'amber'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

const GRADE_TONE: Record<GrdStat, 'gray' | 'blue' | 'amber' | 'green'> = {
  NOT_ENTERED: 'gray',
  ENTERING: 'amber',
  SUBMITTED: 'blue',
  CONFIRMED: 'green',
}
export const GradeStatusBadge = ({ status }: { status: GrdStat }) => (
  <Badge tone={GRADE_TONE[status]}>{GRD_STAT_LABEL[status]}</Badge>
)
export const LectureStatusBadge = ({ status }: { status: LecStat }) =>
  status === 'CLOSED' ? <Badge tone="red">폐강</Badge> : <Badge tone="green">개설</Badge>

/** 학기 선택. value 가 null 이면 현재 학기로 채운다 */
export function SemesterSelect({
  value,
  onChange,
  only,
}: {
  value: number | null
  onChange: (semNo: number) => void
  /** 주어지면 이 학기들만 보여준다 */
  only?: number[]
}) {
  const { data } = useAsync(() => commonApi.semesters(), [])
  const list = data?.filter((s) => !only || only.includes(s.semNo)) ?? []
  const defaultNo = (list.find((s) => s.current) ?? list[list.length - 1])?.semNo
  // 부모가 값을 비워 두면 기본 학기를 알려 준다
  useEffect(() => {
    if (value == null && defaultNo != null) onChange(defaultNo)
  }, [value, defaultNo, onChange])
  return (
    <label className="inline-field">
      <span>학기</span>
      <select value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
        {list.map((s) => (
          <option key={s.semNo} value={s.semNo}>
            {semLabel(s)}
            {s.current ? ' (현재)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

/** 학과 선택 */
export function DeptSelect({
  value,
  onChange,
  allLabel,
}: {
  value: number | null
  onChange: (deptNo: number | null) => void
  /** 주어지면 맨 앞에 '전체' 같은 빈 값 옵션을 둔다 */
  allLabel?: string
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{allLabel ?? '선택'}</option>
      {DEPARTMENTS.map((d) => (
        <option key={d.deptNo} value={d.deptNo}>
          {d.deptNm}
        </option>
      ))}
    </select>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
