import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Search, Flag, User, GripVertical, ListTodo, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

const priorityColors = {
  high: 'badge-danger',
  medium: 'badge-warning',
  low: 'badge-success',
}

const COLUMNS = [
  { id: 'pending', title: 'To Do', color: 'var(--warning)', bg: 'bg-amber-500/10' },
  { id: 'in_progress', title: 'In Progress', color: 'var(--brand)', bg: 'bg-brand-500/10' },
  { id: 'completed', title: 'Done', color: 'var(--success)', bg: 'bg-green-500/10' },
]

function TaskDetailsModal({ task, onClose, onAction }) {
  const [subtasks, setSubtasks] = useState(task.subtasks || [])

  const handleToggle = async (id, currentVal) => {
    const newVal = !currentVal;
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, is_completed: newVal } : s))
    const { error } = await supabase.from('subtasks').update({ is_completed: newVal }).eq('id', id)
    if (error) {
      toast.error('Failed to update subtask')
      setSubtasks(prev => prev.map(s => s.id === id ? { ...s, is_completed: currentVal } : s))
    } else {
      onAction()
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="glass-card w-full max-w-lg p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold font-heading" style={{ color: 'var(--text-primary)' }}>{task.title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X className="w-5 h-5"/></button>
        </div>
        {task.description && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{task.description}</p>}
        {subtasks.length > 0 ? (
          <div className="mt-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Checklist</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {subtasks.map(s => (
                <label key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)] cursor-pointer hover:bg-white/5 transition-colors border border-[var(--border)] group">
                  <input type="checkbox" checked={s.is_completed} onChange={() => handleToggle(s.id, s.is_completed)} className="w-4 h-4 accent-indigo-500 rounded cursor-pointer" />
                  <span className={`text-sm transition-all ${s.is_completed ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--text-primary)' }}>{s.title}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-[var(--text-muted)] text-sm">No subtasks for this task.</div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function MyTasksPage() {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)

  const fetchTasks = async () => {
    if (!user) return
    const { data, error } = await supabase.from('tasks')
      .select('*, creator:created_by(full_name, avatar_url), subtasks(id, title, is_completed)')
      .eq('assignee_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) console.error("Fetch tasks error:", error)
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
    const sub = supabase.channel('my-tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${user?.id}` }, fetchTasks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, fetchTasks)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [user])

  const handleDragEnd = async (result) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result
    
    if (source.droppableId === destination.droppableId) {
      if (source.index === destination.index) return;
      return; 
    }

    const newStatus = destination.droppableId
    const taskToMove = tasks.find(t => t.id === draggableId)
    
    // Optimistic UI Update
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t))

    // DB Update
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', draggableId)
    if (error) {
      toast.error('Failed to move task')
      fetchTasks() // Revert
    } else {
      toast.success(`Moved to ${newStatus.replace('_', ' ')}`)
      // Notify Admin
      if (taskToMove?.created_by) {
        await supabase.from('notifications').insert({
          user_id: taskToMove.created_by,
          type: 'task',
          title: 'Task Status Updated',
          message: `${profile?.full_name || 'An employee'} moved "${taskToMove.title}" to ${newStatus.replace('_', ' ')}`
        })
      }
    }
  }

  const filtered = tasks.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()))

  const columnsData = COLUMNS.map(col => ({
    ...col,
    tasks: filtered.filter(t => t.status === col.id)
  }))

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in fade-in-up pb-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Tasks</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Drag and drop to update task status</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input className="input-glass pl-9" placeholder="Search your tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin"/></div>
      ) : tasks.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center gap-3" style={{ color: 'var(--text-muted)' }}>
          <Flag className="w-10 h-10 opacity-30" />
          <p className="text-sm">You have no assigned tasks yet.</p>
        </div>
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
                              <div className="flex items-start gap-2">
                                <GripVertical className="w-4 h-4 mt-0.5 opacity-30 group-hover:opacity-100 transition-opacity cursor-grab" style={{ color: 'var(--text-muted)' }} />
                                <button type="button" onClick={() => setSelectedTask(task)} className="text-left w-full hover:opacity-80 transition-opacity">
                                  <p className={`text-sm font-semibold leading-tight line-clamp-2 ${task.status === 'completed' ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                                </button>
                              </div>
                              
                              {task.description && <p className={`text-xs line-clamp-2 pl-6 ${task.status === 'completed' ? 'opacity-50' : ''}`} style={{ color: 'var(--text-muted)' }}>{task.description}</p>}
                              
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
                                  <div className="w-6 h-6 rounded-full overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }} title={`Assigned by ${task.creator?.full_name || 'Admin'}`}>
                                    {task.creator?.avatar_url ? (
                                      <img src={task.creator.avatar_url} alt="Creator" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-purple-600">
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

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} onAction={fetchTasks} />
        )}
      </AnimatePresence>
    </div>
  )
}
