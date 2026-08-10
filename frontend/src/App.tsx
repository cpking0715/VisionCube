import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import NewTask from './pages/NewTask'
import TaskDetail from './pages/TaskDetail'
import { getToken } from './api'
import { ToastProvider } from './components/ui'

function Guard({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><NewTask /></Guard>} />
          <Route path="/tasks/:id" element={<Guard><TaskDetail /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
