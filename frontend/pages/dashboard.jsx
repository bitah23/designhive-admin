import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Mail, FileText, Send, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/templates'), api.get('/logs'), api.get('/users')])
      .then(([tRes, lRes, uRes]) => {
        const logs = lRes.data;
        setStats({
          sent:      logs.filter(l => l.status === 'sent').length,
          failed:    logs.filter(l => l.status === 'failed').length,
          templates: tRes.data.length,
          users:     uRes.data.length,
          campaigns: tRes.data,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const CARDS = stats ? [
    { label: 'Emails Sent',    value: stats.sent,      icon: <Mail size={18} />,     color: 'var(--gold)' },
    { label: 'Templates',      value: stats.templates, icon: <FileText size={18} />, color: '#60a5fa' },
    { label: 'Total Users',    value: stats.users,     icon: <Send size={18} />,     color: '#a78bfa' },
    { label: 'Failed Emails',  value: stats.failed,    icon: <AlertCircle size={18} />, color: '#f87171' },
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-white mb-1">Overview</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Email campaign summary</p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2 px-4"
          style={{ borderRadius: '10px' }}
          onClick={() => router.push('/campaign')}
        >
          <Send size={16} /> Send Campaign
        </button>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {loading
          ? [1,2,3,4].map(i => <div key={i} className="col-6 col-lg-3"><div className="skeleton" style={{ height: 100 }} /></div>)
          : CARDS.map(card => (
            <div key={card.label} className="col-6 col-lg-3">
              <div className="glass-card p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ color: card.color }}>{card.icon}</span>
                  <span className="label-upper">{card.label}</span>
                </div>
                <p className="fw-bold text-white mb-0" style={{ fontSize: '1.8rem', lineHeight: 1 }}>
                  {card.value.toLocaleString()}
                </p>
              </div>
            </div>
          ))
        }
      </div>

      {/* Campaigns Table */}
      <div className="glass-card p-4">
        <h6 className="fw-semibold text-white mb-4">All Templates / Campaigns</h6>
        {loading ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : stats.campaigns.length === 0 ? (
          <p className="text-center py-4 mb-0" style={{ color: 'var(--text-muted)' }}>No templates yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.campaigns.map(c => (
                  <tr key={c.id}>
                    <td className="fw-semibold text-white">{c.title}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.subject}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(c.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
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
