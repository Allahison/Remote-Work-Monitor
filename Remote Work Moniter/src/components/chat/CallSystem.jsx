import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import VideoCallOverlay from './VideoCallOverlay'
import toast from 'react-hot-toast'

export default function CallSystem() {
  const { user } = useAuth()
  const [activeCall, setActiveCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  
  const pcRef = useRef(null)

  // 1. Initialize PeerConnection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('candidate', event.candidate.toJSON())
      }
    }

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }

    pcRef.current = pc
    return pc
  }

  const sendSignal = async (type, data) => {
    if (!activeCall) return
    const { error } = await supabase.from('calls').insert({
      type,
      data,
      sender_id: user.id,
      receiver_id: activeCall.receiver_id === user.id ? activeCall.sender_id : activeCall.receiver_id,
      channel_id: activeCall.channel_id || null
    })
    if (error) console.error('Signaling error:', error)
  }

  // 2. Listen for signaling
  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('rtc-signaling')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'calls'
      }, async (payload) => {
        const { type, data, sender_id, receiver_id, channel_id } = payload.new
        
        // Only process if it's for me OR a channel I'm in
        const forMe = receiver_id === user.id
        const isHuddle = channel_id && !receiver_id
        if (!forMe && !isHuddle) return
        if (sender_id === user.id) return // Ignore my own signals
        
        if (type === 'offer') {
          if (activeCall) return // Busy
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          setLocalStream(stream)
          setActiveCall({ sender_id, receiver_id: user.id })
          
          const pc = createPeerConnection()
          stream.getTracks().forEach(track => pc.addTrack(track, stream))
          
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          
          await supabase.from('calls').insert({
            type: 'answer',
            data: answer,
            sender_id: user.id,
            receiver_id: sender_id
          })
          toast('Incoming Video Call...')
        }

        if (type === 'answer' && pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data))
        }

        if (type === 'candidate' && pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data))
          } catch (e) { console.error('Error adding ICE candidate', e) }
        }

        if (type === 'hangup') {
          handleHangup(false)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, activeCall])

  const handleHangup = (shouldNotify = true) => {
    if (shouldNotify && activeCall) {
      sendSignal('hangup', {})
    }
    
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }

    setLocalStream(null)
    setRemoteStream(null)
    setActiveCall(null)
  }

  // Handle Mute/Video toggle
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !isMuted)
      localStream.getVideoTracks().forEach(t => t.enabled = isVideoOn)
    }
  }, [isMuted, isVideoOn, localStream])

  // Global trigger for starting a call (custom event)
  useEffect(() => {
    const handleStartCall = async (e) => {
      const { userId, channelId } = e.detail
      if (activeCall) {
        toast.error('You are already in a call.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      setActiveCall({ sender_id: user.id, receiver_id: userId, channel_id: channelId })

      const pc = createPeerConnection()
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
      
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await supabase.from('calls').insert({
        type: 'offer',
        data: offer,
        sender_id: user.id,
        receiver_id: userId,
        channel_id: channelId
      })
      toast('Calling team member...')
    }

    window.addEventListener('start-rtc-call', handleStartCall)
    return () => window.removeEventListener('start-rtc-call', handleStartCall)
  }, [user, activeCall])

  if (!activeCall) return null

  return (
    <VideoCallOverlay 
      call={activeCall}
      localStream={localStream}
      remoteStream={remoteStream}
      onHangup={() => handleHangup(true)}
      isMuted={isMuted}
      setIsMuted={setIsMuted}
      isVideoOn={isVideoOn}
      setIsVideoOn={setIsVideoOn}
    />
  )
}
