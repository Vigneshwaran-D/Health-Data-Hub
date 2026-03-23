import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, FileText, Inbox,
  LogOut, Upload, Zap,
  ArrowLeftRight, Bot, Workflow
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Client Leadership', 'Operations Leadership', 'Operations Manager', 'Team Lead', 'AR Executive', 'QA Auditor'] },
  { to: '/workflows', icon: Workflow, label: 'Workflow Modules', roles: ['Client Leadership', 'Operations Leadership', 'Operations Manager', 'Team Lead', 'AR Executive'] },
  { to: '/claims', icon: FileText, label: 'Claim Inventory', roles: ['Operations Manager', 'Team Lead', 'AR Executive', 'QA Auditor'] },
  { to: '/queues', icon: Inbox, label: 'Work Queues', roles: ['Operations Manager', 'Team Lead', 'AR Executive'] },
  { to: '/edi', icon: ArrowLeftRight, label: 'EDI Hub', roles: ['Operations Manager', 'AR Executive'] },
  { to: '/rpa', icon: Bot, label: 'RPA Bots', roles: ['Operations Manager', 'AR Executive'] },
  { to: '/upload', icon: Upload, label: 'Data Ingestion', roles: ['Team Lead'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">NovaArc Health</div>
            <div className="text-[10px] text-blue-300/70">AI-Powered RCM Platform</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Logged in as</div>
          <div className="font-semibold text-sm truncate">{user?.full_name}</div>
          <span className="inline-block mt-1 text-[10px] bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-2 py-0.5 rounded-full">{user?.role}</span>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
