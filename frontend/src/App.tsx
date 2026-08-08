import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import NewTask from './pages/NewTask'
import TaskDetail from './pages/TaskDetail'
import TaskList from './pages/TaskList'
import { getToken } from './api'
import { ToastProvider } from './components/ui'
import { AppShell } from './components/layout'

function Guard({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Guard>
                <AppShell>
                  <TaskList />
                </AppShell>
              </Guard>
            }
          />
          <Route
            path="/new"
            element={
              <Guard>
                <AppShell>
                  <NewTask />
                </AppShell>
              </Guard>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <Guard>
                <AppShell>
                  <TaskDetail />
                </AppShell>
              </Guard>
            }
          />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
