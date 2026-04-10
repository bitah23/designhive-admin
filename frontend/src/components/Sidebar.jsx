import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Send,
  FileText,
  ScrollText,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/send-email',  label: 'Send Email',   icon: Send },
  { to: '/templates',   label: 'Templates',    icon: FileText },
  { to: '/logs',        label: 'Email Logs',   icon: ScrollText },
]

export default function Sidebar() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">DesignHive</h1>
            <p className="text-slate-500 text-xs">Email Automation</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-600 text-xs font-medium uppercase tracking-wider px-2 mb-3">Menu</p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Admin info + logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {admin?.email?.[0]?.toUpperCase() ?? 'A'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{admin?.email ?? 'Admin'}</p>
            <p className="text-slate-500 text-xs">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors duration-150"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
