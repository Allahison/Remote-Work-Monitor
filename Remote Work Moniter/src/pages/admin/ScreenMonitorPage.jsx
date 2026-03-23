import { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Monitor, Expand, Shrink, WifiOff, Grid2x2, Grid3x3 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

// Simple WebRTC viewer component
const RemoteScreen = forwardRef(({ employee, streamId, offer, onAnswer, onIceCandidate, screenIndex }, ref) => {
  const videoRef = useRef(null)
  const fsVideoRef = useRef(null)
  const pcRef = useRef(null)
  const pendingCandidates = useRef([])
  const [connected, setConnected] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useImperativeHandle(ref, () => ({
    addCandidate: async (candidate) => {
      if (pcRef.current?.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          console.error('Error adding ICE candidate', e)
        }
      } else {
        pendingCandidates.current.push(candidate)
      }
    }
  }))

  useEffect(() => {
    if (!offer) return

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    pcRef.current = pc
    pendingCandidates.current = []

    pc.ontrack = (e) => {
      setConnected(true)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = e.streams[0]
        if (fsVideoRef.current) fsVideoRef.current.srcObject = e.streams[0]
      }, 0)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') setConnected(false)
      if (pc.connectionState === 'connected') setConnected(true)
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && onIceCandidate) onIceCandidate(e.candidate, streamId)
    }

    const init = async () => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      for (const c of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error)
      }
      pendingCandidates.current = []
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      onAnswer(answer, employee.id, streamId)
    }
    init()

    return () => { pc.close() }
  }, [offer, employee.id, streamId, onAnswer, onIceCandidate])

  // Sync stream to fullscreen video when entering fullscreen
  useEffect(() => {
    if (fullscreen && fsVideoRef.current && videoRef.current?.srcObject) {
      fsVideoRef.current.srcObject = videoRef.current.srcObject
    }
  }, [fullscreen])

  const label = `${employee.full_name}${screenIndex !== undefined ? ` (Screen ${screenIndex + 1})` : ''}`

  const statusDot = (
    <div
      className={`status-dot ${connected ? 'status-online' : 'status-offline'}`}
    />
  )

  const offlineContent = (color = 'var(--text-muted)') => (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color }}>
      {offer ? (
        <>
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p style={{ fontSize: 13 }}>Connecting stream...</p>
        </>
      ) : (
        <>
          <WifiOff style={{ width: 32, height: 32, opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>Screen not shared</p>
        </>
      )}
    </div>
  )

  return (
    <>
      {/* Normal card */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card overflow-hidden relative"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            {statusDot}
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
          </div>
          <button
            onClick={() => setFullscreen(true)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Full Screen"
          >
            <Expand className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${connected ? 'opacity-100' : 'opacity-0'}`}
          />
          {!connected && offlineContent()}
        </div>
      </motion.div>

      {/* Fullscreen overlay via React Portal — renders directly in <body>, escapes all parent CSS */}
      {fullscreen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            background: '#000',
          }}
        >
          {/* Fullscreen header with Small Screen button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: connected ? '#22c55e' : '#ef4444',
                  boxShadow: connected ? '0 0 6px #22c55e' : 'none',
                }}
              />
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{label}</span>
            </div>
            <button
              onClick={() => setFullscreen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              <Shrink style={{ width: 16, height: 16 }} />
              Small Screen
            </button>
          </div>

          {/* Fullscreen video area */}
          <div style={{ flex: 1, position: 'relative', background: '#000' }}>
            <video
              ref={fsVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: connected ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            />
            {!connected && offlineContent('#888')}
          </div>
        </div>,
        document.body
      )}
    </>
  )
})

export default function ScreenMonitorPage() {
  const [employees, setEmployees] = useState([])
  const [offers, setOffers] = useState({}) // { [employeeId]: { [streamId]: offer } }
  const [gridSize, setGridSize] = useState(2)
  const channelRefs = useRef({})
  const screenRefs = useRef({}) // { [streamId]: ref }
  const candidateQueues = useRef({}) // { [streamId]: candidate[] }

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'employee')
    setEmployees(data || [])
  }, [])

  useEffect(() => {
    fetchEmployees()

    const sub = supabase
      .channel('monitor-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.employee' }, () => {
        fetchEmployees()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [fetchEmployees])

  useEffect(() => {
    employees.forEach(emp => {
      if (channelRefs.current[emp.id]) return

      const ch = supabase
        .channel(`webrtc-${emp.id}`)
        .on('broadcast', { event: 'offer' }, ({ payload }) => {
          const { offer, streamId } = payload
          setOffers(prev => ({
            ...prev,
            [emp.id]: {
              ...(prev[emp.id] || {}),
              [streamId]: offer
            }
          }))
        })
        .on('broadcast', { event: 'ice-employee' }, ({ payload }) => {
          const { candidate, streamId } = payload
          if (screenRefs.current[streamId]) {
            screenRefs.current[streamId].addCandidate(candidate)
          } else {
            if (!candidateQueues.current[streamId]) candidateQueues.current[streamId] = []
            candidateQueues.current[streamId].push(candidate)
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            ch.send({ type: 'broadcast', event: 'request_offer' })
          }
        })
      channelRefs.current[emp.id] = ch
    })

    const currentEmpIds = new Set(employees.map(e => e.id))
    Object.keys(channelRefs.current).forEach(id => {
      if (!currentEmpIds.has(id)) {
        supabase.removeChannel(channelRefs.current[id])
        delete channelRefs.current[id]
      }
    })
  }, [employees])

  const mountScreen = useCallback((el, streamId) => {
    if (el) {
      screenRefs.current[streamId] = el
      if (candidateQueues.current[streamId]?.length > 0) {
        candidateQueues.current[streamId].forEach(c => el.addCandidate(c))
        candidateQueues.current[streamId] = []
      }
    } else {
      delete screenRefs.current[streamId]
    }
  }, [])

  const handleAnswer = useCallback(async (answer, empId, streamId) => {
    const ch = channelRefs.current[empId]
    if (ch) {
      ch.send({ type: 'broadcast', event: 'answer', payload: { answer, streamId } })
    }
  }, [])

  const handleIceCandidate = useCallback((candidate, streamId) => {
    let empId = null
    for (const [id, streams] of Object.entries(offers)) {
      if (streams[streamId]) {
        empId = id
        break
      }
    }

    if (empId && channelRefs.current[empId]) {
      channelRefs.current[empId].send({
        type: 'broadcast',
        event: 'ice-admin',
        payload: { candidate, streamId }
      })
    }
  }, [offers])

  const cols = gridSize === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'

  const allScreens = []
  employees.forEach(emp => {
    const streams = offers[emp.id] || {}
    const streamIds = Object.keys(streams)

    if (streamIds.length === 0) {
      allScreens.push({ type: 'placeholder', emp, id: emp.id })
    } else {
      streamIds.forEach((sid, index) => {
        allScreens.push({ type: 'stream', emp, sid, offer: streams[sid], index, id: sid })
      })
    }
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Screen Monitor</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Live employee screen streams</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGridSize(2)}
            className={`p-2 rounded-lg border transition-colors ${gridSize === 2 ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'text-[var(--text-muted)] border-[var(--border)]'}`}
          >
            <Grid2x2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGridSize(3)}
            className={`p-2 rounded-lg border transition-colors ${gridSize === 3 ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'text-[var(--text-muted)] border-[var(--border)]'}`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center gap-4" style={{ color: 'var(--text-muted)' }}>
          <Monitor className="w-12 h-12 opacity-30" />
          <p className="text-sm">No employees found. Invite your team to get started!</p>
        </div>
      ) : (
        <div className={`grid ${cols} gap-4 pb-20`}>
          {allScreens.map(screen => (
            screen.type === 'placeholder' ? (
              <RemoteScreen
                key={screen.id}
                employee={screen.emp}
                offer={null}
              />
            ) : (
              <RemoteScreen
                key={screen.id}
                ref={el => mountScreen(el, screen.sid)}
                employee={screen.emp}
                streamId={screen.sid}
                offer={screen.offer}
                screenIndex={screen.index}
                onAnswer={handleAnswer}
                onIceCandidate={handleIceCandidate}
              />
            )
          ))}
        </div>
      )}
    </div>
  )
}
