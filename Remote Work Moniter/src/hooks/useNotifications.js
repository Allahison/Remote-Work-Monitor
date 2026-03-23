import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { supabase } from '../lib/supabaseClient'
import { setNotifications, addNotification, markRead, removeNotification, markAllRead as markAllReadAction } from '../store/slices/notificationsSlice'
import toast from 'react-hot-toast'

export function useNotifications() {
  const dispatch = useDispatch()
  const { user } = useSelector(state => state.auth)

  useEffect(() => {
    if (!user) return

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data && !error) {
        dispatch(setNotifications(data))
      }
    }

    fetchNotifications()

    // Subscribe to real-time changes
    const channel = supabase.channel('user_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          dispatch(addNotification(payload.new))
          // Don't show toast for chat messages since the chat page already handles them visually, 
          // but for other alerts (tasks, status) show a pop-up
          if (payload.new.type !== 'chat') {
            toast(payload.new.title)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (payload.new.user_id === user.id && payload.new.read) {
            dispatch(markRead(payload.new.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // Note: In DELETE, payload.new is null. Payload.old contains the deleted record info.
          dispatch(removeNotification(payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, dispatch])

  const markAllAsRead = async () => {
    if (!user) return
    
    // Update local store immediately for instant feedback
    dispatch(markAllReadAction())

    // Update DB
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  const markAsRead = async (id) => {
    try {
      dispatch(markRead(id))
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
      
      if (error) throw error
    } catch (err) {
      console.error("Mark read error:", err)
    }
  }

  const deleteNotification = async (id) => {
    try {
      dispatch(removeNotification(id))
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      toast.success('Notification removed')
    } catch (err) {
      console.error("Delete error:", err)
      toast.error('Failed to delete notification. Check RLS policies.')
    }
  }

  const deleteAllNotifications = async () => {
    if (!user) return
    try {
      dispatch(markAllReadAction()) // Optimistically clear unread count
      const { error } = await supabase.from('notifications').delete().eq('user_id', user.id)
      if (error) throw error
      dispatch(setNotifications([]))
      toast.success('All notifications deleted')
    } catch (err) {
      console.error("Delete all error:", err)
      toast.error('Failed to clear notifications')
    }
  }

  return { markAllAsRead, markAsRead, deleteNotification, deleteAllNotifications }
}
