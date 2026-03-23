import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Trash2, Edit2, X, Calendar, Flag, User, GripVertical, ListTodo } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

const priorityColors = {
  high: 'badge-danger',
  medium: 'badge-warning',
  low: 'badge-success',
}

const statusColors = {
  pending: 'badge-warning',
  in_progress: 'badge-brand',
  completed: 'badge-success',
}

const COLUMNS = [
  { id: 'pending', title: 'To Do', color: 'var(--warning)', bg: 'bg-amber-500/10' },
  { id: 'in_progress', title: 'In Progress', color: 'var(--brand)', bg: 'bg-brand-500/10' },
  { id: 'completed', title: 'Done', color: 'var(--success)', bg: 'bg-green-500/10' },
]

function TaskModal({ task, employees, onClose, onSaved }) {
  const { user } = useAuth()
  const [form, setForm] = useState(task || {
    title: '', description: '', assignee_id: '', status: 'pending', priority: 'medium', deadline: '', subtasks: []
  })
  const [newSubtask, setNewSubtask] = useState('')
  const [saving, setSaving] = useState(false)
  const isEdit = !!task

  const syncSubtasks = async (taskId) => {
    // Delete existing
    await supabase.from('subtasks').delete().eq('task_id', taskId)
    // Insert new
    if (form.subtasks?.length > 0) {
      await supabase.from('subtasks').insert(form.subtasks.map(s => ({
        task_id: taskId, title: s.title, is_completed: s.is_completed || false
      })))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const taskPayload = { title: form.title, description: form.description, assignee_id: form.assignee_id || null, status: form.status, priority: form.priority, deadline: form.deadline || null }
    let savedTaskId = task?.id

    if (isEdit) {
      const { error } = await supabase.from('tasks').update(taskPayload).eq('id', task.id)
      if (error) toast.error(error.message)
      else { 
        await syncSubtasks(savedTaskId)
        toast.success('Task updated!')
        onSaved() 
      }
    } else {
      savedTaskId = uuidv4()
      const payload = { ...taskPayload, id: savedTaskId, created_by: user.id, created_at: new Date().toISOString() };
      
      const { error } = await supabase.from('tasks').insert(payload)
      if (error) toast.error(error.message)
      else { 
        await syncSubtasks(savedTaskId)
        toast.success('Task created!'); 
        if (form.assignee_id) {
          await supabase.from('notifications').insert({
            user_id: form.assignee_id, type: 'task',
            title: 'New Task Assigned', message: `You have been assigned: "${form.title}"`
          })
        }
        onSaved() 
      }
    }
    setSaving(false)
    if (!saving) onClose()
  }

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    setForm(p => ({ ...p, subtasks: [...(p.subtasks || []), { title: newSubtask, is_completed: false }] }))
    setNewSubtask('')
  }
  
  const removeSubtask = (idx) => {
    setForm(p => ({ ...p, subtasks: p.subtasks.filter((_, i) => i !== idx) }))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card w-full max-w-lg p-6" onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{isEdit ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input className="input-glass" placeholder="Task title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          <textarea className="input-glass min-h-[80px] resize-none" placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Assign To</label>
              <select className="input-glass" value={form.assignee_id} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Priority</label>
              <select className="input-glass" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Status</label>
              <select className="input-glass" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="pending">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Done</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Deadline</label>
              <input type="date" className="input-glass" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
          </div>

          <div className="border-t pt-4 mt-2" style={{ borderColor: 'var(--border)' }}>
            <label className="text-xs mb-2 font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>Subtasks Checklist</label>
            <div className="space-y-2 mb-3 max-h-[150px] overflow-y-auto custom-scrollbar">
              {(form.subtasks || []).map((st, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 flex-1">
                    <input type="checkbox" checked={st.is_completed} onChange={e => {
                      const updated = [...form.subtasks]; updated[idx].is_completed = e.target.checked; setForm(p => ({ ...p, subtasks: updated }));
                    }} className="w-3.5 h-3.5 accent-indigo-500 rounded" />
                    <span className={`text-xs ${st.is_completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{st.title}</span>
                  </div>
                  <button type="button" onClick={() => removeSubtask(idx)} className="text-red-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input-glass flex-1 text-sm py-1.5" placeholder="Add a subtask..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }} />
              <button type="button" onClick={addSubtask} className="btn-secondary py-1.5 px-3 whitespace-nowrap"><Plus className="w-4 h-4"/></button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    const [{ data: t, error }, { data: e }] = await Promise.all([
      supabase.from('tasks').select('*, assignee:assignee_id(full_name, avatar_url), creator:created_by(full_name, avatar_url), subtasks(id, title, is_completed)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'employee'),
    ])
    if (error) console.error("Tasks fetch error:", error)
    setTasks(t || [])
    setEmployees(e || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    const sub = supabase.channel('tasks-admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', id)
    toast.success('Task deleted')
  }

  const handleDragEnd = async (result) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result
    
    // Default Drag within same column: Just reorder locally for UI smoothness
    if (source.droppableId === destination.droppableId) {
      if (source.index === destination.index) return;
      // Reordering logic could be added here if we save 'order' in DB
      return; 
    }

    // Moving across columns updates status
    const newStatus = destination.droppableId
    
    // Optimistic UI Update
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t))

    // DB Update
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', draggableId)
    if (error) {
      toast.error('Failed to move task: ' + error.message)
      fetchAll() // Revert to DB state
    } else {
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}`)
    }
  }

  const filtered = tasks.filter(t => {
    const matchSearch = t.title?.toLowerCase().includes(search.toLowerCase())
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority
    return matchSearch && matchPriority
  })

  // Group tasks by status for columns
  const columnsData = COLUMNS.map(col => ({
    ...col,
    tasks: filtered.filter(t => t.status === col.id)
  }))

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in fade-in-up pb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Task Management</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Workspace Kanban Board</p>
        </div>
        <button onClick={() => { setEditTask(null); setShowModal(true) }} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input className="input-glass pl-9" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-glass w-auto cursor-pointer" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin"/></div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-1 gap-6 overflow-x-auto pb-4 snap-x">
            {columnsData.map((column) => (
              <div key={column.id} className="flex-1 min-w-[300px] max-w-[400px] flex flex-col gap-4 rounded-2xl p-4 snap-center" style={{ background: 'var(--surface)', border: `1px solid var(--border)` }}>
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: column.color, boxShadow: `0 0 8px ${column.color}` }} />
                    <h3 className="font-bold text-sm tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>{column.title}</h3>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                    {column.tasks.length}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 flex flex-col gap-3 min-h-[150px] transition-colors rounded-xl p-1 `}
                      style={{ background: snapshot.isDraggingOver ? 'var(--surface-hover)' : 'transparent' }}
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`glass-card p-4 flex flex-col gap-3 group transition-transform ${snapshot.isDragging ? 'rotate-2 scale-105 z-50' : ''}`}
                              style={{ ...provided.draggableProps.style, boxShadow: snapshot.isDragging ? `0 10px 25px rgba(0,0,0,0.3)` : '' }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <GripVertical className="w-4 h-4 mt-0.5 opacity-30 group-hover:opacity-100 transition-opacity cursor-grab" style={{ color: 'var(--text-muted)' }} />
                                  <p className="text-sm font-semibold leading-tight line-clamp-2" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditTask(task); setShowModal(true) }} className="p-1 rounded hover:bg-white/10" style={{ color: 'var(--text-muted)' }}><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDelete(task.id)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                              
                              {task.description && <p className="text-xs line-clamp-2 pl-6" style={{ color: 'var(--text-muted)' }}>{task.description}</p>}
                              
                              {task.subtasks?.length > 0 && (
                                <div className="pl-6 w-full mt-1">
                                  <div className="flex items-center justify-between text-[10px] mb-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="flex items-center gap-1"><ListTodo className="w-3 h-3"/> {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}</span>
                                    <span>{Math.round((task.subtasks.filter(s => s.is_completed).length / task.subtasks.length) * 100)}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(task.subtasks.filter(s => s.is_completed).length / task.subtasks.length) * 100}%` }} />
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex pl-6 items-center justify-between mt-1">
                                <span className={`badge ${priorityColors[task.priority] || 'badge-info'} capitalize`}>{task.priority}</span>
                                
                                <div className="flex items-center gap-2">
                                  {task.deadline && (
                                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                  )}
                                  <div className="w-6 h-6 rounded-full overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }} title={task.assignee?.full_name || 'Unassigned'}>
                                    {task.assignee?.avatar_url ? (
                                      <img src={task.assignee.avatar_url} alt="Assignee" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-600">
                                        <User className="w-3 h-3 text-white" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <TaskModal task={editTask} employees={employees} onClose={() => { setShowModal(false); setEditTask(null) }} onSaved={fetchAll} />
        )}
      </AnimatePresence>
    </div>
  )
}
