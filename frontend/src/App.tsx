import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import NewTask from './pages/NewTask'
import TaskDetail from './pages/TaskDetail'
import TaskList from './pages/TaskList'
import { getToken } from './api'

function Guard({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><TaskList /></Guard>} />
        <Route path="/new" element={<Guard><NewTask /></Guard>} />
        <Route path="/tasks/:id" element={<Guard><TaskDetail /></Guard>} />
      </Routes>
    </BrowserRouter>
  )
}
