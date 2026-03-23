import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Monitor, Mail, Lock, User, Shield, Briefcase } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { setProfile } from '../store/slices/authSlice'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSignup = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)

    // Check invitation for employees
    if (form.role === 'employee') {
      const { data: invitation, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', form.email.toLowerCase())
        .single()
      
      if (invError || !invitation) {
        toast.error('This email is not pre-authorized. Please contact your administrator.')
        setLoading(false)
        return
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name, role: form.role },
      },
    })
    
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Create profile
    if (data.user) {
      const profileData = {
        id: data.user.id,
        full_name: form.name,
        email: form.email.toLowerCase(),
        role: form.role,
        status: 'offline',
        avatar_url: null,
      }

      const { error: profError } = await supabase.from('profiles').insert(profileData)
      
      if (!profError) {
        dispatch(setProfile(profileData))
        if (form.role === 'employee') {
          try {
            await supabase.from('invitations').delete().eq('email', form.email.toLowerCase())
          } catch (delError) {
            console.error('Error deleting invitation:', delError)
          }
        }
      }
    }
    
    toast.success('Account created! Redirecting...')
    navigate('/dashboard')
    setLoading(false)
  }

  const RoleCard = ({ value, icon: Icon, title, desc }) => (
    <button
      type="button"
      onClick={() => setForm(prev => ({ ...prev, role: value }))}
      className={`flex-1 p-4 rounded-xl border text-left transition-all duration-200 ${
        form.role === value
          ? 'border-brand-500 bg-brand-500/10'
          : 'border-[var(--border)] hover:border-[var(--border-hover)]'
      }`}
    >
      <Icon className={`w-5 h-5 mb-2 ${form.role === value ? 'text-brand-400' : 'text-[var(--text-muted)]'}`} />
      <p className={`text-sm font-semibold ${form.role === value ? 'text-brand-300' : 'text-[var(--text-primary)]'}`}>{title}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      {value === 'employee' && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-brand-400 opacity-80">
          <Shield className="w-2.5 h-2.5" />
          Pre-approval required
        </div>
      )}
    </button>
  )

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="page-content w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 glow-brand"
            style={{ background: 'linear-gradient(135deg, #6c63ff, #00d4ff)' }}>
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">RemoteMonitor</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create your account</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8"
        >
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Get Started</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Join your team's workspace</p>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            {/* Role picker */}
            <div className="flex gap-3">
              <RoleCard value="admin" icon={Shield} title="Admin" desc="Manage team & monitor" />
              <RoleCard value="employee" icon={Briefcase} title="Employee" desc="Work & collaborate" />
            </div>

            {/* Name */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                name="name"
                className="input-glass pl-10"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="email"
                name="email"
                className="input-glass pl-10"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="input-glass pl-10 pr-10"
                placeholder="Password (min 8 chars)"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--brand-light)' }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
