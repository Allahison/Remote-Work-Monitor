import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isActive: false,
  sessionId: null,
  startTime: null,
  elapsedSeconds: 0,
  isIdle: false,
  idleSeconds: 0,
  isSharing: false, // screen sharing
  todayActiveSeconds: 0,
  todayIdleSeconds: 0,
}

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    startSession: (state, action) => {
      state.isActive = true
      state.sessionId = action.payload.sessionId
      state.startTime = action.payload.startTime
      state.elapsedSeconds = 0
      state.isIdle = false
    },
    stopSession: (state) => {
      state.isActive = false
      state.sessionId = null
      state.startTime = null
      state.isIdle = false
      state.isSharing = false
    },
    tickSecond: (state) => {
      if (state.isActive) {
        state.elapsedSeconds += 1
        if (!state.isIdle) {
          state.todayActiveSeconds += 1
        } else {
          state.todayIdleSeconds += 1
        }
      }
    },
    setIdle: (state, action) => {
      state.isIdle = action.payload
      if (action.payload) {
        state.idleSeconds = 0
      }
    },
    setSharing: (state, action) => {
      state.isSharing = action.payload
    },
    resetToday: (state) => {
      state.todayActiveSeconds = 0
      state.todayIdleSeconds = 0
    },
  },
})

export const { startSession, stopSession, tickSecond, setIdle, setSharing, resetToday } = sessionSlice.actions
export default sessionSlice.reducer
