import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  channels: [],
  activeChannelId: null,
  activeConversationId: null,
  messages: {},   // { [channelId]: Message[] }
  directMessages: {}, // { [userId]: Message[] }
  typingUsers: {}, // { [channelId]: string[] }
  unreadCounts: {}, // { [channelId]: number }
  loading: false,
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChannels: (state, action) => {
      state.channels = action.payload
    },
    setActiveChannel: (state, action) => {
      state.activeChannelId = action.payload
      state.activeConversationId = null // Clear conversation when switching to channel
      if (action.payload) {
        state.unreadCounts[action.payload] = 0
      }
    },
    setActiveConversationId: (state, action) => {
      state.activeConversationId = action.payload
      state.activeChannelId = null // Clear channel when switching to DM
      if (action.payload) {
        state.unreadCounts[action.payload] = 0
      }
    },
    setMessages: (state, action) => {
      const { channelId, messages } = action.payload
      state.messages[channelId] = messages
    },
    addMessage: (state, action) => {
      const { channelId, message } = action.payload
      if (!state.messages[channelId]) state.messages[channelId] = []
      
      // Prevent duplicates (optimistic update vs real-time)
      const exists = state.messages[channelId].some(m => m.id === message.id)
      if (!exists) {
        state.messages[channelId].push(message)
      }

      // Increment unread if not the active view
      const isActive = state.activeChannelId === channelId || state.activeConversationId === channelId
      if (!isActive) {
        state.unreadCounts[channelId] = (state.unreadCounts[channelId] || 0) + 1
      }
    },
    setTypingUsers: (state, action) => {
      const { channelId, users } = action.payload
      state.typingUsers[channelId] = users
    },
    setChatLoading: (state, action) => {
      state.loading = action.payload
    },
  },
})

export const { setChannels, setActiveChannel, setActiveConversationId, setMessages, addMessage, setTypingUsers, setChatLoading } = chatSlice.actions
export default chatSlice.reducer
