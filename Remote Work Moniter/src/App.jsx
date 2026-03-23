import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { supabase } from './lib/supabaseClient'
import { setSession, setUser, setProfile, clearAuth, setLoading } from './store/slices/authSlice'
import { THEMES } from './store/slices/uiSlice'
import { Toaster } from 'react-hot-toast'

import DashboardLayout from './components/layout/DashboardLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import ScreenMonitorPage from './pages/admin/ScreenMonitorPage'
import EmployeesPage from './pages/admin/EmployeesPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import TasksPage from './pages/admin/TasksPage'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import MyTasksPage from './pages/employee/MyTasksPage'
import LeaveRequests from './pages/employee/LeaveRequests'
import LeaveApprovals from './pages/admin/LeaveApprovals'
import ChatPage from './pages/ChatPage'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './components/auth/ProtectedRoute'

function AppRoutes() {
  const { user, role, loading } = useSelector(state => state.auth)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center page-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/dashboard" replace />} />
      
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={
          !role ? (
            <div className="min-h-screen flex items-center justify-center page-bg">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
              </div>
            </div>
          ) : role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />
        } />
        <Route path="/screens" element={role === 'admin' ? <ScreenMonitorPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/employees" element={role === 'admin' ? <EmployeesPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/analytics" element={role === 'admin' ? <AnalyticsPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/tasks" element={role === 'admin' ? <TasksPage /> : <MyTasksPage />} />
        <Route path="/leaves" element={role === 'admin' ? <LeaveApprovals /> : <LeaveRequests />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}

export default function App() {
  const dispatch = useDispatch()
  const { theme } = useSelector(state => state.ui)

  useEffect(() => {
    // Remove all theme classes then apply current one
    const allClasses = THEMES.map(t => t.id)
    document.documentElement.classList.remove(...allClasses, 'dark', 'light')
    document.documentElement.classList.add(theme)
    // Also add 'dark' or 'light' for Tailwind dark: variants
    const themeObj = THEMES.find(t => t.id === theme)
    if (themeObj?.dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.add('light')
    }
  }, [theme])


  useEffect(() => {
    // Initialize auth
    dispatch(setLoading(true))
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setSession(session))
      if (session?.user) {
        dispatch(setUser(session.user))
        fetchProfile(session.user.id)
      } else {
        dispatch(setLoading(false))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      dispatch(setSession(session))
      if (session?.user) {
        dispatch(setUser(session.user))
        fetchProfile(session.user.id)
      } else {
        dispatch(clearAuth())
      }
    })

    return () => subscription.unsubscribe()
  }, [dispatch])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (data) {
      // Force active status on login/mount for employees
      if (data.role === 'employee') {
        await supabase.from('profiles').update({ status: 'active' }).eq('id', userId)
        data.status = 'active'
        
        // Notify admins that the user logged in
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
        if (admins) {
          const notifications = admins.map(a => ({
            user_id: a.id, type: 'alert', title: 'Employee Online', message: `${data.full_name || 'An employee'} just logged in and is online.`
          }))
          await supabase.from('notifications').insert(notifications)
        }
      }
      dispatch(setProfile(data))
    }
    dispatch(setLoading(false))
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AppRoutes />
    </BrowserRouter>
  )
}
