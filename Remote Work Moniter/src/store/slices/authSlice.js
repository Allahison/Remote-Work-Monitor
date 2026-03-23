import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  profile: null,
  role: null, // 'admin' | 'employee'
  session: null,
  loading: true,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action) => {
      state.session = action.payload
    },
    setUser: (state, action) => {
      state.user = action.payload
    },
    setProfile: (state, action) => {
      state.profile = action.payload
      state.role = action.payload?.role || null
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
      state.loading = false
    },
    clearAuth: (state) => {
      state.user = null
      state.profile = null
      state.role = null
      state.session = null
      state.loading = false
      state.error = null
    },
  },
})

export const { setSession, setUser, setProfile, setLoading, setError, clearAuth } = authSlice.actions
export default authSlice.reducer
