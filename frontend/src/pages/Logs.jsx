import { useEffect, useState, useCallback } from 'react'
import { ScrollText, Search, CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

function StatusBadge({ status }) {
  return status === 'sent'
    ? <span className="badge-sent"><CheckCircle className="w-3 h-3" />Sent</span>
    : <span className="badge-failed"><XCircle className="w-3 h-3" />Failed</span>
}

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Logs() {
  const [logs, setLogs]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [page, setPage]         = useState(0)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(status && { status }),
        ...(search && { search }),
      })
      const { data } = await api.get(`/api/logs/?${params}`)
      setLogs(data.data)
      setTotal(data.count)
    } catch {
      toast.error('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => {
    const t = setTimeout(fetchLogs, 300)
    return () => clearTimeout(t)
  }, [fetchLogs])

  // Reset page on filter change
  useEffect(() => { setPage(0) }, [search, status])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email Logs</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} log entries</p>
        </div>
        <button
          onClick={fetchLogs}
          className="btn-secondary"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto min-w-36"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Template</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No logs found</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {search || status ? 'Try adjusting your filters.' : 'Send your first email to see logs here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-900">{log.user_email}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {log.email_templates?.title ?? <span className="text-slate-300 italic">deleted</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-5 py-3.5">
                      {log.error_message ? (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded max-w-xs truncate block" title={log.error_message}>
                          {log.error_message}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-secondary py-1.5 px-2.5 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
