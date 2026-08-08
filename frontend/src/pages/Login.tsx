import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await login(username, password)
      nav('/')
    } catch {
      setError('登录失败，请检查用户名密码')
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-32 flex w-72 flex-col gap-3">
      <h1 className="text-xl font-bold">VisionCube 登录</h1>
      <input className="border p-2 rounded" placeholder="用户名" value={username}
        onChange={(e) => setUsername(e.target.value)} />
      <input className="border p-2 rounded" type="password" placeholder="密码" value={password}
        onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button className="bg-blue-600 text-white p-2 rounded">登录</button>
    </form>
  )
}
