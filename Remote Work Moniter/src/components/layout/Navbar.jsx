import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, Menu } from 'lucide-react'
import { togglePanel } from '../../store/slices/notificationsSlice'
import NotificationPanel from '../notifications/NotificationPanel'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar({ onMenuToggle }) {
  const dispatch = useDispatch()
  const { unreadCount, isPanelOpen } = useSelector(state => state.notifications)
  const { profile, role } = useAuth()

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b glass"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors lg:hidden" style={{ color: 'var(--text-secondary)' }}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden sm:flex items-center">
          <Search className="absolute left-3 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-glass pl-9 py-2 w-56 text-xs"
            placeholder="Search..."
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 relative">
        {/* Notification bell */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => dispatch(togglePanel())}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors relative"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: 'var(--danger)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </motion.button>

          {/* Notification panel */}
          <AnimatePresence>
            {isPanelOpen && <NotificationPanel />}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full avatar overflow-hidden flex items-center justify-center text-white text-xs font-bold bg-brand-500"
            style={{ background: 'linear-gradient(135deg, #6c63ff, #00d4ff)' }}>
            {profile?.avatar_url ? (
              <img src={profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
              {profile?.full_name || 'User'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {role === 'admin' ? 'Administrator' : 'Employee'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
