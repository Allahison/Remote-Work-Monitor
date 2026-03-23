import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, CheckSquare, AlertTriangle, TrendingUp, Activity,
  Clock, Monitor, Zap, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid
} from 'recharts'
import { supabase } from '../../lib/supabaseClient'
import { formatDistanceToNow } from 'date-fns'

const weekData = [
  { day: 'Mon', active: 7.2, idle: 1.8 },
  { day: 'Tue', active: 8.5, idle: 0.5 },
  { day: 'Wed', active: 6.8, idle: 2.2 },
  { day: 'Thu', active: 9.1, idle: 0.9 },
  { day: 'Fri', active: 7.5, idle: 1.5 },
  { day: 'Sat', active: 3.2, idle: 0.8 },
  { day: 'Sun', active: 1.0, idle: 0.5 },
]

const COLORS = ['#6c63ff', '#374151']

const cardAnim = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

function StatCard({ icon: Icon, label, value, sub, color, trend, i }) {
  return (
    <motion.div custom={i} variants={cardAnim} initial="hidden" animate="visible" className="stat-card">
      <div className="flex items-center justify-between">
        <div className="p-2.5 rounded-xl" style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </motion.div>
  )
}

const tooltipStyle = {
  background: 'rgba(20,20,36,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  color: '#f0f0ff',
  fontSize: '12px',
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: empData }, { data: taskData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'employee'),
        supabase.from('tasks').select('*'),
      ])
      setEmployees(empData || [])
      setTasks(taskData || [])
      setLoading(false)
    }
    fetchData()

    // Realtime subscription for profiles
    const sub = supabase.channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const activeCount = employees.filter(e => e.status === 'active').length
  const idleCount = employees.filter(e => e.status === 'idle').length
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length

  const pieData = [
    { name: 'Active', value: activeCount || 1 },
    { name: 'Offline', value: (employees.length - activeCount) || 1 },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Real-time overview of your remote team</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard i={0} icon={Users} label="Total Employees" value={employees.length} sub={`${activeCount} active`} color="#6c63ff" trend={12} />
        <StatCard i={1} icon={Activity} label="Active Now" value={activeCount} sub={`${idleCount} idle`} color="#22c55e" trend={activeCount > 0 ? 5 : -10} />
        <StatCard i={2} icon={CheckSquare} label="Pending Tasks" value={pendingTasks} sub={`${completedTasks} completed`} color="#f59e0b" />
        <StatCard i={3} icon={AlertTriangle} label="Idle Alerts" value={idleCount} sub="Needs attention" color="#ef4444" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Weekly Work Activity (hrs)</h2>
            <span className="badge badge-brand">This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="active" fill="#6c63ff" radius={[6, 6, 0, 0]} name="Active" />
              <Bar dataKey="idle" fill="rgba(108,99,255,0.2)" radius={[6, 6, 0, 0]} name="Idle" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Online status pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5"
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Team Status</h2>
          <div className="flex flex-col items-center gap-3">
            <PieChart width={160} height={160}>
              <Pie data={pieData} cx={75} cy={75} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
            <div className="flex flex-col gap-2 w-full">
              {[{ label: 'Active', color: '#6c63ff', val: activeCount }, { label: 'Offline', color: '#374151', val: employees.length - activeCount }].map(item => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  </div>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent employees */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Team Overview</h2>
          <a href="/employees" className="text-xs hover:underline" style={{ color: 'var(--brand-light)' }}>View all →</a>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-white/5" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-28 rounded bg-white/5" />
                  <div className="h-2 w-20 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No employees found. Invite your team!</p>
        ) : (
          <div className="space-y-3">
            {employees.slice(0, 5).map(emp => (
              <div key={emp.id} className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full avatar flex items-center justify-center text-white text-sm font-bold">
                    {emp.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 status-dot status-${emp.status === 'active' ? 'online' : emp.status === 'idle' ? 'idle' : 'offline'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{emp.full_name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{emp.email}</p>
                </div>
                <span className={`badge ${emp.status === 'active' ? 'badge-success' : emp.status === 'idle' ? 'badge-warning' : 'badge-info'} capitalize`}>
                  {emp.status || 'offline'}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
