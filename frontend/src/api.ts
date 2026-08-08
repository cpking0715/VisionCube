const TOKEN_KEY = 'vc_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
}

export async function login(username: string, password: string): Promise<void> {
  const body = new URLSearchParams({ username, password })
  const res = await fetch('/api/auth/login', { method: 'POST', body })
  if (!res.ok) throw new Error('登录失败')
  const data = await res.json()
  setToken(data.access_token)
}

export interface TaskOut {
  id: number
  status: string
  source_url: string
  target_industry: string | null
  failed_stage: string | null
  error_code: string | null
  error_message: string | null
}

export interface TaskDetail extends TaskOut {
  logs: { stage: string; status: string; created_at: string }[]
  scripts: { id: number; kind: string; version: number; content: string; is_confirmed: boolean }[]
  files: { id: number; kind: string }[]
}

export const listTasks = () => request<TaskOut[]>('/api/tasks')
export const getTask = (id: number) => request<TaskDetail>(`/api/tasks/${id}`)
export const createTask = (body: object) =>
  request<TaskOut>('/api/tasks', { method: 'POST', body: JSON.stringify(body) })
export const confirmScript = (taskId: number, scriptId: number) =>
  request<TaskOut>(`/api/tasks/${taskId}/confirm-script`, {
    method: 'POST', body: JSON.stringify({ script_id: scriptId }),
  })
export const completeTask = (taskId: number) =>
  request<TaskOut>(`/api/tasks/${taskId}/complete`, { method: 'POST' })
export const retryTask = (taskId: number) =>
  request<TaskOut>(`/api/tasks/${taskId}/retry`, { method: 'POST' })

// 带 token 下载（后端要求 Authorization 头，不能用 <a href> 直链）
export async function downloadFile(fileId: number): Promise<void> {
  const res = await fetch(`/api/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error('下载失败')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `visioncube-${fileId}`
  a.click()
  URL.revokeObjectURL(url)
}
