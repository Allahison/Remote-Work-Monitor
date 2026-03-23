import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2, User } from 'lucide-react'

export default function VideoCallOverlay({ 
  call, 
  localStream, 
  remoteStream, 
  onHangup, 
  isMuted, 
  setIsMuted, 
  isVideoOn, 
  setIsVideoOn 
}) {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const containerVariants = {
    maximized: { bottom: '2rem', right: '2rem', width: '400px', height: '560px' },
    minimized: { bottom: '1rem', right: '1rem', width: '280px', height: '80px' }
  }

  return (
    <motion.div
      variants={containerVariants}
      animate={isMinimized ? 'minimized' : 'maximized'}
      className="fixed z-[60] glass-card shadow-2xl overflow-hidden flex flex-col border border-white/20"
      style={{ backdropFilter: 'blur(16px)', background: 'rgba(15, 15, 20, 0.85)' }}
    >
      {/* Remote Video / Main Stage */}
      {!isMinimized && (
        <div className="relative flex-1 bg-black/40 overflow-hidden">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center animate-pulse">
                <User className="w-12 h-12 text-indigo-400" />
              </div>
              <p className="text-sm font-medium animate-pulse text-indigo-300">Connecting...</p>
            </div>
          )}
          
          {/* Local Video Preview (Picture-in-Picture) */}
          <div className="absolute top-4 right-4 w-32 aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/10 shadow-lg">
            {isVideoOn ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900 border border-white/10">
                <VideoOff className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>

          <div className="absolute top-4 left-4">
            <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-indigo-400 border border-indigo-500/30">
              Live Connection
            </div>
          </div>
        </div>
      )}

      {/* Info Row (Minimized mode) */}
      {isMinimized && (
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
              <Phone className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Active Call</p>
              <p className="text-[10px] text-indigo-300">Click to expand</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMinimized(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={onHangup} className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors text-white shadow-lg">
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Controls Foot (Maximized mode) */}
      {!isMinimized && (
        <div className="p-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                !isVideoOn ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {!isVideoOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={onHangup}
              className="w-16 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            <button
              onClick={() => setIsMinimized(true)}
              className="w-12 h-12 rounded-2xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all shadow-lg"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
