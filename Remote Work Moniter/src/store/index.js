import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import tasksReducer from './slices/tasksSlice'
import chatReducer from './slices/chatSlice'
import sessionReducer from './slices/sessionSlice'
import notificationsReducer from './slices/notificationsSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
    chat: chatReducer,
    session: sessionReducer,
    notifications: notificationsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setSession'],
        ignoredPaths: ['auth.session'],
      },
    }),
})

export default store
