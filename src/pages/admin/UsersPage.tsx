// USR-02 사용자 관리 (삭제 없음, 비활성화만)
import { useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { useToast } from '../../components/Toast'
import { Badge, Empty, ErrorBox, Field, Loading, Modal, PageHeader } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { DEPARTMENTS, ROLE_LABEL } from '../../lib/format'
import type { Role, User, UserForm } from '../../types'

export default function UsersPage() {
  const toast = useToast()
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState('')
  const [query, setQuery] = useState({ keyword: '', role: '' })
  const { data, error, loading, reload } = useAsync(() => adminApi.users(query), [query])
  const [editing, setEditing] = useState<{ mode: 'new' | 'edit'; form: UserForm } | null>(null)

  const deactivate = async (u: User) => {
    if (!confirm(`${u.name}(${u.userNo}) 계정을 비활성화할까요? 로그인할 수 없게 됩니다.`)) return
    try {
      await adminApi.deactivateUser(u.userNo)
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
        desc="학생·교수·관리자 계정을 등록하고 수정합니다. 계정은 삭제하지 않고 비활성화합니다."
        actions={
          <button
            className="btn btn-primary"
            onClick={() =>
              setEditing({
                mode: 'new',
                form: { userNo: '', name: '', role: 'STUDENT', grade: 1, deptName: DEPARTMENTS[0] },
              })
            }
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
        <label>
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
                  <th className="num">학년</th>
                  <th>이메일</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.userNo} className={u.active ? '' : 'row-muted'}>
                    <td className="mono">{u.userNo}</td>
                    <td>{u.name}</td>
                    <td>
                      {ROLE_LABEL[u.role]}
                      {u.isAssistant && ' (조교)'}
                    </td>
                    <td>{u.deptName ?? '-'}</td>
                    <td className="num">{u.grade ?? '-'}</td>
                    <td>{u.email ?? '-'}</td>
                    <td>
                      {u.active ? (
                        <Badge tone="green">활성</Badge>
                      ) : (
                        <Badge tone="red">비활성</Badge>
                      )}
                    </td>
                    <td className="row-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setEditing({
                            mode: 'edit',
                            form: {
                              userNo: u.userNo,
                              name: u.name,
                              role: u.role,
                              deptName: u.deptName,
                              grade: u.grade,
                              email: u.email,
                            },
                          })
                        }
                      >
                        수정
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={!u.active}
                        onClick={() => deactivate(u)}
                      >
                        비활성화
                      </button>
                    </td>
                  </tr>
                ))}
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

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      if (mode === 'new') await adminApi.createUser(f)
      else await adminApi.updateUser(f.userNo, f)
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
            onChange={(e) => set('role', e.target.value as Role)}
          >
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="사용자번호"
          hint={mode === 'edit' ? '등록 후 바꿀 수 없습니다.' : '학번 또는 교번'}
        >
          <input
            value={f.userNo}
            disabled={mode === 'edit'}
            onChange={(e) => set('userNo', e.target.value)}
            required
          />
        </Field>
        <Field label="이름">
          <input value={f.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field
          label={mode === 'new' ? '초기 비밀번호' : '비밀번호 재설정'}
          hint={mode === 'edit' ? '비워 두면 바꾸지 않습니다.' : undefined}
        >
          <input
            type="password"
            value={f.password ?? ''}
            onChange={(e) => set('password', e.target.value)}
            required={mode === 'new'}
          />
        </Field>
        {f.role !== 'ADMIN' && (
          <>
            <Field label="학과">
              <select value={f.deptName ?? ''} onChange={(e) => set('deptName', e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="이메일">
              <input
                type="email"
                value={f.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
          </>
        )}
        {f.role === 'STUDENT' && (
          <Field label="학년">
            <select value={f.grade ?? 1} onChange={(e) => set('grade', Number(e.target.value))}>
              {[1, 2, 3, 4].map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </select>
          </Field>
        )}
        {err && <p className="form-error span-2">{err}</p>}
      </form>
    </Modal>
  )
}
