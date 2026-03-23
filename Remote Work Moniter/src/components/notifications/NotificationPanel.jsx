import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, X, AlertTriangle, Clock, Monitor, Trash2 } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { closePanel } from '../../store/slices/notificationsSlice'
import { formatDistanceToNow } from 'date-fns'
import { useNotifications } from '../../hooks/useNotifications'

const typeIcons = {
  idle: Clock,
  task: CheckCheck,
  screen: Monitor,
  alert: AlertTriangle,
  default: Bell,
}

const typeColors = {
  idle: 'text-amber-400',
  task: 'text-green-400',
  screen: 'text-brand-400',
  alert: 'text-red-400',
  default: 'text-blue-400',
}

export default function NotificationPanel() {
  const dispatch = useDispatch()
  const { notifications } = useSelector(state => state.notifications)
  const { markAllAsRead, markAsRead, deleteNotification, deleteAllNotifications } = useNotifications()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 top-12 w-80 glass-card overflow-hidden shadow-glass z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="text-xs hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Mark all read
          </button>
          <button
            onClick={deleteAllNotifications}
            className="text-xs hover:text-red-400 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear all
          </button>
          <button onClick={() => dispatch(closePanel())} style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--text-muted)' }}>
            <Bell className="w-8 h-8 opacity-30" />
            <p className="text-xs">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = typeIcons[n.type] || typeIcons.default
            const colorClass = typeColors[n.type] || typeColors.default
            return (
              <div
                key={n.id}
                onClick={() => { if (!n.read) markAsRead(n.id) }}
                className={`group flex gap-3 px-4 py-3 border-b transition-colors ${n.read ? 'hover:bg-white/5 cursor-default' : 'bg-brand-500/5 hover:bg-brand-500/10 cursor-pointer'}`}
                style={{ borderColor: 'var(--border)' }}
              >
                <div className={`mt-0.5 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : 'Just now'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 pr-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--brand)' }} />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}
