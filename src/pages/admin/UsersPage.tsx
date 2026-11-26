// USR-02 사용자 계정 관리: 등록·수정·비밀번호 초기화·비활성화 (삭제 없음)
import { useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import {
  Badge,
  DeptSelect,
  Empty,
  ErrorBox,
  Field,
  Loading,
  Modal,
  PageHeader,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { isGraduateNo, ROLE_LABEL, STD_STAT_LABEL, YR_LVLS } from '../../lib/format'
import type { Role, StdStat, UserResponse } from '../../types'

/** 등록·수정 폼 (관리자 계정은 이 화면에서 만들지 않는다) */
interface UserForm {
  usrNo: string
  usrNm: string
  role: 'STUDENT' | 'PROFESSOR'
  password: string
  email: string
  deptNo: number | null
  yrLvl: number
  stdStat: StdStat
  office: string
}

const NEW_USER: UserForm = {
  usrNo: '',
  usrNm: '',
  role: 'STUDENT',
  password: '',
  email: '',
  deptNo: null,
  yrLvl: 1,
  stdStat: 'ATTENDING',
  office: '',
}

const toForm = (u: UserResponse): UserForm => ({
  usrNo: u.usrNo,
  usrNm: u.usrNm,
  role: u.role === 'PROFESSOR' ? 'PROFESSOR' : 'STUDENT',
  password: '',
  email: u.email ?? '',
  deptNo: u.deptNo,
  yrLvl: u.yrLvl ?? 1,
  stdStat: u.stdStat ?? 'ATTENDING',
  office: u.office ?? '',
})

export default function UsersPage() {
  const toast = useToast()
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState('')
  const [query, setQuery] = useState({ keyword: '', role: '' })
  const { data, error, loading, reload } = useAsync(
    () =>
      adminApi.users({
        keyword: query.keyword || undefined,
        role: (query.role || undefined) as Role | undefined,
      }),
    [query],
  )
  const [editing, setEditing] = useState<{ mode: 'new' | 'edit'; form: UserForm } | null>(null)
  const [resetting, setResetting] = useState<UserResponse | null>(null)

  const deactivate = async (u: UserResponse) => {
    if (!confirm(`${u.usrNm}(${u.usrNo}) 계정을 비활성화할까요?`)) return
    try {
      await adminApi.deactivateUser(u.usrNo)
      toast('비활성화했습니다.')
      reload()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="사용자 관리"
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setEditing({ mode: 'new', form: NEW_USER })}
          >
            사용자 등록
          </button>
        }
      />
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery({ keyword, role })
        }}
      >
        <label>
          역할
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">전체</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          사용자번호·이름
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </label>
        <div className="filters-actions">
          <button className="btn btn-primary">검색</button>
        </div>
      </form>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (data.length === 0 ? (
          <Empty>검색 결과가 없습니다.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>사용자번호</th>
                  <th>이름</th>
                  <th>역할</th>
                  <th>학과</th>
                  <th>학년·학적 / 연구실</th>
                  <th>이메일</th>
                  <th>계정상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((u) => {
                  const manageable = u.role !== 'ADMIN'
                  const active = u.acctStat === 'ACTIVE'
                  return (
                    <tr key={u.usrNo} className={active ? '' : 'row-muted'}>
                      <td className="mono">{u.usrNo}</td>
                      <td>{u.usrNm}</td>
                      <td>
                        {u.role === 'STUDENT' && isGraduateNo(u.usrNo)
                          ? '대학원생'
                          : ROLE_LABEL[u.role]}
                      </td>
                      <td>{u.deptNm ?? '-'}</td>
                      <td>
                        {u.role === 'STUDENT'
                          ? [u.yrLvl && `${u.yrLvl}학년`, u.stdStat && STD_STAT_LABEL[u.stdStat]]
                              .filter(Boolean)
                              .join(' · ') || '-'
                          : (u.office ?? '-')}
                      </td>
                      <td>{u.email ?? '-'}</td>
                      <td>
                        {active ? (
                          <Badge tone="green">활성</Badge>
                        ) : (
                          <Badge tone="red">비활성</Badge>
                        )}
                      </td>
                      <td className="row-actions">
                        {manageable && (
                          <>
                            <button
                              className="btn btn-sm"
                              onClick={() => setEditing({ mode: 'edit', form: toForm(u) })}
                            >
                              수정
                            </button>
                            <button className="btn btn-sm" onClick={() => setResetting(u)}>
                              비밀번호 초기화
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              disabled={!active}
                              onClick={() => deactivate(u)}
                            >
                              비활성화
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      {editing && (
        <UserModal
          mode={editing.mode}
          initial={editing.form}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
    </>
  )
}

function UserModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: 'new' | 'edit'
  initial: UserForm
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [f, setF] = useState<UserForm>(initial)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof UserForm>(k: K, v: UserForm[K]) => setF((x) => ({ ...x, [k]: v }))
  const isStudent = f.role === 'STUDENT'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    // 역할에 맞는 항목만 보낸다
    const common = {
      usrNm: f.usrNm,
      email: f.email || null,
      deptNo: f.deptNo as number,
      yrLvl: isStudent ? f.yrLvl : null,
      stdStat: isStudent ? f.stdStat : null,
      office: isStudent ? null : f.office || null,
    }
    try {
      if (mode === 'new')
        await adminApi.createUser({ ...common, usrNo: f.usrNo, password: f.password, role: f.role })
      else await adminApi.updateUser(f.usrNo, common)
      toast('저장했습니다.')
      onSaved()
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={mode === 'new' ? '사용자 등록' : '사용자 수정'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" form="user-form" disabled={busy}>
            저장
          </button>
        </>
      }
    >
      <form id="user-form" className="form-grid" onSubmit={submit}>
        <Field label="역할">
          <select
            value={f.role}
            disabled={mode === 'edit'}
            onChange={(e) => set('role', e.target.value as UserForm['role'])}
          >
            <option value="STUDENT">학생</option>
            <option value="PROFESSOR">교수</option>
          </select>
        </Field>
        <Field
          label={isStudent ? '학번' : '교번'}
          hint={
            mode === 'edit'
              ? '등록 후 바꿀 수 없습니다.'
              : isStudent
                ? '학부생 8자리, 대학원생 10자리 숫자 (대학원생은 조교로만 쓰고 수강신청 대상이 아님)'
                : '6자리 숫자'
          }
        >
          <input
            value={f.usrNo}
            inputMode="numeric"
            disabled={mode === 'edit'}
            onChange={(e) => set('usrNo', e.target.value)}
          />
        </Field>
        <Field label="이름">
          <input value={f.usrNm} onChange={(e) => set('usrNm', e.target.value)} />
        </Field>
        {mode === 'new' && (
          <Field label="초기 비밀번호">
            <input
              type="password"
              value={f.password}
              onChange={(e) => set('password', e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        )}
        <Field label="이메일">
          <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="학과">
          <DeptSelect value={f.deptNo} onChange={(v) => set('deptNo', v)} />
        </Field>
        {isStudent ? (
          <>
            <Field label="학년">
              <select value={f.yrLvl} onChange={(e) => set('yrLvl', Number(e.target.value))}>
                {YR_LVLS.map((g) => (
                  <option key={g} value={g}>
                    {g}학년
                  </option>
                ))}
              </select>
            </Field>
            <Field label="학적상태">
              <select value={f.stdStat} onChange={(e) => set('stdStat', e.target.value as StdStat)}>
                {(Object.keys(STD_STAT_LABEL) as StdStat[]).map((s) => (
                  <option key={s} value={s}>
                    {STD_STAT_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : (
          <Field label="연구실">
            <input value={f.office} onChange={(e) => set('office', e.target.value)} />
          </Field>
        )}
        {err && <p className="form-error span-2">{err}</p>}
      </form>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await adminApi.resetPassword(user.usrNo, pw)
      toast(`${user.usrNm}의 비밀번호를 초기화했습니다.`)
      onClose()
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="비밀번호 초기화"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-primary" form="reset-form" disabled={busy}>
            초기화
          </button>
        </>
      }
    >
      <form id="reset-form" className="stack" onSubmit={submit}>
        <p className="muted">
          {user.usrNm} · {user.usrNo}
        </p>
        <Field label="새 비밀번호">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
            autoFocus
          />
        </Field>
        {err && <p className="form-error">{err}</p>}
      </form>
    </Modal>
  )
}
