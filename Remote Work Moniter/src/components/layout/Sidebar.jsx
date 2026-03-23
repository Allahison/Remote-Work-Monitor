import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Monitor, Users, BarChart3, CheckSquare, MessageSquare, ChevronLeft, ChevronRight, Monitor as MonitorIcon, LogOut, Settings, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useDispatch } from 'react-redux'
import { clearAuth } from '../../store/slices/authSlice'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

const adminNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/screens', icon: Monitor, label: 'Screen Monitor' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/leaves', icon: Calendar, label: 'Leave Requests' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const employeeNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'My Tasks' },
  { to: '/leaves', icon: Calendar, label: 'My Leaves' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { role, profile } = useAuth()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const navItems = role === 'admin' ? adminNav : employeeNav

  const handleLogout = async () => {
    await supabase.auth.signOut()
    dispatch(clearAuth())
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="glass-sidebar flex flex-col h-screen flex-shrink-0 relative z-20"
    >
      <div className="flex flex-col w-full h-full overflow-hidden">
        {/* Logo */}
        <div className="flex items-center px-4 py-5 border-b relative h-[73px]" style={{ borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center absolute left-4"
            style={{ background: 'linear-gradient(135deg, #6c63ff, #00d4ff)' }}>
            <MonitorIcon className="w-5 h-5 text-white" />
          </div>
          <motion.div
            animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? 10 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute left-[60px] whitespace-nowrap"
          >
            <p className="text-sm font-bold gradient-text leading-none">RemoteMonitor</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {role === 'admin' ? 'Admin Panel' : 'Employee Portal'}
            </p>
          </motion.div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item relative flex items-center h-10 ${isActive ? 'active' : ''}`
              }
              title={collapsed ? label : ''}
              style={{ paddingLeft: '11px' }} /* align absolute center with icon */
            >
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <motion.span
                animate={{ opacity: collapsed ? 0 : 1 }}
                transition={{ duration: 0.2 }}
                className="absolute left-11 text-sm whitespace-nowrap pointer-events-none"
              >
                {label}
              </motion.span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
          {profile && (
            <div className="relative flex items-center h-10 px-2 mb-1">
              <div className="w-8 h-8 rounded-full avatar overflow-hidden flex items-center justify-center text-white text-xs font-bold flex-shrink-0 absolute left-2">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile.full_name?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <motion.div 
                animate={{ opacity: collapsed ? 0 : 1 }} 
                className="absolute left-12 min-w-0 whitespace-nowrap pointer-events-none"
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {profile.full_name}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {role === 'admin' ? '🛡 Admin' : '💼 Employee'}
                </p>
              </motion.div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`nav-item relative flex items-center h-10 text-red-400 hover:bg-red-500/10 hover:text-red-400`}
            title={collapsed ? 'Sign out' : ''}
            style={{ paddingLeft: '13px' }}
          >
            <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <motion.span 
              animate={{ opacity: collapsed ? 0 : 1 }} 
              className="absolute left-11 whitespace-nowrap pointer-events-none"
            >
              Sign Out
            </motion.span>
          </button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center border shadow-sm hover:shadow transition-all duration-200 hover:scale-110 z-30"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  )
}
