import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, Filter, Plus, X, Mail, Shield, CheckCircle, Video } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const statusColors = {
  active: 'badge-success',
  idle: 'badge-warning',
  offline: 'badge-info',
  invited: 'bg-brand-500/10 text-brand-400 border-none'
}
const statusDot = {
  active: 'status-online',
  idle: 'status-idle',
  offline: 'status-offline',
  invited: 'bg-brand-500 animate-pulse'
}

export default function EmployeesPage() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [invitations, setInvitations] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEmp, setNewEmp] = useState({ name: '', email: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    try {
      const { data: emps, error: empErr } = await supabase.from('profiles').select('*, work_sessions(*)').eq('role', 'employee')
      const { data: invs, error: invErr } = await supabase.from('invitations').select('*')
      
      if (empErr) console.error('Error fetching employees:', empErr)
      if (invErr) {
        console.warn('Invitations table might not exist yet:', invErr.message)
      }
      
      setEmployees(emps || [])
      setInvitations(invs || [])
    } catch (err) {
      console.error('Unexpected error in fetchData:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const profSub = supabase
      .channel('employees-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, fetchData)
      .subscribe()
    
    return () => supabase.removeChannel(profSub)
  }, [])

  const handleAddEmployee = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.from('invitations').insert({
      email: newEmp.email.toLowerCase(),
      full_name: newEmp.name,
      role: 'employee'
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Invitation sent to ${newEmp.email}`)
      setShowAddModal(false)
      setNewEmp({ name: '', email: '' })
      fetchData()
    }
    setSubmitting(false)
  }

  const combined = [
    ...(employees || []),
    ...(invitations || [])
      .filter(inv => !employees.some(emp => emp.email?.toLowerCase() === inv.email?.toLowerCase()))
      .map(inv => ({ 
        id: inv.id, 
        full_name: inv.full_name, 
        email: inv.email, 
        status: 'invited', 
        isInvitation: true 
      }))
  ]

  const filtered = combined.filter(e => {
    const matchSearch = e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>Employees</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Monitor and manage your remote team</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-glass pl-9"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'idle', 'offline', 'invited'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all border ${filterStatus === s ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Employee', 'Status', 'Email', 'Today Active', 'Last Seen'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 rounded bg-white/5 w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                    No employees match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b hover:bg-white/3 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="px-4 py-4 group">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full avatar overflow-hidden flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #6c63ff, #00d4ff)' }}>
                              {emp.avatar_url ? (
                                <img src={emp.avatar_url} alt="Employee" className="w-full h-full object-cover" />
                              ) : (
                                emp.full_name?.[0]?.toUpperCase() || '?'
                              )}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 status-dot ${statusDot[emp.status] || 'status-offline'}`} />
                          </div>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{emp.full_name}</span>
                        </div>
                        
                        {!emp.isInvitation && emp.id !== user?.id && (
                          <button 
                            onClick={() => window.dispatchEvent(new CustomEvent('start-rtc-call', { detail: { userId: emp.id } }))}
                            className="p-1.5 rounded-lg hover:bg-brand-500/10 text-brand-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Start Video Call"
                          >
                            <Video className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`badge ${statusColors[emp.status] || 'badge-info'} capitalize`}>
                        {emp.status || 'offline'}
                      </span>
                    </td>
                    <td className="px-4 py-4" style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-green-400">
                        {emp.today_active_seconds != null ? `${Math.floor(emp.today_active_seconds / 3600)}h ${Math.floor((emp.today_active_seconds % 3600) / 60)}m` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {emp.isInvitation ? (
                        <span className="flex items-center gap-1.5 text-brand-400 font-medium">
                          <CheckCircle className="w-3" />
                          Pending Signup
                        </span>
                      ) : (
                        emp.last_seen ? formatDistanceToNow(new Date(emp.last_seen), { addSuffix: true }) : '—'
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddEmployee}
        newEmp={newEmp}
        setNewEmp={setNewEmp}
        submitting={submitting}
      />
    </div>
  )
}

function AddEmployeeModal({ isOpen, onClose, onSubmit, newEmp, setNewEmp, submitting }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass-card p-6 shadow-2xl border-white/10"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
                  <Mail className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold">Invite New Employee</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 opacity-60" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold px-1 opacity-70">Employee Name</label>
                <input
                  required
                  className="input-glass"
                  placeholder="e.g. John Doe"
                  value={newEmp.name}
                  onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold px-1 opacity-70">Email Address</label>
                <input
                  required
                  type="email"
                  className="input-glass"
                  placeholder="john@example.com"
                  value={newEmp.email}
                  onChange={e => setNewEmp({ ...newEmp, email: e.target.value })}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] hover:bg-white/5 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary py-2.5 font-medium text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Invitation'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

