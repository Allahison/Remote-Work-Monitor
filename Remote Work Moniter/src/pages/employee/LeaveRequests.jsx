import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Plus, Clock, CheckCircle2, XCircle, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

export default function LeaveRequests() {
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    type: 'vacation',
    start_date: '',
    end_date: '',
    reason: ''
  })

  useEffect(() => {
    if (user) {
      fetchLeaves()
      
      const sub = supabase
        .channel('leaves-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves', filter: `user_id=eq.${user.id}` }, fetchLeaves)
        .subscribe()
        
      return () => supabase.removeChannel(sub)
    }
  }, [user])

  const fetchLeaves = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    setLeaves(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      toast.error('Please fill in all fields.')
      return
    }
    
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast.error('End date cannot be before start date.')
      return
    }

    const { error } = await supabase.from('leaves').insert({
      user_id: user.id,
      ...formData
    })

    if (error) {
      toast.error('Failed to submit leave request.')
    } else {
      toast.success('Leave request submitted successfully.')
      setShowModal(false)
      setFormData({ type: 'vacation', start_date: '', end_date: '', reason: '' })
      fetchLeaves()
      
      // Notify admins
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
      if (admins?.length) {
        await supabase.from('notifications').insert(
          admins.map(a => ({
            user_id: a.id,
            type: 'alert',
            title: 'New Leave Request',
            message: `A new leave request is awaiting your approval.`
          }))
        )
      }
    }
  }

  const deleteRequest = async (id) => {
    const { error } = await supabase.from('leaves').delete().eq('id', id)
    if (!error) {
      toast.success('Request deleted.')
      fetchLeaves()
    } else {
      toast.error('Failed to delete request.')
    }
  }

  const getStatusIcon = (status) => {
    if (status === 'approved') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-red-500" />
    return <Clock className="w-5 h-5 text-amber-500" />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Leaves</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Request time off and monitor approval status</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {/* List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-hover)]">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Leave History</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading requests...</div>
        ) : leaves.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-[var(--border)] mb-4" style={{ background: 'var(--surface-hover)' }}>
              <Calendar className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-[var(--text-primary)] font-medium">No leave requests yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">When you need time off, request it here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {leaves.map((leave) => (
              <div key={leave.id} className="p-4 flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{getStatusIcon(leave.status)}</div>
                  <div>
                    <h3 className="font-semibold text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
                      {leave.type} Leave
                    </h3>
                    <div className="flex items-center gap-3 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    {leave.reason && (
                      <p className="text-xs mt-2 italic" style={{ color: 'var(--text-secondary)' }}>"{leave.reason}"</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    leave.status === 'approved' ? 'text-emerald-500' :
                    leave.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                  }`}>
                    {leave.status}
                  </span>
                  {leave.status === 'pending' && (
                    <button onClick={() => deleteRequest(leave.id)} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}
          >
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between" style={{ background: 'var(--surface-hover)' }}>
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" /> Apply for Leave
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Leave Type</label>
                <select 
                  className="w-full rounded-xl py-2 px-3 text-sm outline-none border border-[var(--border)] text-[var(--text-primary)] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all custom-select"
                  style={{ background: 'var(--surface)' }}
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="vacation">Vacation / Paid Time Off</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Start Date</label>
                  <input 
                    type="date"
                    required
                    className="w-full rounded-xl py-2 px-3 text-sm outline-none border border-[var(--border)] text-[var(--text-primary)] focus:border-indigo-500 transition-all custom-calendar"
                    style={{ background: 'var(--surface)' }}
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>End Date</label>
                  <input 
                    type="date"
                    required
                    className="w-full rounded-xl py-2 px-3 text-sm outline-none border border-[var(--border)] text-[var(--text-primary)] focus:border-indigo-500 transition-all custom-calendar"
                    style={{ background: 'var(--surface)' }}
                    value={formData.end_date}
                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Reason</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full rounded-xl py-2 px-3 text-sm outline-none border border-[var(--border)] text-[var(--text-primary)] focus:border-indigo-500 transition-all custom-scrollbar"
                  style={{ background: 'var(--surface)' }}
                  placeholder="Provide a brief reason for your leave..."
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors bg-[var(--surface-hover)] text-[var(--text-primary)] hover:bg-white/10">
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 px-6">
                  Submit Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
