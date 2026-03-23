import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Square, Monitor, MonitorOff, Clock, CheckSquare, Zap, TrendingUp } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { startSession, stopSession, tickSecond, setIdle, setSharing } from '../../store/slices/sessionSlice'
import { addNotification } from '../../store/slices/notificationsSlice'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'

function formatTime(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

export default function EmployeeDashboard() {
  const dispatch = useDispatch()
  const { user, profile } = useAuth()
  const session = useSelector(state => state.session)
  const [myTasks, setMyTasks] = useState([])
  const timerRef = useRef(null)
  const idleTimerRef = useRef(null)
  const idleThreshold = 180 // 3 minutes of no activity
  const lastActivityRef = useRef(Date.now())
  const pcRef = useRef(null)
  const streamRef = useRef(null)

  // Fetch tasks
  useEffect(() => {
    if (!user) return
    supabase.from('tasks').select('*').eq('assignee_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setMyTasks(data || []))
    const sub = supabase.channel('emp-tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async (payload) => {
        // Refresh only if it involves this user or we don't know (DELETE case)
        if (!payload.new || payload.new.assignee_id === user.id || payload.old?.assignee_id === user.id) {
          const { data } = await supabase.from('tasks').select('*').eq('assignee_id', user.id).order('created_at', { ascending: false })
          setMyTasks(data || [])
        }
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [user])

  // Session timer
  useEffect(() => {
    if (session.isActive) {
      timerRef.current = setInterval(() => dispatch(tickSecond()), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [session.isActive, dispatch])

  // Idle detection
  useEffect(() => {
    const resetIdle = () => { lastActivityRef.current = Date.now() }
    window.addEventListener('mousemove', resetIdle)
    window.addEventListener('keydown', resetIdle)
    window.addEventListener('click', resetIdle)

    const notifyAdmins = async (status) => {
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
      if (admins) {
        const title = status === 'idle' ? 'Employee Idle' : status === 'active' ? 'Employee Active' : 'Session Ended'
        const message = `${profile?.full_name || 'An employee'} is now ${status}`
        const notifications = admins.map(a => ({ user_id: a.id, type: 'alert', title, message }))
        await supabase.from('notifications').insert(notifications)
      }
    }

    idleTimerRef.current = setInterval(() => {
      if (!session.isActive) return
      const idle = (Date.now() - lastActivityRef.current) / 1000 > idleThreshold
      if (idle && !session.isIdle) {
        dispatch(setIdle(true))
        dispatch(addNotification({ id: uuidv4(), type: 'idle', title: 'Idle Detected', message: 'You have been idle for 3 minutes.', read: false, created_at: new Date().toISOString() }))
        toast('Idle detected. Session automatically paused.', { icon: '⚠️' })
        // Update DB
        if (user) {
          supabase.from('profiles').update({ status: 'idle' }).eq('id', user.id).then(() => notifyAdmins('idle'))
        }
      } else if (!idle && session.isIdle) {
        dispatch(setIdle(false))
        if (user) {
          supabase.from('profiles').update({ status: 'active' }).eq('id', user.id).then(() => notifyAdmins('active'))
        }
      }
    }, 10000)

    return () => {
      window.removeEventListener('mousemove', resetIdle)
      window.removeEventListener('keydown', resetIdle)
      window.removeEventListener('click', resetIdle)
      clearInterval(idleTimerRef.current)
    }
  }, [session.isActive, session.isIdle, dispatch, user])

  const notifyAdminsGlobal = async (status) => {
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
    if (admins) {
      const notifications = admins.map(a => ({ 
        user_id: a.id, type: 'alert', title: 'Session Update', message: `${profile?.full_name || 'An employee'} is now ${status}` 
      }))
      await supabase.from('notifications').insert(notifications)
    }
  }

  const handleStartSession = async () => {
    const sessionId = uuidv4()
    dispatch(startSession({ sessionId, startTime: new Date().toISOString() }))
    if (user) {
      await supabase.from('work_sessions').insert({ id: sessionId, user_id: user.id, started_at: new Date().toISOString() })
      await supabase.from('profiles').update({ status: 'active' }).eq('id', user.id)
      await notifyAdminsGlobal('active')
    }
    toast.success('Work session started.')
  }

  const handleStopSession = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (user && session.sessionId) {
      await supabase.from('work_sessions').update({ ended_at: new Date().toISOString(), duration_seconds: session.elapsedSeconds }).eq('id', session.sessionId)
      await supabase.from('profiles').update({ status: 'offline', last_seen: new Date().toISOString() }).eq('id', user.id)
      await notifyAdminsGlobal('offline')
    }
    dispatch(stopSession())
    toast.success('Work session ended.')
  }

  const chRef = useRef(null)
  const pendingCandidates = useRef([])

  const handleShareScreen = async () => {
    if (!session.isActive) { toast.error('Start a session first'); return }
    try {
      const streamId = uuidv4()
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      streamRef.current = stream
      dispatch(setSharing(true))
      toast.success('Screen sharing started!')

      const ch = supabase.channel(`webrtc-${user.id}`)
      chRef.current = ch

      const startWebRTC = async () => {
        if (pcRef.current) pcRef.current.close()
        pendingCandidates.current = []
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
        pcRef.current = pc
        stream.getTracks().forEach(t => pc.addTrack(t, stream))
        
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            chRef.current?.send({ 
              type: 'broadcast', 
              event: 'ice-employee', 
              payload: { candidate: e.candidate, streamId } 
            })
          }
        }
        
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        chRef.current?.send({ 
          type: 'broadcast', 
          event: 'offer', 
          payload: { offer, streamId, employeeName: profile?.full_name } 
        })
      }

      ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.streamId !== streamId) return
        if (pcRef.current && pcRef.current.signalingState !== 'stable') {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer))
          pendingCandidates.current.forEach(c => {
            pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(console.error)
          })
          pendingCandidates.current = []
        }
      }).on('broadcast', { event: 'ice-admin' }, async ({ payload }) => {
        if (payload.streamId !== streamId) return
        if (pcRef.current) {
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.error)
          } else {
            pendingCandidates.current.push(payload.candidate)
          }
        }
      }).on('broadcast', { event: 'request_offer' }, async () => {
        if (streamRef.current) await startWebRTC()
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await startWebRTC()
        }
      })

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        dispatch(setSharing(false))
        streamRef.current = null
        if (pcRef.current) pcRef.current.close()
        if (chRef.current) supabase.removeChannel(chRef.current)
        toast.success('Screen sharing stopped.')
      })
    } catch (e) {
      if (e.name !== 'AbortError') toast.error('Could not start screen sharing')
    }
  }

  const handleStopSharing = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
    dispatch(setSharing(false))
    toast.success('Screen sharing stopped.')
  }

  const pending = myTasks.filter(t => t.status === 'pending').length
  const inProgress = myTasks.filter(t => t.status === 'in_progress').length
  const completed = myTasks.filter(t => t.status === 'completed').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {session.isActive ? `Session active · ${session.isIdle ? '😴 Idle' : '✅ Focused'}` : 'Start your work session to begin tracking'}
        </p>
      </div>

      {/* Session Control */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Timer */}
          <div className="flex flex-col items-center">
            <div className={`text-4xl font-bold font-mono tabular-nums ${session.isActive ? (session.isIdle ? 'text-amber-400' : 'gradient-text') : ''}`}
              style={{ color: session.isActive ? undefined : 'var(--text-muted)' }}>
              {formatTime(session.elapsedSeconds)}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {session.isActive ? (session.isIdle ? 'IDLE' : 'WORKING') : 'NOT STARTED'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3 justify-center sm:justify-start flex-1">
            {!session.isActive ? (
              <button onClick={handleStartSession} className="btn-primary flex items-center gap-2">
                <Play className="w-4 h-4" /> Start Work Session
              </button>
            ) : (
              <button onClick={handleStopSession} className="btn-danger flex items-center gap-2">
                <Square className="w-4 h-4" /> Stop Session
              </button>
            )}

            {session.isActive && !session.isSharing && (
              <button onClick={handleShareScreen} className="btn-secondary flex items-center gap-2">
                <Monitor className="w-4 h-4 text-brand-400" /> Share Screen
              </button>
            )}
            {session.isSharing && (
              <button onClick={handleStopSharing} className="btn-secondary flex items-center gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
                <MonitorOff className="w-4 h-4" /> Stop Sharing
              </button>
            )}
          </div>

          {/* Status pills */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className={`status-dot ${session.isActive && !session.isIdle ? 'status-online' : session.isActive ? 'status-idle' : 'status-offline'}`} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {session.isActive ? (session.isIdle ? 'Idle' : 'Active') : 'Offline'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${session.isSharing ? 'bg-brand-400' : 'bg-gray-600'}`} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {session.isSharing ? 'Screen Shared' : 'Not Sharing'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Task stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending, color: '#f59e0b' },
          { label: 'In Progress', value: inProgress, color: '#6c63ff' },
          { label: 'Completed', value: completed, color: '#22c55e' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            className="stat-card"
          >
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>My Recent Tasks</h2>
          <a href="/tasks" className="text-xs hover:underline" style={{ color: 'var(--brand-light)' }}>View all →</a>
        </div>
        {myTasks.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No tasks assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {myTasks.slice(0, 4).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                <CheckSquare className={`w-4 h-4 flex-shrink-0 ${task.status === 'completed' ? 'text-green-400' : 'text-brand-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--text-primary)' }}>
                    {task.title}
                  </p>
                  {task.deadline && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Due: {new Date(task.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`badge capitalize ${task.status === 'pending' ? 'badge-warning' : task.status === 'in_progress' ? 'badge-brand' : 'badge-success'}`}>
                  {task.status?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
