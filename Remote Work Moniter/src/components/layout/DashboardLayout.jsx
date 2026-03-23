import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useNotifications } from '../../hooks/useNotifications'
import CallSystem from '../chat/CallSystem'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  useNotifications()

  return (
    <div className="flex h-screen overflow-hidden page-bg">
      <CallSystem />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuToggle={() => setCollapsed(c => !c)} />

        <main className="flex-1 overflow-y-auto page-content">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
