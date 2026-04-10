import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Send, AlertCircle, FileText, ArrowRight, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react'
import api from '../services/api'
import StatsCard from '../components/StatsCard'

function StatusBadge({ status }) {
  return status === 'sent'
    ? <span className="badge-sent"><CheckCircle className="w-3 h-3" />Sent</span>
    : <span className="badge-failed"><XCircle className="w-3 h-3" />Failed</span>
}

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [logs, setLogs]       = useState([])
  const [gmail, setGmail]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, logsRes, gmailRes] = await Promise.all([
          api.get('/api/email/stats'),
          api.get('/api/logs/recent?limit=8'),
          api.get('/api/email/gmail-status'),
        ])
        setStats(statsRes.data)
        setLogs(logsRes.data)
        setGmail(gmailRes.data)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Overview of your email automation</p>
        </div>

        {/* Gmail status indicator */}
        {gmail && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            gmail.connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            {gmail.connected
              ? <><Wifi className="w-3 h-3" />Gmail: {gmail.gmail_address}</>
              : <><WifiOff className="w-3 h-3" />Gmail: Not connected</>
            }
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Total Users"    value={stats?.total_users}         icon={Users}       color="blue"   />
        <StatsCard label="Emails Sent"    value={stats?.total_emails_sent}   icon={Send}        color="green"  />
        <StatsCard label="Failed Sends"   value={stats?.total_failed}        icon={AlertCircle} color="red"    />
        <StatsCard label="Templates"      value={stats?.total_templates}     icon={FileText}    color="purple" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            to: '/send-email',
            title: 'Send Campaign',
            desc: 'Broadcast an email to all or specific users',
            color: 'from-brand-600 to-brand-700',
          },
          {
            to: '/templates',
            title: 'Manage Templates',
            desc: 'Create, edit and delete email templates',
            color: 'from-purple-600 to-purple-700',
          },
          {
            to: '/logs',
            title: 'View All Logs',
            desc: 'Track delivery status of every email sent',
            color: 'from-slate-700 to-slate-800',
          },
        ].map(({ to, title, desc, color }) => (
          <Link
            key={to}
            to={to}
            className={`bg-gradient-to-br ${color} rounded-xl p-5 text-white group hover:shadow-lg transition-shadow`}
          >
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-white/70 text-sm mt-1">{desc}</p>
            <ArrowRight className="w-4 h-4 mt-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          <Link to="/logs" className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No emails sent yet.</p>
            <Link to="/send-email" className="text-brand-600 text-sm font-medium hover:underline mt-1 inline-block">
              Send your first email
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <StatusBadge status={log.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{log.user_email}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {log.email_templates?.title ?? 'No template'}
                  </p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(log.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
