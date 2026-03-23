import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Camera, Sun, Moon, Palette, Save, Upload, Check, Monitor
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { setProfile } from '../store/slices/authSlice'
import { setTheme, THEMES } from '../store/slices/uiSlice'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'

// --- Mini theme preview swatch ---
function ThemeCard({ themeData, isActive, onSelect }) {
  const [c1, c2, c3] = themeData.colors
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(themeData.id)}
      style={{
        position: 'relative', borderRadius: 16, padding: 0, overflow: 'hidden',
        border: isActive ? `2px solid ${c2}` : '2px solid transparent',
        boxShadow: isActive ? `0 0 18px ${c2}55, 0 4px 20px rgba(0,0,0,0.3)` : '0 2px 12px rgba(0,0,0,0.18)',
        cursor: 'pointer', background: 'none', transition: 'all 0.25s ease', width: '100%',
      }}
      title={themeData.label}
    >
      <div style={{ background: c1, padding: '10px 10px 8px', borderRadius: 14 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 7, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', opacity: 0.8 }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', opacity: 0.8 }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', opacity: 0.8 }} />
          <div style={{ flex: 1, height: 4, borderRadius: 4, background: `${c2}30`, marginLeft: 4 }} />
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <div style={{ width: 20, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 5, borderRadius: 3, background: i === 1 ? c2 : `${c2}30` }} />)}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 5, borderRadius: 3, background: `${c2}20`, width: '80%' }} />
            <div style={{ height: 22, borderRadius: 6, background: `${c2}15`, marginTop: 2 }} />
            <div style={{ display: 'flex', gap: 3 }}>
              <div style={{ flex: 1, height: 12, borderRadius: 4, background: `${c2}18` }} />
              <div style={{ flex: 1, height: 12, borderRadius: 4, background: `${c3}18` }} />
            </div>
            <div style={{ height: 5, borderRadius: 3, background: `linear-gradient(90deg, ${c2}, ${c3})`, marginTop: 2 }} />
          </div>
        </div>
      </div>
      <div style={{ padding: '6px 10px 8px', background: `${c1}fe`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}>{themeData.emoji}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: c2 }}>{themeData.label}</span>
        </div>
        {isActive && (
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: c2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check style={{ width: 9, height: 9, color: '#fff' }} />
          </div>
        )}
      </div>
      {isActive && <div style={{ position: 'absolute', inset: 0, borderRadius: 14, border: `1.5px solid ${c2}`, pointerEvents: 'none' }} />}
    </motion.button>
  )
}

// --- Main Settings Page ---
export default function SettingsPage() {
  const dispatch = useDispatch()
  const { profile, user } = useAuth()
  const { theme } = useSelector(state => state.ui)

  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  
  // Profile state
  const [formData, setFormData] = useState({ full_name: profile?.full_name || '' })
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [pendingFile, setPendingFile] = useState(null)
  const fileInputRef = useRef(null)

  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0]

  const handleDisplayPictureSelect = (e) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setPendingFile(file)
    setAvatarUrl(URL.createObjectURL(file))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!formData.full_name.trim()) return
    setLoading(true)
    const toastId = toast.loading('Saving profile changes...')
    try {
      let finalAvatarUrl = profile?.avatar_url || null
      if (pendingFile) {
        toast.loading('Uploading display picture...', { id: toastId })
        const fileExt = pendingFile.name.split('.').pop()
        const filePath = `${user.id}/${uuidv4()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, pendingFile)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        finalAvatarUrl = data.publicUrl
      }
      const { error } = await supabase.from('profiles').update({ full_name: formData.full_name, avatar_url: finalAvatarUrl }).eq('id', user.id)
      if (error) throw error
      dispatch(setProfile({ ...profile, full_name: formData.full_name, avatar_url: finalAvatarUrl }))
      setPendingFile(null)
      toast.success('Successfully saved!', { id: toastId })
    } catch (error) {
      toast.error('Error saving profile: ' + error.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const handleGenericSave = (e) => {
    e.preventDefault()
    toast.success('Settings updated successfully!')
  }

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your personal and application preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium text-left
                  ${isActive 
                    ? 'bg-[var(--brand)] text-white shadow-lg shadow-[rgba(108,99,255,0.25)]' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] border border-transparent'
                  }
                `}
                style={isActive ? { background: `linear-gradient(135deg, ${activeTheme.colors[1]}, ${activeTheme.colors[2]})` } : {}}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 md:p-8"
            >
              
              {/* === PROFILE TAB === */}
              {activeTab === 'profile' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="flex items-center gap-2 mb-6">
                    <User className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Profile Details</h2>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-2xl overflow-hidden flex items-center justify-center border-2 shadow-lg" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white shadow-inner" style={{ background: `linear-gradient(135deg, ${activeTheme.colors[1]}, ${activeTheme.colors[2]})` }}>
                            {profile?.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 shadow-xl disabled:opacity-50"
                        style={{ background: 'var(--brand)' }}
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleDisplayPictureSelect} accept="image/*" className="hidden" />
                    </div>

                    <div className="flex-1 w-full flex flex-col justify-center">
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Profile Picture</h3>
                      <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Upload a PNG or JPG (max 2MB).<br/>Click "Save Changes" to apply.</p>
                      <button type="button" disabled={loading} onClick={() => fileInputRef.current?.click()} className="btn-secondary self-start text-xs py-2 px-4 flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Upload Image
                      </button>
                    </div>
                  </div>

                  <hr style={{ borderColor: 'var(--border)' }} className="my-6" />

                  <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                        <input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input-glass" placeholder="Your full name" required />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email Address (Read-Only)</label>
                        <input type="email" value={profile?.email || ''} readOnly disabled className="input-glass opacity-50 cursor-not-allowed" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Account Role</label>
                      <span className={`badge uppercase tracking-wider px-3 py-1 ${profile?.role === 'admin' ? 'badge-purple' : 'badge-brand'}`}>{profile?.role}</span>
                    </div>
                    <button type="submit" disabled={loading || (!pendingFile && formData.full_name === profile?.full_name)} className="btn-primary flex items-center gap-2 self-start mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Save className="w-4 h-4" /> Save Profile
                    </button>
                  </form>
                </div>
              )}

              {/* === APPEARANCE TAB === */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
                    <div className="ml-auto text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5" style={{ background: `${activeTheme.colors[1]}22`, color: activeTheme.colors[1], border: `1px solid ${activeTheme.colors[1]}44` }}>
                      <span>{activeTheme.emoji}</span><span>{activeTheme.label}</span>
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose a theme that matches your vibe. The entire app will update instantly.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 24 }}>
                    {THEMES.map(t => (
                      <ThemeCard key={t.id} themeData={t} isActive={theme === t.id} onSelect={(id) => dispatch(setTheme(id))} />
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 32, paddingTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <p className="text-sm font-medium mr-2" style={{ color: 'var(--text-secondary)' }}>Light & Dark Base:</p>
                    {[
                      { id: 'light', icon: Sun, label: 'Light', color: '#f59e0b' },
                      { id: 'dark',  icon: Moon, label: 'Dark',  color: '#6c63ff' },
                    ].map(({ id, icon: Icon, label, color }) => (
                      <button key={id} onClick={() => dispatch(setTheme(id))} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: theme === id ? `${color}20` : 'var(--surface)', border: `1.5px solid ${theme === id ? color : 'var(--border)'}`, color: theme === id ? color : 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}>
                        <Icon style={{ width: 16, height: 16 }} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
