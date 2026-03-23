import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Hash, MessageSquare, Smile, Shield, Search, Paperclip, X, File, Download, Video } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { setChannels, setActiveChannel, setActiveConversationId, setMessages, addMessage, setTypingUsers } from '../store/slices/chatSlice'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import EmojiPicker from 'emoji-picker-react'
import toast from 'react-hot-toast'

const SYSTEM_CHANNELS = [
  { id: 'general', name: 'general', description: 'For all team members' },
  { id: 'announcements', name: 'announcements', description: 'Important updates' },
  { id: 'random', name: 'random', description: 'Off-topic conversations' },
]

export default function ChatPage() {
  const dispatch = useDispatch()
  const { user, profile } = useAuth()
  const { activeChannelId, activeConversationId, messages, typingUsers } = useSelector(state => state.chat)
  
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [activeMode, setActiveMode] = useState('channel')
  const [targetUser, setTargetUser] = useState(null)
  const [users, setUsers] = useState([])
  const [dmConversations, setDmConversations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const bottomRef = useRef(null)
  const chatSubRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const fileInputRef = useRef(null)

  const currentContextId = activeMode === 'channel' ? activeChannelId : activeConversationId
  const activeChannel = activeMode === 'channel' ? (SYSTEM_CHANNELS.find(c => c.id === activeChannelId) || SYSTEM_CHANNELS[0]) : null

  /* 
  const fetchConversations = async () => {
    const { data: convs } = await supabase
      .from('conversations')
...
  }
  */

  useEffect(() => {
    dispatch(setChannels(SYSTEM_CHANNELS))
    if (!activeChannelId && !activeConversationId) dispatch(setActiveChannel('general'))
    fetchUsers()

    // Handle click outside emoji picker
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').neq('id', user?.id)
    setUsers(data || [])
  }

  useEffect(() => {
    const contextId = activeMode === 'channel' ? activeChannelId : activeConversationId
    if (!contextId) return
    loadMessages(contextId, activeMode)
    subscribeToChat(contextId, activeMode)
    return () => { if (chatSubRef.current) supabase.removeChannel(chatSubRef.current) }
  }, [activeChannelId, activeConversationId, activeMode])

  useEffect(() => {
    // Immediate scroll on list change
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'instant' })
    }
    // Smooth scroll for new messages
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
    return () => clearTimeout(timer)
  }, [messages[currentContextId]])

  const loadMessages = async (id, mode) => {
    const query = supabase.from('messages').select('*')

    if (mode === 'channel') {
      query.eq('channel_id', id)
    } else {
      query.eq('conversation_id', id)
    }

    const { data: msgs, error: msgErr } = await query.order('created_at', { ascending: true }).limit(80)
    
    if (msgErr) {
      console.error('Fetch messages error:', msgErr)
      toast.error('Could not load messages')
      return
    }

    if (msgs && msgs.length > 0) {
      const senderIds = [...new Set(msgs.map(m => m.sender_id))]
      const { data: profs, error: profErr } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds)
      
      if (profErr) console.error('Fetch profiles error:', profErr)

      const enriched = msgs.map(m => ({
        ...m,
        profiles: profs?.find(p => p.id === m.sender_id) || null
      }))
      dispatch(setMessages({ channelId: id, messages: enriched }))
    } else {
      dispatch(setMessages({ channelId: id, messages: [] }))
    }
  }

  const subscribeToChat = (id, mode) => {
    if (chatSubRef.current) supabase.removeChannel(chatSubRef.current)

    const ch = supabase
      .channel(`chat-room-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async ({ new: msg }) => {
        // Use `mode` param (not `activeMode` state) to avoid stale closure bug
        const isMatch = mode === 'channel' ? msg.channel_id === id : msg.conversation_id === id
        if (!isMatch) return

        let profileData = users.find(u => u.id === msg.sender_id)
        if (!profileData && msg.sender_id === user?.id) profileData = profile
        if (!profileData) {
          const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', msg.sender_id).single()
          profileData = data
        }
        dispatch(addMessage({ channelId: id, message: { ...msg, profiles: profileData } }))
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === user?.id) return
        if (payload.channelId !== id) return

        dispatch((dispatchState, getState) => {
          const currentTyping = getState().chat.typingUsers[id] || []
          let newTyping = [...currentTyping]
          
          if (payload.typing) {
            if (!newTyping.includes(payload.userName)) newTyping.push(payload.userName)
          } else {
            newTyping = newTyping.filter(u => u !== payload.userName)
          }
          
          dispatchState(setTypingUsers({ channelId: id, users: newTyping }))
        })
      })
      .subscribe()

    chatSubRef.current = ch
  }

  const startPrivateChat = async (target) => {
    toast('Direct messaging has been disabled by the administrator.')
  }

  const handleEmojiClick = (emojiData) => {
    setInput(prev => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleTyping = () => {
    if (!typing) {
      setTyping(true)
      chatSubRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id, userName: profile?.full_name, typing: true, channelId: currentContextId } })
    }
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false)
      chatSubRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id, userName: profile?.full_name, typing: false, channelId: currentContextId } })
    }, 2000)
  }

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || !user || !currentContextId) return
    const content = input.trim()
    setInput('')
    setIsUploading(true)

    let attachmentUrl = null
    let attachmentName = null

    if (attachedFile) {
      const fileExt = attachedFile.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${currentContextId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, attachedFile)

      if (uploadError) {
        toast.error('Failed to upload file.')
        setIsUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath)

      attachmentUrl = publicUrl
      attachmentName = attachedFile.name
      setAttachedFile(null)
    }

    const msgId = uuidv4()
    const msgData = { 
      id: msgId, 
      sender_id: user.id, 
      content, 
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      created_at: new Date().toISOString() 
    }
    if (activeMode === 'channel') msgData.channel_id = activeChannelId
    else msgData.conversation_id = activeConversationId

    // ✅ Optimistic update
    dispatch(addMessage({
      channelId: currentContextId,
      message: { ...msgData, id: msgId, profiles: { full_name: profile?.full_name, avatar_url: profile?.avatar_url } }
    }))

    const { error } = await supabase.from('messages').insert(msgData)
    setIsUploading(false)
    if (error) {
      toast.error('Failed to send message')
      loadMessages(currentContextId, activeMode)
      return
    }

    const recipientIds = []
    if (activeMode === 'channel') {
      const { data: others } = await supabase.from('profiles').select('id').neq('id', user.id)
      if (others) recipientIds.push(...others.map(u => u.id))
    } else if (targetUser) {
      recipientIds.push(targetUser.id)
    }

    if (recipientIds.length > 0) {
      const title = activeMode === 'channel' ? `#${activeChannel?.name}` : `DM from ${profile?.full_name}`
      await supabase.from('notifications').insert(
        recipientIds.map(rid => ({ user_id: rid, type: 'chat', title, message: `${profile?.full_name}: "${content.substring(0, 40)}"` }))
      )
    }
  }

  const chanMsgs = messages[currentContextId] || []
  const currentTyping = typingUsers[currentContextId] || []
  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl shadow-xl border border-[var(--border)] animate-fade-in" style={{ background: 'var(--bg-secondary)' }}>
      
      {/* ── SIDEBAR ── */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-[var(--border)]" style={{ background: 'var(--bg-primary)' }}>
        
        {/* Profile header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-md flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{profile?.full_name}</p>
            <span className="inline-block text-[10px] font-semibold text-indigo-500 bg-indigo-500/10 rounded-full px-2 py-0.5 capitalize">{profile?.role}</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[var(--border)]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              style={{ background: 'var(--surface)' }}
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5">
          {/* Channels */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-2 mb-1.5">Channels</p>
            <div className="space-y-0.5">
              {SYSTEM_CHANNELS.map(ch => {
                const isActive = activeMode === 'channel' && activeChannelId === ch.id
                return (
                  <button
                    key={ch.id}
                    onClick={() => { setActiveMode('channel'); dispatch(setActiveChannel(ch.id)) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'}`}
                  >
                    <Hash className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{ch.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Direct Messages section removed per request */}
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)]" style={{ background: 'var(--bg-primary)' }}>
          {activeMode === 'channel' ? (
            <>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
                <Hash className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-[var(--text-primary)]">#{activeChannel?.name}</h2>
                <p className="text-xs text-[var(--text-muted)]">{activeChannel?.description}</p>
              </div>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('start-rtc-call', { detail: { channelId: activeChannelId } }))}
                className="btn-secondary px-4 py-2 flex items-center gap-2 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
              >
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Join Huddle</span>
              </button>
            </>
          ) : (
            <>
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden">
                  {targetUser?.avatar_url
                    ? <img src={targetUser.avatar_url} alt={targetUser.full_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-600 font-bold text-white">{targetUser?.full_name?.[0]?.toUpperCase()}</div>
                  }
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)] ${targetUser?.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-[var(--text-primary)] truncate">{targetUser?.full_name}</h2>
                <p className="text-xs flex items-center gap-1 text-emerald-500 font-medium">
                  <Shield className="w-3 h-3" /> End-to-End Encrypted
                </p>
              </div>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('start-rtc-call', { detail: { userId: targetUser?.id } }))}
                className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-all border border-brand-500/20"
                title="Start Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar space-y-1" style={{ background: 'var(--bg-secondary)' }}>
          {chanMsgs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center select-none">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
                <MessageSquare className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">No messages yet</p>
              <p className="text-xs text-[var(--text-muted)]">Be the first to say something!</p>
            </div>
          ) : (
            chanMsgs.map((msg, i) => {
              const isOwn = msg.sender_id === user?.id
              const isFirst = i === 0 || chanMsgs[i - 1]?.sender_id !== msg.sender_id
              const isLast = i === chanMsgs.length - 1 || chanMsgs[i + 1]?.sender_id !== msg.sender_id

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${isFirst ? 'mt-5' : 'mt-0.5'}`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                    {isFirst && !isOwn ? (
                      msg.profiles?.avatar_url
                        ? <img src={msg.profiles.avatar_url} alt="Sender" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-600 text-xs font-bold text-white">{msg.profiles?.full_name?.[0]?.toUpperCase() || '?'}</div>
                    ) : <div className="w-full h-full" />}
                  </div>

                  <div className={`flex flex-col gap-0.5 max-w-[68%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Sender name */}
                    {isFirst && !isOwn && (
                      <span className="text-xs font-semibold text-[var(--text-secondary)] px-1 mb-0.5">{msg.profiles?.full_name || 'Unknown'}</span>
                    )}

                    {/* Bubble */}
                    <div className={`px-4 py-2.5 text-sm leading-relaxed break-words font-medium ${
                      isOwn
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md shadow-md'
                        : 'text-[var(--text-primary)] border border-[var(--border)] rounded-2xl rounded-bl-md shadow-sm'
                    }`} style={isOwn ? {} : { background: 'var(--surface)' }}>
                      {msg.attachment_url && (
                        <div className="mb-2 max-w-[240px] rounded-lg overflow-hidden border border-white/20">
                          {msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                              <img src={msg.attachment_url} alt={msg.attachment_name || 'Attachment'} className="w-full h-auto max-h-48 object-cover hover:opacity-90 transition-opacity" />
                            </a>
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-3 hover:bg-white/10 transition-colors ${!isOwn ? 'bg-[var(--surface-hover)] hover:bg-[var(--border)]' : ''}`}>
                              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                <File className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate" style={!isOwn ? { color: 'var(--text-primary)' } : {}}>{msg.attachment_name || 'Attached File'}</p>
                                <p className="text-[10px] opacity-70 flex items-center gap-1"><Download className="w-3 h-3"/> Download</p>
                              </div>
                            </a>
                          )}
                        </div>
                      )}
                      {msg.content}
                    </div>

                    {/* Timestamp */}
                    {isLast && (
                      <span className="text-[10px] text-[var(--text-muted)] px-1 mt-0.5">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}

          {/* Typing */}
          {currentTyping.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mt-4">
              <div className="w-8 h-8 rounded-xl flex-shrink-0" />
              <div className="flex gap-1 px-4 py-2.5 rounded-2xl rounded-bl-md border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </div>
              <span className="text-xs text-[var(--text-muted)]">{currentTyping[0]} is typing...</span>
            </motion.div>
          )}

          <div ref={bottomRef} className="h-2" />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[var(--border)]" style={{ background: 'var(--bg-primary)' }}>
          {attachedFile && (
            <div className="mb-3 flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] relative" style={{ background: 'var(--surface-hover)' }}>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                <File className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{attachedFile.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{(attachedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={() => setAttachedFile(null)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl p-2 border border-[var(--border)] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all" style={{ background: 'var(--surface)' }}>
            
            {/* Attachment */}
            <input type="file" className="hidden" ref={fileInputRef} onChange={e => { if (e.target.files?.[0]) setAttachedFile(e.target.files[0]) }} />
            <button onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-indigo-500 hover:bg-[var(--surface-hover)] transition-colors flex-shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            {/* Emoji picker */}
            <div className="relative flex-shrink-0">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-indigo-500 hover:bg-[var(--surface-hover)] transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div ref={emojiPickerRef}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-3 z-50 rounded-2xl overflow-hidden shadow-2xl border border-[var(--border)]"
                  >
                    <EmojiPicker theme="auto" onEmojiClick={handleEmojiClick} width={300} height={350} skinTonesDisabled />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input text */}
            <input
              className="flex-1 bg-transparent border-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-0 outline-none"
              placeholder={activeMode === 'channel' ? `Message #${activeChannel?.name}...` : `Message ${targetUser?.full_name || ''}...`}
              value={input}
              onChange={e => { setInput(e.target.value); handleTyping() }}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />

            {/* Send */}
            <motion.button
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={(!input.trim() && !attachedFile) || isUploading}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              {isUploading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Send className="w-4 h-4" />}
            </motion.button>
          </div>
          <p className="text-center text-[10px] text-[var(--text-muted)] mt-2 opacity-60">
            Press Enter to send
          </p>
        </div>
      </div>
    </div>
  )
}
