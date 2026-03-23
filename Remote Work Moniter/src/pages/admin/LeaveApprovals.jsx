import { useState, useEffect } from 'react'
import { Check, X, Calendar, Search } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'

export default function LeaveApprovals() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchLeaves()
    
    const sub = supabase
      .channel('admin-leaves-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, fetchLeaves)
      .subscribe()
      
    return () => supabase.removeChannel(sub)
  }, [])

  const fetchLeaves = async () => {
    setLoading(true)
    const { data: leavesData } = await supabase
      .from('leaves')
      .select('*, profiles(full_name, avatar_url, role)')
      .order('created_at', { ascending: false })
    
    setLeaves(leavesData || [])
    setLoading(false)
  }

  const handleUpdateStatus = async (id, status, userId) => {
    const { error } = await supabase.from('leaves').update({ status }).eq('id', id)
    if (!error) {
      toast.success(`Leave request ${status}.`)
      fetchLeaves()
      
      // Notify employee
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'alert',
        title: 'Leave Update',
        message: `Your leave request has been ${status} by the administrator.`
      })
    } else {
      toast.error('Failed to update status.')
    }
  }

  const filtered = leaves.filter(l => 
    l.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    l.status.includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Leave Management</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Review and manage employee time-off requests</p>
        </div>
      </div>

      <div className="glass-card flex-1 min-h-[500px] flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-4" style={{ background: 'var(--bg-primary)' }}>
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="w-full rounded-xl py-2 pl-9 pr-4 text-sm outline-none border border-[var(--border)] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-[var(--surface)] text-[var(--text-primary)]"
              placeholder="Search by employee or status..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-10 text-[10px] uppercase font-bold tracking-wider" style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}>
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]" style={{ color: 'var(--text-primary)' }}>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Loading requests...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No requests found.</td></tr>
              ) : (
                filtered.map(leave => (
                  <tr key={leave.id} className="hover:bg-[var(--surface-hover)] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                          {leave.profiles?.avatar_url ? <img src={leave.profiles.avatar_url} className="w-full h-full object-cover" /> : leave.profiles?.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{leave.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{leave.user_id.substring(0,8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium capitalize">{leave.type}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] truncate text-xs text-[var(--text-secondary)]" title={leave.reason}>
                        {leave.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${leave.status === 'pending' ? 'badge-warning' : leave.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                        {leave.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {leave.status === 'pending' ? (
                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleUpdateStatus(leave.id, 'approved', leave.user_id)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Approve">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleUpdateStatus(leave.id, 'rejected', leave.user_id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Reject">
                              <X className="w-4 h-4" />
                            </button>
                         </div>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">PROCESSED</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
