import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  notifications: [],
  unreadCount: 0,
  isPanelOpen: false,
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload)
      state.unreadCount += 1
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload
      state.unreadCount = action.payload.filter(n => !n.read).length
    },
    markAllRead: (state) => {
      state.notifications = state.notifications.map(n => ({ ...n, read: true }))
      state.unreadCount = 0
    },
    markRead: (state, action) => {
      const n = state.notifications.find(n => n.id === action.payload)
      if (n && !n.read) {
        n.read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    removeNotification: (state, action) => {
      const n = state.notifications.find(n => n.id === action.payload)
      if (n) {
        state.notifications = state.notifications.filter(n => n.id !== action.payload)
        if (!n.read) state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    togglePanel: (state) => {
      state.isPanelOpen = !state.isPanelOpen
    },
    closePanel: (state) => {
      state.isPanelOpen = false
    },
    clearNotifications: (state) => {
      state.notifications = []
      state.unreadCount = 0
    },
  },
})

export const { addNotification, setNotifications, markAllRead, markRead, removeNotification, togglePanel, closePanel, clearNotifications } = notificationsSlice.actions
export default notificationsSlice.reducer
