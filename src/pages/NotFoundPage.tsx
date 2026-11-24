import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className="muted">주소를 다시 확인해 주세요.</p>
        <Link to="/" className="btn btn-primary btn-block">
          첫 화면으로
        </Link>
      </div>
    </div>
  )
}
