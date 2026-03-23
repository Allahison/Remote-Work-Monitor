import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  tasks: [],
  loading: false,
  error: null,
  filter: {
    status: 'all',
    priority: 'all',
    assignee: 'all',
    search: '',
  },
}

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action) => {
      state.tasks = action.payload
      state.loading = false
    },
    addTask: (state, action) => {
      state.tasks.unshift(action.payload)
    },
    updateTask: (state, action) => {
      const idx = state.tasks.findIndex(t => t.id === action.payload.id)
      if (idx !== -1) state.tasks[idx] = action.payload
    },
    deleteTask: (state, action) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload)
    },
    setTasksLoading: (state, action) => {
      state.loading = action.payload
    },
    setTasksError: (state, action) => {
      state.error = action.payload
      state.loading = false
    },
    setFilter: (state, action) => {
      state.filter = { ...state.filter, ...action.payload }
    },
    clearFilter: (state) => {
      state.filter = initialState.filter
    },
  },
})

export const { setTasks, addTask, updateTask, deleteTask, setTasksLoading, setTasksError, setFilter, clearFilter } = tasksSlice.actions
export default tasksSlice.reducer
