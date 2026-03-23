import { useSelector } from 'react-redux'

export function useAuth() {
  const { user, profile, role, session, loading, error } = useSelector(state => state.auth)
  return { user, profile, role, session, loading, error, isAdmin: role === 'admin', isEmployee: role === 'employee' }
}

export default useAuth
