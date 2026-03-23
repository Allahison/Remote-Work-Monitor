import { createSlice } from '@reduxjs/toolkit'

// Themes: each maps to a CSS class on <html>
export const THEMES = [
  { id: 'dark',           label: 'Dark',            emoji: '🌑', dark: true,  colors: ['#0f0f1a', '#6c63ff', '#00d4ff'] },
  { id: 'light',          label: 'Light',           emoji: '☀️', dark: false, colors: ['#f4f7fc', '#6c63ff', '#0ea5e9'] },
  { id: 'midnight',       label: 'Midnight Ocean',  emoji: '🌊', dark: true,  colors: ['#0a1628', '#0ea5e9', '#38bdf8'] },
  { id: 'aurora',         label: 'Aurora',          emoji: '🌌', dark: true,  colors: ['#0d0d1f', '#a855f7', '#ec4899'] },
  { id: 'sunset',         label: 'Sunset',          emoji: '🌅', dark: false, colors: ['#fff7ed', '#f97316', '#ef4444'] },
  { id: 'forest',         label: 'Forest',          emoji: '🌿', dark: true,  colors: ['#0a1a0f', '#22c55e', '#86efac'] },
  { id: 'rose',           label: 'Rose Gold',       emoji: '🌸', dark: false, colors: ['#fff1f2', '#f43f5e', '#fb7185'] },
  { id: 'cyberpunk',      label: 'Cyberpunk',       emoji: '⚡', dark: true,  colors: ['#0a0a0f', '#facc15', '#a855f7'] },
]

const getInitialTheme = () => {
  const stored = localStorage.getItem('theme')
  if (stored && THEMES.find(t => t.id === stored)) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const initialState = {
  theme: getInitialTheme(),
  sidebarOpen: true,
  sidebarCollapsed: false,
}

// Computed helpers
export const isDarkTheme = (themeId) => {
  const t = THEMES.find(t => t.id === themeId)
  return t ? t.dark : true
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload
      localStorage.setItem('theme', action.payload)
    },
    // Legacy compat — maps to dark/light
    toggleDarkMode: (state) => {
      const newTheme = isDarkTheme(state.theme) ? 'light' : 'dark'
      state.theme = newTheme
      localStorage.setItem('theme', newTheme)
    },
    setDarkMode: (state, action) => {
      const newTheme = action.payload ? 'dark' : 'light'
      state.theme = newTheme
      localStorage.setItem('theme', newTheme)
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
  },
})

export const { setTheme, toggleDarkMode, setDarkMode, toggleSidebar, setSidebarOpen, toggleSidebarCollapse } = uiSlice.actions
export default uiSlice.reducer
