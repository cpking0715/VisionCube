import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

/** 登录页（DESIGN.md §5.1）：桌面/平板居中卡片 max-w 400px；手机全屏 */
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const nav = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')
    try {
      await login(username, password)
      nav('/')
    } catch {
      setError('登录失败，请检查用户名密码')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* 背景氛围：品牌渐变光斑 */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary-400/25 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-80 w-96 rounded-full bg-secondary-400/25 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px] animate-fade-up rounded-2xl border border-line bg-panel/90 p-8 shadow-card backdrop-blur">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
            <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
            </svg>
          </span>
          <div className="text-center">
            <h1 className="text-xl font-bold text-ink-1">VisionCube</h1>
            <p className="mt-1 text-sm text-ink-3">抖音爆款视频复刻智能体</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label="用户名"
            required
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <Input
            label="密码"
            required
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" loading={pending} className="mt-2 w-full">
            登录
          </Button>
        </form>
      </div>
    </div>
  )
}
