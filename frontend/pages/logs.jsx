import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Filter, Calendar, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const fetchLogs = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data } = await api.get('/logs');
      setLogs(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    return logs.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (dateFilter === 'today') return new Date(l.timestamp) >= today;
      if (dateFilter === 'yesterday') {
        const d = new Date(l.timestamp);
        return d >= yesterday && d < today;
      }
      return true;
    });
  }, [logs, statusFilter, dateFilter]);

  const sentCount   = logs.filter(l => l.status === 'sent').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;

  const fmt = (ts) => new Date(ts).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-white mb-1">Email Logs</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Full history of every email sent</p>
        </div>
        <button
          className="btn-secondary-dark d-flex align-items-center gap-2 px-4 py-2"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          style={{ fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin text-gold' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters + Counts */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div className="d-flex gap-3">
          <div className="input-icon-wrap" style={{ width: 180 }}>
            <div className="icon-slot"><Filter size={13} className="text-gold" /></div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '9px 8px 9px 0', cursor: 'pointer' }}
            >
              <option value="all">All Status</option>
              <option value="sent">Sent Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>

          <div className="input-icon-wrap" style={{ width: 180 }}>
            <div className="icon-slot"><Calendar size={13} className="text-gold" /></div>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '9px 8px 9px 0', cursor: 'pointer' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </select>
          </div>
        </div>

        <div className="d-flex gap-4">
          <div className="d-flex align-items-center gap-2">
            <CheckCircle size={15} className="text-gold" />
            <span className="fw-bold text-gold">{sentCount}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>sent</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <XCircle size={15} style={{ color: '#ef4444' }} />
            <span className="fw-bold" style={{ color: '#ef4444' }}>{failedCount}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>failed</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 d-flex flex-column gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 40 }} />)}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th className="ps-4">Email</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>No logs match your filters.</td></tr>
                ) : filtered.map(l => (
                  <tr key={l.id}>
                    <td className="text-white fw-semibold ps-4">{l.user_email}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.email_templates?.title || '—'}</td>
                    <td>
                      <span className={l.status === 'sent' ? 'badge-sent' : 'badge-failed'}>
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmt(l.timestamp)}</td>
                    <td style={{ color: '#ef4444', fontSize: '0.78rem', maxWidth: 200 }}>
                      <span className="d-block text-truncate">{l.error_message || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
